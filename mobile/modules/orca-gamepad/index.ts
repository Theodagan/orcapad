import { requireOptionalNativeModule, type EventSubscription } from 'expo-modules-core'

/**
 * Android controller input. Absent on every other platform and in any build without the native
 * module, so the handle is optional and the controller layer falls back to its absent reader.
 */

export type NativeControllerDevice = {
  readonly id: number
  readonly name: string
  readonly vendorId: number
  readonly productId: number
  /** False when the pad reports L2/R2 only as buttons, which makes their value 0 or 1. */
  readonly hasAnalogTriggers: boolean
  /** The device's own declared flat zone per axis — the only dead zone it can vouch for. */
  readonly flat: Readonly<Record<string, number>>
}

export type NativeControllerSample = {
  readonly connected: boolean
  readonly buttons: Readonly<Record<string, number>>
  readonly axes: Readonly<Record<string, number>>
  readonly sampledAt: number
  /** True when the focused view took the event before the controller layer saw it. */
  readonly consumedByViewTree: boolean
  readonly focusedView: string
}

export type NativeControllerDevices = {
  readonly controllers: readonly NativeControllerDevice[]
}

export type OrcaGamepadModule = {
  readonly listControllers: () => readonly NativeControllerDevice[]
  readonly currentSample: () => NativeControllerSample
  /** `intervalMs` paces analog samples; a button edge is always delivered immediately. */
  readonly start: (intervalMs: number) => boolean
  readonly stop: () => boolean
  readonly addListener: {
    (
      event: 'onControllerSample',
      listener: (payload: NativeControllerSample) => void
    ): EventSubscription
    (
      event: 'onControllerDevices',
      listener: (payload: NativeControllerDevices) => void
    ): EventSubscription
  }
}

export const orcaGamepad = requireOptionalNativeModule<OrcaGamepadModule>('OrcaGamepad')
