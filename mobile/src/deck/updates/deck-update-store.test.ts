import { describe, expect, it } from 'vitest'
import {
  createDeckUpdateStore,
  type DeckUpdateState,
  type DeckUpdateDeps
} from './deck-update-store'
import { UpdateDownloadError } from './download-update'

const SHA = 'a'.repeat(64)
const RELEASE = {
  version: '1.5.0',
  apkUrl: 'https://github.com/Theodagan/orcapad/releases/download/orcapad-android-v1.5.0/a.apk',
  sizeBytes: 1024,
  digest: `sha256:${SHA}`
}

function deps(overrides: Partial<DeckUpdateDeps> = {}) {
  const downloaded: string[] = []
  const permissionsOpened: string[] = []
  const base: DeckUpdateDeps = {
    checkRelease: async () => ({ kind: 'available', release: RELEASE }),
    download: {
      cacheDirectory: 'file:///cache/',
      createDownload: () => ({
        downloadAsync: async () => {
          downloaded.push('a.apk')
          return { uri: 'file:///cache/a.apk', size: 1024 }
        }
      }),
      digestSha256: async () => SHA,
      deleteFile: async () => {}
    },
    installer: {
      fileSize: async () => 1024,
      digestSha256: async () => SHA,
      getContentUriAsync: async () => 'content://a.apk',
      startActivityAsync: async () => ({ resultCode: -1 }),
      openUnknownSourcesSettings: async (packageUri) => {
        permissionsOpened.push(packageUri)
      }
    },
    ...overrides
  }
  return { deps: base, downloaded, permissionsOpened }
}

function store(overrides: Partial<DeckUpdateDeps> = {}) {
  const built = deps(overrides)
  const states: DeckUpdateState['kind'][] = []
  const created = createDeckUpdateStore({
    installedVersion: '1.4.214',
    packageName: 'com.theodagan.orcapad',
    deps: built.deps
  })
  created.subscribe(() => states.push(created.get().kind))
  return { ...built, store: created, states }
}

describe('deck update store', () => {
  it('walks to the installer’s report and keeps the download for another attempt', async () => {
    const { store: updates, states } = store()
    await updates.check()
    await updates.download()
    await updates.install()
    expect(states).toEqual([
      'checking',
      'available',
      'downloading',
      'ready',
      'installing',
      'install-reported'
    ])
    expect(updates.get()).toMatchObject({
      kind: 'install-reported',
      fileUri: 'file:///cache/a.apk',
      resultCode: -1
    })
    await updates.install()
    expect(updates.get()).toMatchObject({ kind: 'install-reported', resultCode: -1 })
  })

  it('stays idle when nothing newer exists, and when the notice is dismissed', async () => {
    const current = store({ checkRelease: async () => ({ kind: 'current' }) })
    await current.store.check()
    expect(current.states).toEqual(['checking', 'idle'])

    const dismissed = store()
    await dismissed.store.check()
    dismissed.store.dismiss()
    expect(dismissed.store.get().kind).toBe('idle')
  })

  it('keeps every failure’s own words', async () => {
    const check = store({
      checkRelease: async () => {
        throw new Error('tag refs HTTP 403')
      }
    })
    await check.store.check()
    expect(check.store.get()).toEqual({
      kind: 'error',
      installedVersion: '1.4.214',
      error: { kind: 'check', detail: 'tag refs HTTP 403' }
    })

    const transport = store({
      download: {
        cacheDirectory: 'file:///cache/',
        createDownload: () => ({
          downloadAsync: async () => {
            throw new Error('Unable to resolve host github.com')
          }
        }),
        digestSha256: async () => SHA,
        deleteFile: async () => {}
      }
    })
    await transport.store.check()
    await transport.store.download()
    expect(transport.store.get()).toMatchObject({
      kind: 'error',
      error: {
        kind: 'download',
        detail: { kind: 'failed', reason: 'Unable to resolve host github.com' }
      }
    })

    const blocked = store({
      installer: {
        fileSize: async () => 1024,
        digestSha256: async () => SHA,
        getContentUriAsync: async () => 'content://a.apk',
        startActivityAsync: async () => {
          throw new Error('Permission Denial: MANAGE_UNKNOWN_APP_SOURCES')
        },
        openUnknownSourcesSettings: async () => undefined
      }
    })
    await blocked.store.check()
    await blocked.store.download()
    await blocked.store.install()
    expect(blocked.store.get()).toMatchObject({
      kind: 'error',
      error: {
        kind: 'install',
        detail: { kind: 'unlaunchable', reason: 'Permission Denial: MANAGE_UNKNOWN_APP_SOURCES' }
      }
    })
  })

  it('reports a cancelled download as cancelled, and reopens the permission screen every time', async () => {
    const cancelled = store({
      download: {
        cacheDirectory: 'file:///cache/',
        createDownload: () => ({
          downloadAsync: async () => {
            throw new UpdateDownloadError({ kind: 'cancelled' })
          }
        }),
        digestSha256: async () => SHA,
        deleteFile: async () => {}
      }
    })
    await cancelled.store.check()
    await cancelled.store.download()
    expect(cancelled.store.get()).toMatchObject({ kind: 'error', error: { kind: 'cancelled' } })

    const permissions = store()
    await permissions.store.openInstallPermissionSettings()
    await permissions.store.openInstallPermissionSettings()
    expect(permissions.permissionsOpened).toEqual([
      'package:com.theodagan.orcapad',
      'package:com.theodagan.orcapad'
    ])
  })
})
