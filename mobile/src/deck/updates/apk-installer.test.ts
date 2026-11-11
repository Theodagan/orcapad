import { describe, expect, it } from 'vitest'
import {
  ApkInstallError,
  installApk,
  RESULT_CANCELED,
  RESULT_OK,
  type ApkInstallerDeps
} from './apk-installer'

const DIGEST = 'a'.repeat(64)

/** The rejection, narrowed: a test that cannot see its own error is not a test. */
function expectInstallError(value: unknown): ApkInstallError {
  if (!(value instanceof ApkInstallError)) {
    throw new Error('expected an ApkInstallError')
  }
  return value
}

function deps(overrides: Partial<ApkInstallerDeps> = {}) {
  const started: { action: string; data: string; flags: number; type?: string }[] = []
  const installer: ApkInstallerDeps = {
    fileSize: async () => 1024,
    digestSha256: async () => DIGEST,
    getContentUriAsync: async (fileUri) => `content://installer${fileUri}`,
    startActivityAsync: async (action, options) => {
      started.push({
        action,
        data: options.data,
        flags: options.flags,
        type: options.type
      })
      return { resultCode: RESULT_OK }
    },
    openUnknownSourcesSettings: async () => undefined,
    ...overrides
  }
  return { installer, started }
}

const FILE = { fileUri: '/cache/orcapad-1.5.0.apk', expectedBytes: 1024, expectedDigest: DIGEST }

describe('APK installer', () => {
  it('opens the content URI with a read grant and the APK type', async () => {
    const { installer, started } = deps()
    const report = await installApk({ ...FILE, deps: installer })
    expect(started).toEqual([
      {
        action: 'android.intent.action.VIEW',
        data: 'content://installer/cache/orcapad-1.5.0.apk',
        flags: 1,
        type: 'application/vnd.android.package-archive'
      }
    ])
    expect(report).toEqual({ resultCode: RESULT_OK })
  })

  it('carries the installer’s result out instead of reading success or refusal into it', async () => {
    for (const resultCode of [RESULT_OK, RESULT_CANCELED, 1, 42]) {
      const { installer } = deps({ startActivityAsync: async () => ({ resultCode }) })
      expect(await installApk({ ...FILE, deps: installer })).toEqual({ resultCode })
    }
  })

  it('checks size and digest before Android is handed a URI', async () => {
    const short = deps({ fileSize: async () => 1000 })
    expect(
      expectInstallError(await installApk({ ...FILE, deps: short.installer }).catch((e) => e))
        .detail
    ).toEqual({
      kind: 'size',
      expected: 1024,
      received: 1000
    })
    expect(short.started).toEqual([])

    const swapped = deps({ digestSha256: async () => 'b'.repeat(64) })
    expect(
      expectInstallError(await installApk({ ...FILE, deps: swapped.installer }).catch((e) => e))
        .detail
    ).toEqual({ kind: 'digest', expected: DIGEST, received: 'b'.repeat(64) })
    expect(swapped.started).toEqual([])
  })

  it('keeps the platform’s words when the file is gone or the installer cannot launch', async () => {
    const gone = deps({ fileSize: async () => null })
    expect(
      expectInstallError(await installApk({ ...FILE, deps: gone.installer }).catch((e) => e)).detail
    ).toEqual({ kind: 'file-gone', reason: 'the downloaded update is no longer in the cache' })

    const blocked = deps({
      startActivityAsync: async () => {
        throw new Error('Permission Denial: not allowed to start activity Intent { act=VIEW }')
      }
    })
    expect(
      expectInstallError(await installApk({ ...FILE, deps: blocked.installer }).catch((e) => e))
        .detail
    ).toEqual({
      kind: 'unlaunchable',
      reason: 'Permission Denial: not allowed to start activity Intent { act=VIEW }'
    })
  })
})
