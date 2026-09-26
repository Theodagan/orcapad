import { loadPreset, type WheelPresetDefinition } from '../wheel-preset'
import { EXPLORER_WHEEL_ACTION_IDS } from '../../bindings/file-explorer-row-action'
import { HOME_WHEEL_ACTION_IDS } from '../../bindings/home-wheel-actions'
import { AGENT_REPLY_IDS } from './agent-reply-actions'

/**
 * Presets bound to actions Orca Mobile already performs, rather than to the diagnostics next
 * door. Still experiments: WHEEL-R6 makes `contractual: false` literal here as everywhere, and
 * WHEEL-T9 is the only place a layout could become a default.
 *
 * Every id below is registered by a surface in `003`, which is what makes these worth trialling
 * at all — a segment reaches the same function the surface's own button does. It also makes them
 * honest about absence: a preset names ids from one surface, so on any other screen its segments
 * resolve `unavailable` and cancel, which is exactly what `002` §6 asks for and what a trial
 * needs to see.
 *
 * WHEEL-R7 bounds the contents. Nothing here stops, closes, forgets or deletes anything: opening
 * a pair route, previewing a file, collapsing a tree and reloading a folder are all reversible by
 * doing something else, and none of them destroys state. The destructive actions `003` exposes —
 * removing a host, closing tabs — are deliberately absent until cancel and commit have passed
 * device trials.
 */

const FULL_TURN = 6.283185307179586
const BOUNDARY_OVERLAP = 0.001
const TRIAD_HALF_WIDTH = FULL_TURN / 6 + BOUNDARY_OVERLAP
const QUAD_HALF_WIDTH = FULL_TURN / 8 + BOUNDARY_OVERLAP

const REAL_ACTION_TRIAL = {
  targetDevice: 'any controller-capable Android device',
  controller: 'any Android gamepad',
  destructivePolicy: 'excludes-destructive',
  notes:
    'Bound to existing surface actions through 003. Every segment is reversible; nothing here stops, closes, forgets or deletes.'
} as const

export const REAL_ACTION_PRESETS: Readonly<Record<string, WheelPresetDefinition>> = {
  /**
   * For the file explorer. Three segments because that is how many non-destructive actions the
   * panel actually offers — padding it to four would mean inventing one.
   */
  'explorer-actions': loadPreset({
    presetId: 'explorer-actions',
    label: 'File explorer actions',
    wheel: 2,
    contractual: false,
    trial: { trialId: 'explorer-actions', ...REAL_ACTION_TRIAL },
    segments: [
      {
        id: 'preview',
        label: 'Preview file',
        centerAngle: 0,
        halfWidth: TRIAD_HALF_WIDTH,
        bindingId: EXPLORER_WHEEL_ACTION_IDS.preview
      },
      {
        id: 'reload',
        label: 'Reload folder',
        centerAngle: FULL_TURN / 3,
        halfWidth: TRIAD_HALF_WIDTH,
        bindingId: EXPLORER_WHEEL_ACTION_IDS.reload
      },
      {
        id: 'collapse',
        label: 'Collapse all',
        centerAngle: (FULL_TURN * 2) / 3,
        halfWidth: TRIAD_HALF_WIDTH,
        bindingId: EXPLORER_WHEEL_ACTION_IDS.collapseAll
      }
    ]
  }),

  /**
   * `004` LOOP-R3's second path to text, and why the loop closes without a keyboard. Four
   * segments, the easy case the smoke trials already showed works — this is the preset a
   * controller-only session depends on, so it should be usable on the first try.
   */
  'agent-replies': loadPreset({
    presetId: 'agent-replies',
    label: 'Replies',
    wheel: 2,
    contractual: false,
    trial: { trialId: 'agent-replies', ...REAL_ACTION_TRIAL },
    segments: [
      {
        id: 'continue',
        label: 'Continue',
        centerAngle: 0,
        halfWidth: QUAD_HALF_WIDTH,
        bindingId: AGENT_REPLY_IDS.continue
      },
      {
        id: 'yes',
        label: 'Yes',
        centerAngle: FULL_TURN / 4,
        halfWidth: QUAD_HALF_WIDTH,
        bindingId: AGENT_REPLY_IDS.yes
      },
      {
        id: 'explain',
        label: 'Explain',
        centerAngle: FULL_TURN / 2,
        halfWidth: QUAD_HALF_WIDTH,
        bindingId: AGENT_REPLY_IDS.explain
      },
      {
        id: 'no',
        label: 'No',
        centerAngle: (FULL_TURN * 3) / 4,
        halfWidth: QUAD_HALF_WIDTH,
        bindingId: AGENT_REPLY_IDS.no
      }
    ]
  }),

  /**
   * Spans two surfaces on purpose. Off the home screen its explorer segments are unavailable and
   * inside a session its pairing segment is, so one trial answers the question a single-surface
   * preset cannot: whether a wheel that is mostly disabled reads as broken or as informative.
   */
  'cross-surface': loadPreset({
    presetId: 'cross-surface',
    label: 'Across surfaces',
    wheel: 1,
    contractual: false,
    trial: { trialId: 'cross-surface', ...REAL_ACTION_TRIAL },
    segments: [
      {
        id: 'pair',
        label: 'Pair desktop',
        centerAngle: 0,
        halfWidth: TRIAD_HALF_WIDTH,
        bindingId: HOME_WHEEL_ACTION_IDS.pairDesktop
      },
      {
        id: 'preview',
        label: 'Preview file',
        centerAngle: FULL_TURN / 3,
        halfWidth: TRIAD_HALF_WIDTH,
        bindingId: EXPLORER_WHEEL_ACTION_IDS.preview
      },
      {
        id: 'collapse',
        label: 'Collapse all',
        centerAngle: (FULL_TURN * 2) / 3,
        halfWidth: TRIAD_HALF_WIDTH,
        bindingId: EXPLORER_WHEEL_ACTION_IDS.collapseAll
      }
    ]
  })
}
