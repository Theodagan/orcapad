import type { DeckReleaseAsset } from '../../app-update/fork-release-update-source'

/**
 * D6: the APK is downloaded with `expo-file-system` and checked against the release before it is
 * ever handed to the installer. A truncated download or a swapped file is deleted, not installed.
 *
 * The platform calls arrive through `DownloadDeps` so the flow — progress, size, digest, cancel —
 * is testable without a device.
 */
export type DownloadDeps = {
  readonly cacheDirectory: string
  createDownload(
    url: string,
    destination: string,
    onProgress: (receivedBytes: number, totalBytes: number) => void
  ): {
    /** `null` when the platform reports the download was paused before it finished. */
    downloadAsync(): Promise<{ uri: string; size: number } | null>
    pauseAsync?(): Promise<unknown>
  }
  /** Lower-case hex sha256 of the file at `uri`. */
  digestSha256(uri: string): Promise<string>
  deleteFile(uri: string): Promise<void>
}

export type DownloadProgress = {
  readonly receivedBytes: number
  readonly totalBytes: number
}

export type DownloadError =
  | { readonly kind: 'cancelled' }
  | { readonly kind: 'size'; readonly expected: number; readonly received: number }
  | { readonly kind: 'digest'; readonly expected: string; readonly received: string }
  | { readonly kind: 'unverifiable'; readonly reason: string }
  /** The transport's own failure: the platform's words, never a guess at their meaning. */
  | { readonly kind: 'failed'; readonly reason: string }

export class UpdateDownloadError extends Error {
  readonly detail: DownloadError

  constructor(detail: DownloadError) {
    super(`update download failed: ${detail.kind}`)
    this.detail = detail
  }
}

/** The digest a release publishes, as lower-case hex, or `null` when it publishes none. */
export function hexDigest(digest: string | null): string | null {
  if (digest === null) {
    return null
  }
  // GitHub reports `sha256:<hex>`; a release published before digests existed reports nothing.
  const [algorithm, value] = digest.split(':')
  return algorithm === 'sha256' && value !== undefined ? value.toLowerCase() : null
}

/** Downloads, verifies and answers the local file URI. Throws `UpdateDownloadError` on any failure. */
export async function downloadUpdate(args: {
  readonly release: DeckReleaseAsset
  readonly deps: DownloadDeps
  readonly signal: AbortSignal
  readonly onProgress?: (progress: DownloadProgress) => void
}): Promise<{ readonly uri: string }> {
  const { release, deps, signal, onProgress } = args
  const destination = `${deps.cacheDirectory}${FORK_UPDATE_FILE}${release.version}.apk`
  const download = deps.createDownload(release.apkUrl, destination, (receivedBytes, totalBytes) => {
    onProgress?.({ receivedBytes, totalBytes })
  })

  const cancel = (): void => {
    void download.pauseAsync?.()
  }
  signal.addEventListener('abort', cancel, { once: true })
  try {
    if (signal.aborted) {
      throw new UpdateDownloadError({ kind: 'cancelled' })
    }
    let downloaded: { uri: string; size: number } | null
    try {
      downloaded = await download.downloadAsync()
    } catch (error: unknown) {
      if (error instanceof UpdateDownloadError) {
        throw error
      }
      throw new UpdateDownloadError({
        kind: 'failed',
        reason:
          error instanceof Error && error.message !== '' ? error.message : 'the download failed'
      })
    }
    if (downloaded === null || signal.aborted) {
      if (downloaded !== null) {
        await discard(deps, downloaded.uri)
      }
      throw new UpdateDownloadError({ kind: 'cancelled' })
    }
    if (downloaded.size !== release.sizeBytes) {
      await discard(deps, downloaded.uri)
      throw new UpdateDownloadError({
        kind: 'size',
        expected: release.sizeBytes,
        received: downloaded.size
      })
    }
    const expected = hexDigest(release.digest)
    if (expected === null) {
      // Without a published digest the size is all there is; say so rather than pretend to verify.
      throw new UpdateDownloadError({
        kind: 'unverifiable',
        reason: 'the release publishes no sha256 digest'
      })
    }
    let received: string
    try {
      received = (await deps.digestSha256(downloaded.uri)).toLowerCase()
    } catch (error: unknown) {
      await discard(deps, downloaded.uri)
      throw new UpdateDownloadError({
        kind: 'failed',
        reason:
          error instanceof Error && error.message !== ''
            ? error.message
            : 'the file could not be read'
      })
    }
    if (received !== expected) {
      await discard(deps, downloaded.uri)
      throw new UpdateDownloadError({ kind: 'digest', expected, received })
    }
    return { uri: downloaded.uri }
  } finally {
    signal.removeEventListener('abort', cancel)
  }
}

const FORK_UPDATE_FILE = 'orcapad-update-'

async function discard(deps: DownloadDeps, uri: string): Promise<void> {
  await deps.deleteFile(uri).catch(() => {})
}
