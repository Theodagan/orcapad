import type {
  DeckReleaseAsset,
  DeckReleaseCheck
} from '../../app-update/fork-release-update-source'
import {
  downloadUpdate,
  hexDigest,
  UpdateDownloadError,
  type DownloadDeps
} from './download-update'
import {
  ApkInstallError,
  failureReason,
  installApk,
  type ApkInstallerDeps,
  type InstallReport
} from './apk-installer'
import { unknownSourcesSettingsUri } from './install-explainer'

/**
 * DECK-R49: one state machine for the update flow, so the panel, the notice and the refusal screen
 * all read the same truth. Every failure keeps its reason: swallowed errors are how a user ends up
 * pressing Update and seeing nothing (DECK-R39).
 */
export type DeckUpdateError =
  | { readonly kind: 'check'; readonly detail: string }
  | { readonly kind: 'download'; readonly detail: UpdateDownloadError['detail'] }
  | { readonly kind: 'install'; readonly detail: ApkInstallError['detail'] }
  | { readonly kind: 'cancelled' }

export type DeckUpdateState =
  | { readonly kind: 'idle'; readonly installedVersion: string }
  | { readonly kind: 'checking'; readonly installedVersion: string }
  | {
      readonly kind: 'available'
      readonly installedVersion: string
      readonly release: DeckReleaseAsset
    }
  | {
      readonly kind: 'downloading'
      readonly installedVersion: string
      readonly release: DeckReleaseAsset
      readonly receivedBytes: number
      readonly totalBytes: number
    }
  | {
      readonly kind: 'ready'
      readonly installedVersion: string
      readonly release: DeckReleaseAsset
      readonly fileUri: string
    }
  | {
      readonly kind: 'installing'
      readonly installedVersion: string
      readonly release: DeckReleaseAsset
      readonly fileUri: string
    }
  | {
      /** Android's installer came back. Its result code is carried, not interpreted as success. */
      readonly kind: 'install-reported'
      readonly installedVersion: string
      readonly release: DeckReleaseAsset
      readonly fileUri: string
      readonly resultCode: number
    }
  | { readonly kind: 'error'; readonly installedVersion: string; readonly error: DeckUpdateError }

export type DeckUpdateDeps = {
  readonly checkRelease: (
    installedVersion: string,
    signal: AbortSignal
  ) => Promise<DeckReleaseCheck>
  readonly download: DownloadDeps
  readonly installer: ApkInstallerDeps
}

export type DeckUpdateStore = {
  get(): DeckUpdateState
  subscribe(listener: () => void): () => void
  /** Non-blocking on launch: a failure just means "no news", never a wall. */
  check(): Promise<void>
  download(): Promise<void>
  /** Launches the installer, or launches it again from the report screen. */
  install(): Promise<void>
  cancel(): void
  /** Hid the launch notice for this version; the Settings panel can still find it. */
  dismiss(): void
  /** Closed the report screen without touching the kept download. */
  closeInstallReport(): void
  /** Android's own "install unknown apps" screen, offered on every attempt, not just the first. */
  openInstallPermissionSettings(): Promise<void>
}

export function createDeckUpdateStore(args: {
  readonly installedVersion: string
  readonly packageName: string
  readonly deps: DeckUpdateDeps
}): DeckUpdateStore {
  let state: DeckUpdateState = { kind: 'idle', installedVersion: args.installedVersion }
  let controller: AbortController | null = null
  const listeners = new Set<() => void>()

  const publish = (next: DeckUpdateState): void => {
    state = next
    for (const listener of listeners) {
      listener()
    }
  }
  const installed = (): string => args.installedVersion

  return {
    get: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    async check() {
      if (
        state.kind === 'checking' ||
        state.kind === 'downloading' ||
        state.kind === 'installing'
      ) {
        return
      }
      publish({ kind: 'checking', installedVersion: installed() })
      controller = new AbortController()
      try {
        const result = await args.deps.checkRelease(installed(), controller.signal)
        if (result.kind === 'available') {
          publish({ kind: 'available', installedVersion: installed(), release: result.release })
        } else {
          publish({ kind: 'idle', installedVersion: installed() })
        }
      } catch (error: unknown) {
        publish({
          kind: 'error',
          installedVersion: installed(),
          error: { kind: 'check', detail: failureReason(error, 'the update check failed') }
        })
      }
    },
    async download() {
      if (state.kind !== 'available') {
        return
      }
      const { release } = state
      publish({
        kind: 'downloading',
        installedVersion: installed(),
        release,
        receivedBytes: 0,
        totalBytes: release.sizeBytes
      })
      controller = new AbortController()
      try {
        const result = await downloadUpdate({
          release,
          deps: args.deps.download,
          signal: controller.signal,
          onProgress: (progress) =>
            publish({
              kind: 'downloading',
              installedVersion: installed(),
              release,
              receivedBytes: progress.receivedBytes,
              totalBytes: progress.totalBytes
            })
        })
        publish({ kind: 'ready', installedVersion: installed(), release, fileUri: result.uri })
      } catch (error: unknown) {
        publish({
          kind: 'error',
          installedVersion: installed(),
          error:
            error instanceof UpdateDownloadError
              ? error.detail.kind === 'cancelled'
                ? { kind: 'cancelled' }
                : { kind: 'download', detail: error.detail }
              : {
                  kind: 'download',
                  detail: { kind: 'failed', reason: failureReason(error, 'the download failed') }
                }
        })
      }
    },
    async install() {
      const current = state
      if (current.kind !== 'ready' && current.kind !== 'install-reported') {
        return
      }
      const { release, fileUri } = current
      publish({ kind: 'installing', installedVersion: installed(), release, fileUri })
      let report: InstallReport
      try {
        report = await installApk({
          fileUri,
          expectedBytes: release.sizeBytes,
          expectedDigest: hexDigest(release.digest),
          deps: args.deps.installer
        })
      } catch (error: unknown) {
        publish({
          kind: 'error',
          installedVersion: installed(),
          error: {
            kind: 'install',
            detail:
              error instanceof ApkInstallError
                ? error.detail
                : {
                    kind: 'unlaunchable',
                    reason: failureReason(error, 'the installer could not be opened')
                  }
          }
        })
        return
      }
      // The download stays on disk: the user may still be inside Android's installer screens.
      publish({
        kind: 'install-reported',
        installedVersion: installed(),
        release,
        fileUri,
        resultCode: report.resultCode
      })
    },
    cancel() {
      controller?.abort()
    },
    dismiss() {
      if (state.kind === 'available') {
        publish({ kind: 'idle', installedVersion: installed() })
      }
    },
    closeInstallReport() {
      if (state.kind === 'install-reported') {
        publish({ kind: 'idle', installedVersion: installed() })
      }
    },
    async openInstallPermissionSettings() {
      await args.deps.installer.openUnknownSourcesSettings(
        unknownSourcesSettingsUri(args.packageName)
      )
    }
  }
}
