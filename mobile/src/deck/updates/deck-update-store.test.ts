import { describe, expect, it, vi } from 'vitest'
import { createDeckUpdateStore, type DeckUpdateState } from './deck-update-store'
import { UpdateDownloadError } from './download-update'

const RELEASE = {
  version: '1.5.0',
  apkUrl: 'https://github.com/Theodagan/orcapad/releases/download/orcapad-android-v1.5.0/a.apk',
  sizeBytes: 1024,
  digest: `sha256:${'a'.repeat(64)}`
}

function store(options: { check?: () => Promise<unknown>; install?: () => Promise<void> } = {}) {
  const states: DeckUpdateState['kind'][] = []
  const created = createDeckUpdateStore({
    installedVersion: '1.4.214',
    deps: {
      checkRelease: options.check ?? (async () => ({ kind: 'available', release: RELEASE })),
      download: {
        cacheDirectory: 'file:///cache/',
        createDownload: () => ({
          downloadAsync: async () => ({ uri: 'file:///cache/up.apk', size: 1024 })
        }),
        digestSha256: async () => 'a'.repeat(64),
        deleteFile: async () => {}
      },
      installer: {
        getContentUriAsync: async () => 'content://up.apk',
        startActivityAsync: options.install
          ? async () => {
              await options.install?.()
              return { resultCode: -1 }
            }
          : async () => ({ resultCode: -1 }),
        openUnknownSourcesSettings: async () => undefined
      }
    }
  })
  created.subscribe(() => states.push(created.get().kind))
  return { store: created, states }
}

describe('deck update store', () => {
  it('walks idle → checking → available → downloading → ready → installing', async () => {
    const { store: updates, states } = store()
    expect(updates.get().kind).toBe('idle')
    await updates.check()
    await updates.download()
    await updates.install()
    expect(states).toEqual(['checking', 'available', 'downloading', 'ready', 'installing', 'idle'])
  })

  it('stays idle when nothing newer exists', async () => {
    const { store: updates, states } = store({ check: async () => ({ kind: 'current' }) })
    await updates.check()
    expect(states).toEqual(['checking', 'idle'])
  })

  it('keeps the check failure’s own words', async () => {
    const { store: updates } = store({
      check: async () => {
        throw new Error('tag refs HTTP 403')
      }
    })
    await updates.check()
    expect(updates.get()).toEqual({
      kind: 'error',
      installedVersion: '1.4.214',
      error: { kind: 'check', detail: 'tag refs HTTP 403' }
    })
  })

  it('keeps a digest failure and a refused install as their own reasons', async () => {
    const digestFailure = createDeckUpdateStore({
      installedVersion: '1.4.214',
      deps: {
        checkRelease: async () => ({ kind: 'available', release: RELEASE }),
        download: {
          cacheDirectory: 'file:///cache/',
          createDownload: () => ({
            downloadAsync: async () => ({ uri: 'file:///cache/up.apk', size: 1024 })
          }),
          digestSha256: async () => 'b'.repeat(64),
          deleteFile: async () => {}
        },
        installer: {
          getContentUriAsync: async () => 'content://up.apk',
          startActivityAsync: async () => ({ resultCode: -1 }),
          openUnknownSourcesSettings: async () => undefined
        }
      }
    })
    await digestFailure.check()
    await digestFailure.download()
    expect(digestFailure.get()).toMatchObject({
      kind: 'error',
      error: { kind: 'download', detail: { kind: 'digest' } }
    })

    const refusedInstall = createDeckUpdateStore({
      installedVersion: '1.4.214',
      deps: {
        checkRelease: async () => ({ kind: 'available', release: RELEASE }),
        download: {
          cacheDirectory: 'file:///cache/',
          createDownload: () => ({
            downloadAsync: async () => ({ uri: 'file:///cache/up.apk', size: 1024 })
          }),
          digestSha256: async () => 'a'.repeat(64),
          deleteFile: async () => {}
        },
        installer: {
          getContentUriAsync: async () => 'content://up.apk',
          // Android answers with a result code the user can produce by cancelling the dialog.
          startActivityAsync: async () => ({ resultCode: 0 }),
          openUnknownSourcesSettings: async () => undefined
        }
      }
    })
    await refusedInstall.check()
    await refusedInstall.download()
    await refusedInstall.install()
    expect(refusedInstall.get()).toMatchObject({
      kind: 'error',
      error: { kind: 'install', detail: { kind: 'refused', resultCode: 0 } }
    })
  })

  it('reports a cancelled download as cancelled, not as an error with no words', async () => {
    const updates = createDeckUpdateStore({
      installedVersion: '1.4.214',
      deps: {
        checkRelease: async () => ({ kind: 'available', release: RELEASE }),
        download: {
          cacheDirectory: 'file:///cache/',
          createDownload: () => ({
            downloadAsync: async () => {
              throw new UpdateDownloadError({ kind: 'cancelled' })
            }
          }),
          digestSha256: async () => 'a'.repeat(64),
          deleteFile: async () => {}
        },
        installer: {
          getContentUriAsync: async () => 'content://up.apk',
          startActivityAsync: async () => ({ resultCode: -1 }),
          openUnknownSourcesSettings: async () => undefined
        }
      }
    })
    await updates.check()
    await updates.download()
    expect(updates.get()).toMatchObject({ kind: 'error', error: { kind: 'cancelled' } })
  })
})
