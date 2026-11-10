import { describe, expect, it } from 'vitest'
import { ApkInstallError, type ApkInstallerDeps, installApk } from './apk-installer'

/** The rejection, narrowed: a test that cannot see its own error is not a test. */
function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  return promise.catch((caught: unknown) => caught)
}

function expectInstallError(value: unknown): ApkInstallError {
  if (!(value instanceof ApkInstallError)) {
    throw new Error('expected an ApkInstallError')
  }
  return value
}

function deps(overrides: Partial<ApkInstallerDeps> = {}) {
  const started: unknown[] = []
  const base: ApkInstallerDeps = {
    getContentUriAsync: async (fileUri) => `content://installer${fileUri}`,
    startActivityAsync: async (action, options) => {
      started.push({ action, options })
      return { resultCode: -1 }
    },
    openUnknownSourcesSettings: async () => undefined,
    ...overrides
  }
  return { deps: base, started }
}

describe('APK installer', () => {
  it('opens the content URI with a read grant and the APK type', async () => {
    const { deps: installer, started } = deps()
    await installApk({ fileUri: '/cache/orcapad-1.5.0.apk', deps: installer })
    expect(started).toEqual([
      {
        action: 'android.intent.action.VIEW',
        options: {
          data: 'content://installer/cache/orcapad-1.5.0.apk',
          flags: 1,
          type: 'application/vnd.android.package-archive'
        }
      }
    ])
  })

  it('reports a missing file', async () => {
    const { deps: installer } = deps({
      getContentUriAsync: async () => {
        throw new Error('ENOENT')
      }
    })
    const error = await rejectionOf(installApk({ fileUri: '/gone.apk', deps: installer }))
    expect(expectInstallError(error).detail).toEqual({ kind: 'missing-file' })
  })

  it('reports an installer that cannot be opened, and one the user cancels', async () => {
    const noHandler = await rejectionOf(
      installApk({
        fileUri: '/a.apk',
        deps: deps({
          startActivityAsync: async () => {
            throw new Error('ActivityNotFoundException')
          }
        }).deps
      })
    )
    expect(expectInstallError(noHandler).detail).toEqual({
      kind: 'no-handler',
      reason: 'ActivityNotFoundException'
    })

    const refused = await rejectionOf(
      installApk({
        fileUri: '/a.apk',
        deps: deps({ startActivityAsync: async () => ({ resultCode: 0 }) }).deps
      })
    )
    expect(expectInstallError(refused).detail).toEqual({ kind: 'refused', resultCode: 0 })
  })
})
