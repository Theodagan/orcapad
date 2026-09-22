import { requireOptionalNativeModule, type EventSubscription } from 'expo-modules-core'

/**
 * CTRL-T1's temporary Android spike. Absent on iOS and in any build without the native module,
 * which is why the handle is optional rather than required. CTRL-T4 deletes this.
 */

export type ProbeMotionRange = {
  readonly axis: number
  readonly axisName: string
  readonly source: number
  readonly min: number
  readonly max: number
  readonly flat: number
  readonly fuzz: number
  readonly resolution: number
}

export type ProbeDevice = {
  readonly id: number
  readonly name: string
  readonly vendorId: number
  readonly productId: number
  readonly sources: number
  readonly sourceNames: readonly string[]
  readonly isVirtual: boolean
  readonly controllerNumber: number
  readonly isGameController: boolean
  /** `analog` only when the pad declares a trigger axis (CTRL-R5). */
  readonly triggerForm: 'analog' | 'digital-or-absent'
  readonly motionRanges: readonly ProbeMotionRange[]
}

type ProbeEventBase = {
  readonly deviceId: number
  readonly source: number
  readonly sourceNames: readonly string[]
  readonly eventTime: number
  /** False means the decor-level tap saw it and no focused view took it. */
  readonly consumedByViewTree: boolean
  /** The class the WebView question turns on, e.g. `RNCWebView` while a terminal is focused. */
  readonly focusedView: string
}

export type ProbeKeyEvent = ProbeEventBase & {
  readonly kind: 'key'
  readonly action: string
  readonly keyCode: number
  readonly keyCodeName: string
  readonly scanCode: number
  readonly repeatCount: number
}

export type ProbeMotionEvent = ProbeEventBase & {
  readonly kind: 'motion'
  readonly action: string
  readonly axes: Readonly<Record<string, number>>
}

export type ProbeInputEvent = ProbeKeyEvent | ProbeMotionEvent

export type ProbeDeviceChange = {
  readonly change: 'added' | 'removed' | 'changed'
  readonly deviceId: number
  readonly devices: readonly ProbeDevice[]
}

export type GamepadProbeModule = {
  readonly listDevices: () => readonly ProbeDevice[]
  /** `intervalMs` caps motion events reaching JS; key events are never dropped. */
  readonly start: (intervalMs: number) => boolean
  readonly stop: () => boolean
  readonly addListener: {
    (event: 'onInputEvent', listener: (payload: ProbeInputEvent) => void): EventSubscription
    (event: 'onDeviceChange', listener: (payload: ProbeDeviceChange) => void): EventSubscription
  }
}

export const gamepadProbe = requireOptionalNativeModule<GamepadProbeModule>('OrcaGamepadProbe')
