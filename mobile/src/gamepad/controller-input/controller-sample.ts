/**
 * Device truth, normalized. `001` finalizes this vocabulary; the provider needs the shape now
 * because a reader cannot be held without one. Raw control names live here and nowhere else —
 * past the resolver the vocabulary is intents, so a remapped button changes one table.
 */

export const CONTROLLER_BUTTONS = [
  'a',
  'b',
  'x',
  'y',
  'lb',
  'rb',
  'l3',
  'r3',
  'dpad-up',
  'dpad-down',
  'dpad-left',
  'dpad-right'
] as const

export type ControllerButton = (typeof CONTROLLER_BUTTONS)[number]

export const CONTROLLER_AXES = ['left-x', 'left-y', 'right-x', 'right-y', 'l2', 'r2'] as const

export type ControllerAxis = (typeof CONTROLLER_AXES)[number]

/** Sticks normalize to -1..1, triggers to 0..1. */
export type ControllerSample = {
  readonly connected: boolean
  readonly buttons: ReadonlyMap<ControllerButton, number>
  readonly axes: ReadonlyMap<ControllerAxis, number>
  readonly sampledAt: number
}

/**
 * Everything released. A disconnect publishes one of these so a button held at the moment the
 * controller vanished does not stay held forever (`001` §9).
 */
export function neutralSample(sampledAt: number, connected = false): ControllerSample {
  return { connected, buttons: new Map(), axes: new Map(), sampledAt }
}
