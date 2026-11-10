import { describe, expect, it, vi } from 'vitest'
import { ApkInstallError, type ApkInstallerDeps, installApk } from './apk-installer'

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
    const error = await installApk({ fileUri: '/gone.apk', deps: installer }).catch(
      (caught) => caught
    )
    expect((error as ApkInstallError).detail).toEqual({ kind: 'missing-file' })
  })

  it('reports an installer that cannot be opened, and one the user cancels', async () => {
    const noHandler = await installApk({
      fileUri: '/a.apk',
      deps: deps({
        startActivityAsync: async () => {
          throw new Error('ActivityNotFoundException')
        }
      }).deps
    }).catch((caught) => caught)
    expect((noHandler as ApkInstallError).detail).toEqual({
      kind: 'no-handler',
      reason: 'ActivityNotFoundException'
    })

    const refused = await installApk({
      fileUri: '/a.apk',
      deps: deps({ startActivityAsync: async () => ({ resultCode: 0 }) }).deps
    }).catch((caught) => caught)
    expect((refused as ApkInstallError).detail).toEqual({ kind: 'refused', resultCode: 0 })
  })
})
