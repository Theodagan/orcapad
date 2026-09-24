import type { WheelPresetDefinition } from '../wheel-preset'
import type { WheelId } from '../wheel-segment'
import { SMOKE_PRESETS } from './smoke-presets'

/**
 * Which presets the shell is currently running. WHEEL-AC7 forbids a default assignment outside
 * experiment preset data — this is that data, and it is the only thing a trial has to edit.
 *
 * Not a product default and not a recommendation: it is whichever pair is being tried next.
 * Six segments on the left stick asks how narrow is too narrow; mixed availability on the right
 * asks what a refused or absent binding feels like in the hand. WHEEL-T9 is where a layout could
 * become a default, and only with a trial record and a recorded human decision behind it.
 */
export const ACTIVE_SMOKE_TRIAL: Readonly<Partial<Record<WheelId, WheelPresetDefinition>>> = {
  1: SMOKE_PRESETS['smoke-hex'],
  2: SMOKE_PRESETS['smoke-mixed']
}
