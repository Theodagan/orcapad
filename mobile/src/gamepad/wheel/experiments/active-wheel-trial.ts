import type { WheelPresetDefinition } from '../wheel-preset'
import type { WheelId } from '../wheel-segment'
import { REAL_ACTION_PRESETS } from './real-action-presets'
import { SMOKE_PRESETS } from './smoke-presets'

/**
 * Which presets the shell is currently running. WHEEL-AC7 forbids a default assignment outside
 * experiment preset data, and this is that data: changing the trial is an edit to this file and
 * nothing else — no geometry, no state machine, no surface (WHEEL-AC6).
 *
 * One of each, deliberately. WHEEL-T8 runs smoke and existing-action presets, and a pad has two
 * sticks, so a single session can answer both questions: whether six narrow segments are
 * selectable at all, and whether a wheel bound to real actions commits the right one.
 *
 * Not a product default and not a recommendation. WHEEL-T9 is where a layout could become one,
 * and only with a trial record and a recorded human decision behind it.
 */
export const ACTIVE_WHEEL_TRIAL: Readonly<Partial<Record<WheelId, WheelPresetDefinition>>> = {
  1: SMOKE_PRESETS['smoke-hex'],
  2: REAL_ACTION_PRESETS['explorer-actions']
}
