import type { ControllerIntent, IntentLabels } from '../controller-input/controller-intent'
import type { FocusZone } from './focus-zones'

/**
 * One mounted surface's controller edge. It references identity its surface already owns and
 * keeps no session or workspace record of its own (`000/tech.md` §2).
 */
export type FocusTarget = {
  readonly id: string
  /**
   * Which target answers first when several accept the same intent. Higher is more specific: a
   * prompt card above the chat view that contains it, the chat view above the session route
   * around that. See `FOCUS_PRIORITY`.
   */
  readonly priority?: number
  /** Absent means the screen as a whole: heard from every zone, after the focused zone has had its turn. */
  readonly zone?: FocusZone
  readonly accepts: ReadonlySet<ControllerIntent['kind']>
  readonly handle: (intent: ControllerIntent) => void
  /** Hint wording for the intents above; the hint bar falls back to a generic word. */
  readonly labels?: IntentLabels
}
