import { z } from 'zod'
import { compareAppVersions } from '../../../src/shared/app-version'
import {
  isNewerReleaseVersion,
  type AppUpdateCheckResult,
  type AppUpdateSource
} from './app-update-source'

/**
 * DECK-R47: the update check reads only the fork's own releases. Upstream's source asks
 * `stablyai/orca` for `mobile-android-v*`; this one asks `Theodagan/orcapad` for the fork's tag
 * prefix, so Orca's screens and the deck's never offer someone else's APK.
 *
 * Orca's `AppUpdateSource` answers with a version and a page URL. The deck also needs the APK
 * itself, its size and its digest, so this source exposes the richer answer beside the interface
 * rather than changing upstream's type.
 */
export const FORK_REPO = 'Theodagan/orcapad'
export const FORK_TAG_PREFIX = 'orcapad-android-v'
// Probe a bounded number of older tags: the release workflow tags before it builds the APK.
const MAX_RELEASE_PROBES = 3

type Fetch = typeof fetch

export type DeckReleaseAsset = {
  readonly version: string
  readonly apkUrl: string
  readonly sizeBytes: number
  /** `sha256:…` as GitHub reports it; absent on releases published before it did. */
  readonly digest: string | null
}

export type DeckReleaseCheck =
  | { readonly kind: 'available'; readonly release: DeckReleaseAsset }
  | { readonly kind: 'current' }

const tagRefsSchema = z.array(z.looseObject({ ref: z.string() }))
const releaseSchema = z.looseObject({
  draft: z.literal(false),
  assets: z.array(
    z.looseObject({
      name: z.string(),
      browser_download_url: z.string(),
      size: z.number(),
      digest: z.string().nullish()
    })
  )
})

/** Versions named by the tag refs GitHub returns for the fork's prefix. */
export function parseForkTagVersions(refs: unknown): string[] {
  const prefix = `refs/tags/${FORK_TAG_PREFIX}`
  return tagRefsSchema
    .parse(refs)
    .filter(({ ref }) => ref.startsWith(prefix))
    .map(({ ref }) => ref.slice(prefix.length))
}

/** The APK a release carries, or null when it has none (a tag without a published build). */
export function installableRelease(release: unknown, version: string): DeckReleaseAsset | null {
  const parsed = releaseSchema.safeParse(release)
  if (!parsed.success) {
    return null
  }
  const apk = parsed.data.assets.find((asset) => asset.name.endsWith('.apk'))
  if (apk === undefined) {
    return null
  }
  return {
    version,
    apkUrl: apk.browser_download_url,
    sizeBytes: apk.size,
    digest: apk.digest ?? null
  }
}

export type ForkReleaseUpdateSource = AppUpdateSource & {
  /** The same check, with the APK's URL, size and digest for the in-app installer. */
  checkRelease(installedVersion: string, signal: AbortSignal): Promise<DeckReleaseCheck>
}

export function createForkReleaseUpdateSource(fetchImpl: Fetch): ForkReleaseUpdateSource {
  const api = `https://api.github.com/repos/${FORK_REPO}`

  async function checkRelease(
    installedVersion: string,
    signal: AbortSignal
  ): Promise<DeckReleaseCheck> {
    const refsReply = await fetchImpl(`${api}/git/matching-refs/tags/${FORK_TAG_PREFIX}`, {
      signal
    })
    if (!refsReply.ok) {
      // Rate limiting and outages are surfaced, never turned into "you are up to date" (DECK-R39).
      throw new Error(`tag refs HTTP ${refsReply.status}`)
    }
    const candidates = parseForkTagVersions(await refsReply.json())
      .filter((version) => isNewerReleaseVersion(version, installedVersion))
      .sort((left, right) => compareAppVersions(right, left))
      .slice(0, MAX_RELEASE_PROBES)
    for (const version of candidates) {
      const releaseReply = await fetchImpl(
        `${api}/releases/tags/${encodeURIComponent(`${FORK_TAG_PREFIX}${version}`)}`,
        { signal }
      )
      if (releaseReply.status === 404) {
        continue
      }
      if (!releaseReply.ok) {
        throw new Error(`release HTTP ${releaseReply.status}`)
      }
      const release = installableRelease(await releaseReply.json(), version)
      if (release !== null) {
        return { kind: 'available', release }
      }
    }
    return { kind: 'current' }
  }

  return {
    async check(installedVersion, signal): Promise<AppUpdateCheckResult> {
      const result = await checkRelease(installedVersion, signal)
      return result.kind === 'available'
        ? { kind: 'available', version: result.release.version, url: result.release.apkUrl }
        : { kind: 'current' }
    },
    checkRelease
  }
}

export const forkReleaseUpdateSource = createForkReleaseUpdateSource((input, init) =>
  fetch(input, init)
)
