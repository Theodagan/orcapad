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
    downloadAsync(): Promise<{ uri: string; size: number }>
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

export class UpdateDownloadError extends Error {
  readonly detail: DownloadError

  constructor(detail: DownloadError) {
    super(`update download failed: ${detail.kind}`)
    this.detail = detail
  }
}

function hexDigest(digest: string): string | null {
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
    const downloaded = await download.downloadAsync()
    if (signal.aborted) {
      await discard(deps, downloaded.uri)
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
    const expected = release.digest === null ? null : hexDigest(release.digest)
    if (expected === null) {
      // Without a published digest the size is all there is; say so rather than pretend to verify.
      throw new UpdateDownloadError({
        kind: 'unverifiable',
        reason: 'the release publishes no sha256 digest'
      })
    }
    const received = (await deps.digestSha256(downloaded.uri)).toLowerCase()
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
