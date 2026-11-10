import type {
  DeckReleaseAsset,
  DeckReleaseCheck
} from '../../app-update/fork-release-update-source'
import { downloadUpdate, UpdateDownloadError, type DownloadDeps } from './download-update'
import { ApkInstallError, type ApkInstallerDeps, installApk } from './apk-installer'

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
  install(): Promise<void>
  cancel(): void
  /** Called when the user leaves the notice alone; it must not nag again for this version. */
  dismiss(): void
}

export function createDeckUpdateStore(args: {
  readonly installedVersion: string
  readonly deps: DeckUpdateDeps
}): DeckUpdateStore {
  let state: DeckUpdateState = { kind: 'idle', installedVersion: args.installedVersion }
  let dismissedVersion: string | null = null
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
          error: { kind: 'check', detail: error instanceof Error ? error.message : 'unknown' }
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
              : { kind: 'download', detail: { kind: 'cancelled' } }
        })
      }
    },
    async install() {
      if (state.kind !== 'ready') {
        return
      }
      const { release, fileUri } = state
      publish({ kind: 'installing', installedVersion: installed(), release })
      try {
        await installApk({ fileUri, deps: args.deps.installer })
        // Android takes over here; the app stays mounted behind the installer.
        publish({ kind: 'idle', installedVersion: installed() })
      } catch (error: unknown) {
        publish({
          kind: 'error',
          installedVersion: installed(),
          error:
            error instanceof ApkInstallError
              ? { kind: 'install', detail: error.detail }
              : { kind: 'install', detail: { kind: 'missing-file' } }
        })
      }
    },
    cancel() {
      controller?.abort()
    },
    dismiss() {
      dismissedVersion = state.kind === 'available' ? state.release.version : dismissedVersion
    }
  }
}
