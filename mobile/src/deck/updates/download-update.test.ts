import { describe, expect, it, vi } from 'vitest'
import { downloadUpdate, UpdateDownloadError, type DownloadDeps } from './download-update'
import type { DeckReleaseAsset } from '../../app-update/fork-release-update-source'

const SHA = 'a'.repeat(64)
const RELEASE: DeckReleaseAsset = {
  version: '1.5.0',
  apkUrl:
    'https://github.com/Theodagan/orcapad/releases/download/orcapad-android-v1.5.0/orcapad.apk',
  sizeBytes: 1024,
  digest: `sha256:${SHA}`
}

function deps(overrides: Partial<DownloadDeps> & { size?: number; digest?: string } = {}) {
  const deleted: string[] = []
  const progress: number[] = []
  const base: DownloadDeps = {
    cacheDirectory: 'file:///cache/',
    createDownload: (url, destination, onProgress) => ({
      downloadAsync: async () => {
        onProgress(512, 1024)
        onProgress(1024, 1024)
        progress.push(1)
        return { uri: destination, size: overrides.size ?? 1024 }
      }
    }),
    digestSha256: async () => overrides.digest ?? SHA,
    deleteFile: async (uri) => {
      deleted.push(uri)
    },
    ...overrides
  }
  return { deps: base, deleted, progress }
}

describe('update download', () => {
  it('reports progress and answers the verified file', async () => {
    const { deps: downloadDeps } = deps()
    const onProgress = vi.fn()
    const result = await downloadUpdate({
      release: RELEASE,
      deps: downloadDeps,
      signal: new AbortController().signal,
      onProgress
    })
    expect(result).toEqual({ uri: 'file:///cache/orcapad-update-1.5.0.apk' })
    expect(onProgress).toHaveBeenCalledWith({ receivedBytes: 512, totalBytes: 1024 })
    expect(onProgress).toHaveBeenCalledTimes(2)
  })

  it('deletes a file whose digest does not match', async () => {
    const { deps: downloadDeps, deleted } = deps({ digest: 'b'.repeat(64) })
    await expect(
      downloadUpdate({ release: RELEASE, deps: downloadDeps, signal: new AbortController().signal })
    ).rejects.toBeInstanceOf(UpdateDownloadError)
    expect(deleted).toEqual(['file:///cache/orcapad-update-1.5.0.apk'])
    const error = await downloadUpdate({
      release: RELEASE,
      deps: downloadDeps,
      signal: new AbortController().signal
    }).catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(UpdateDownloadError)
    expect((error as UpdateDownloadError).detail).toEqual({
      kind: 'digest',
      expected: SHA,
      received: 'b'.repeat(64)
    })
  })

  it('deletes a short download', async () => {
    const { deps: downloadDeps, deleted } = deps({ size: 512 })
    const error = await downloadUpdate({
      release: RELEASE,
      deps: downloadDeps,
      signal: new AbortController().signal
    }).catch((caught: unknown) => caught)
    expect((error as UpdateDownloadError).detail).toEqual({
      kind: 'size',
      expected: 1024,
      received: 512
    })
    expect(deleted).toHaveLength(1)
  })

  it('refuses a release that publishes no digest', async () => {
    const { deps: downloadDeps } = deps()
    const error = await downloadUpdate({
      release: { ...RELEASE, digest: null },
      deps: downloadDeps,
      signal: new AbortController().signal
    }).catch((caught: unknown) => caught)
    expect((error as UpdateDownloadError).detail).toEqual({
      kind: 'unverifiable',
      reason: 'the release publishes no sha256 digest'
    })
  })

  it('stops when the download is cancelled', async () => {
    const controller = new AbortController()
    const pauseAsync = vi.fn(async () => {})
    const { deps: downloadDeps, deleted } = deps({
      createDownload: (url, destination, onProgress) => ({
        downloadAsync: async () => {
          controller.abort()
          onProgress(1, 1024)
          return { uri: destination, size: 1024 }
        },
        pauseAsync
      })
    })
    const error = await downloadUpdate({
      release: RELEASE,
      deps: downloadDeps,
      signal: controller.signal
    }).catch((caught: unknown) => caught)
    expect((error as UpdateDownloadError).detail).toEqual({ kind: 'cancelled' })
    expect(deleted).toHaveLength(1)
  })
})
