import { loadPreset, type WheelPresetDefinition } from '../wheel-preset'
import { EXPLORER_WHEEL_ACTION_IDS } from '../../bindings/file-explorer-row-action'
import { HOME_WHEEL_ACTION_IDS } from '../../bindings/home-wheel-actions'
import { AGENT_WHEEL_ACTION_IDS } from '../../bindings/agent-wheel-action-ids'
import { NAVIGATION_WHEEL_ACTION_IDS } from '../../bindings/navigation-wheel-actions'

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
const SIX_HALF_WIDTH = FULL_TURN / 12 + BOUNDARY_OVERLAP
const QUAD_HALF_WIDTH = FULL_TURN / 8 + BOUNDARY_OVERLAP

const REAL_ACTION_TRIAL = {
  targetDevice: 'any controller-capable Android device',
  controller: 'any Android gamepad',
  destructivePolicy: 'excludes-destructive',
  notes:
    'Bound to existing surface actions through 003. Every segment is reversible; nothing here stops, closes, forgets or deletes.'
} as const

/**
 * The agent wheel can stop and close what it points at, and a product decision asked for exactly
 * that (`005` USE-R10), so it says so. WHEEL-R7 asked for this to be said before a trial runs.
 */
const AGENT_ACTION_TRIAL = {
  targetDevice: 'any controller-capable Android device',
  controller: 'any Android gamepad',
  destructivePolicy: 'includes-destructive',
  notes:
    'Stop interrupts the agent and Close ends its tab; both were asked for by the product owner. Commit needs a lock and A, and B or centring cancels with no effect.'
} as const

export const REAL_ACTION_PRESETS: Readonly<Record<string, WheelPresetDefinition>> = {
  /**
   * The left wheel (`005` USE-R9): four choices, north/east/south/west. Focus mode is north,
   * new worktree east, shortcuts south, and back to menu west.
   */
  navigation: loadPreset({
    presetId: 'navigation',
    label: 'Navigation',
    wheel: 1,
    contractual: false,
    trial: { trialId: 'navigation', ...REAL_ACTION_TRIAL },
    segments: [
      {
        id: 'focus-mode',
        label: 'Focus mode',
        centerAngle: 0,
        halfWidth: QUAD_HALF_WIDTH,
        bindingId: NAVIGATION_WHEEL_ACTION_IDS.focusMode
      },
      {
        id: 'new-worktree',
        label: 'New worktree',
        centerAngle: FULL_TURN / 4,
        halfWidth: QUAD_HALF_WIDTH,
        bindingId: NAVIGATION_WHEEL_ACTION_IDS.newWorktree
      },
      {
        id: 'shortcuts',
        label: 'Shortcuts',
        centerAngle: FULL_TURN / 2,
        halfWidth: QUAD_HALF_WIDTH,
        bindingId: NAVIGATION_WHEEL_ACTION_IDS.shortcuts
      },
      {
        id: 'back-to-menu',
        label: 'Back to menu',
        centerAngle: (FULL_TURN * 3) / 4,
        halfWidth: QUAD_HALF_WIDTH,
        bindingId: NAVIGATION_WHEEL_ACTION_IDS.backToMenu
      }
    ]
  }),

  /**
   * The right wheel (`005` USE-R10): what you can do to the agent in front of you. Six choices on a
   * dial, so each is a sixth of a turn. The two that are easy to regret, stop and close, sit with a
   * harmless choice between them and never touch each other, and the two toggles flank the opener.
   * "Hand off" is not here: the mobile app has no agent-to-agent handoff to reuse, so it is out of
   * scope.
   */
  'agent-actions': loadPreset({
    presetId: 'agent-actions',
    label: 'Agent',
    wheel: 2,
    contractual: false,
    trial: { trialId: 'agent-actions', ...AGENT_ACTION_TRIAL },
    segments: [
      {
        id: 'launch',
        label: 'Launch agent',
        centerAngle: 0,
        halfWidth: SIX_HALF_WIDTH,
        bindingId: AGENT_WHEEL_ACTION_IDS.launch
      },
      {
        id: 'toggle-view',
        label: 'Chat / terminal',
        centerAngle: FULL_TURN / 6,
        halfWidth: SIX_HALF_WIDTH,
        bindingId: AGENT_WHEEL_ACTION_IDS.toggleView
      },
      {
        id: 'stop',
        label: 'Stop agent',
        centerAngle: (FULL_TURN * 2) / 6,
        halfWidth: SIX_HALF_WIDTH,
        bindingId: AGENT_WHEEL_ACTION_IDS.stop
      },
      {
        id: 'toggle-input',
        label: 'Show / hide input',
        centerAngle: (FULL_TURN * 3) / 6,
        halfWidth: SIX_HALF_WIDTH,
        bindingId: AGENT_WHEEL_ACTION_IDS.toggleInput
      },
      {
        id: 'close',
        label: 'Close agent',
        centerAngle: (FULL_TURN * 4) / 6,
        halfWidth: SIX_HALF_WIDTH,
        bindingId: AGENT_WHEEL_ACTION_IDS.close
      },
      {
        id: 'keyboard',
        label: 'Keyboard',
        centerAngle: (FULL_TURN * 5) / 6,
        halfWidth: SIX_HALF_WIDTH,
        bindingId: AGENT_WHEEL_ACTION_IDS.keyboard
      }
    ]
  }),

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
