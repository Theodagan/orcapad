import Constants from 'expo-constants'
import { File } from 'expo-file-system'
import * as FileSystem from 'expo-file-system/legacy'
import * as IntentLauncher from 'expo-intent-launcher'
import { useSyncExternalStore } from 'react'
import { installedAppVersion } from '../../app-update/app-update-runtime'
import { forkReleaseUpdateSource } from '../../app-update/fork-release-update-source'
import {
  createDeckUpdateStore,
  type DeckUpdateState,
  type DeckUpdateStore
} from './deck-update-store'
import { sha256OfFile, type ByteSource } from './file-sha256'
import { MANAGE_UNKNOWN_APP_SOURCES, unknownSourcesSettingsUri } from './install-explainer'

/**
 * D6's platform half, kept apart from the flow so the state machine stays testable.
 * `expo-file-system`'s legacy entry point is the one with the download, content-URI and file-info
 * calls this needs; `expo-intent-launcher` hands the APK to Android.
 */
function openApkBytes(uri: string): ByteSource {
  const handle = new File(uri).open()
  const size = handle.size
  if (size === null) {
    handle.close()
    throw new Error(`${uri} reports no size`)
  }
  return { size, read: (bytes) => handle.readBytes(bytes), close: () => handle.close() }
}

/** The fork's own package, for Android's "install unknown apps" screen. */
const PACKAGE_NAME = Constants.expoConfig?.android?.package ?? 'com.theodagan.orcapad'

function createRuntimeStore(): DeckUpdateStore {
  return createDeckUpdateStore({
    installedVersion: installedAppVersion ?? '0.0.0',
    packageName: PACKAGE_NAME,
    deps: {
      checkRelease: (installedVersion, signal) =>
        forkReleaseUpdateSource.checkRelease(installedVersion, signal),
      download: {
        cacheDirectory: FileSystem.cacheDirectory ?? '',
        createDownload: (url, destination, onProgress) => {
          const resumable = FileSystem.createDownloadResumable(url, destination, {}, (progress) => {
            onProgress(progress.totalBytesWritten, progress.totalBytesExpectedToWrite)
          })
          return {
            downloadAsync: async () => {
              const result = await resumable.downloadAsync()
              if (result === undefined) {
                // The platform pauses a resumable download by resolving with nothing.
                return null
              }
              const info = await FileSystem.getInfoAsync(result.uri)
              return { uri: result.uri, size: info.exists ? (info.size ?? 0) : 0 }
            },
            pauseAsync: () => resumable.pauseAsync()
          }
        },
        digestSha256: (uri) => sha256OfFile(uri, openApkBytes),
        deleteFile: (uri) => FileSystem.deleteAsync(uri, { idempotent: true })
      },
      installer: {
        fileSize: async (fileUri) => {
          const info = await FileSystem.getInfoAsync(fileUri)
          return info.exists ? (info.size ?? null) : null
        },
        digestSha256: (uri) => sha256OfFile(uri, openApkBytes),
        getContentUriAsync: (fileUri) => FileSystem.getContentUriAsync(fileUri),
        startActivityAsync: async (action, options) => {
          const result = await IntentLauncher.startActivityAsync(action, options)
          return { resultCode: result.resultCode }
        },
        openUnknownSourcesSettings: (packageUri) =>
          IntentLauncher.startActivityAsync(MANAGE_UNKNOWN_APP_SOURCES, { data: packageUri })
      }
    }
  })
}

export const deckUpdateStore = createRuntimeStore()

let checkedThisLaunch = false

/** DECK-R47: one check per launch, however many deck screens open; Settings can still ask again. */
export function ensureDeckUpdateChecked(): void {
  if (checkedThisLaunch) {
    return
  }
  checkedThisLaunch = true
  void deckUpdateStore.check()
}

export function useDeckUpdate(): DeckUpdateState {
  return useSyncExternalStore(deckUpdateStore.subscribe, deckUpdateStore.get)
}

/** Android's own "install unknown apps" screen, for this app's package. */
export function openUnknownSourcesSettings(packageName: string): Promise<unknown> {
  return IntentLauncher.startActivityAsync(MANAGE_UNKNOWN_APP_SOURCES, {
    data: unknownSourcesSettingsUri(packageName)
  })
}
