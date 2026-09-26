import type { ControllerIntent, ControllerIntentKind } from '../controller-input/controller-intent'

/** Where dictated text lands. `003` supplies the focused surface's existing transcript sink. */
export type DictationTextTarget = {
  readonly onTranscript: (text: string) => void
}

/**
 * One mounted surface's controller edge. It references identity its surface already owns and
 * keeps no session or workspace record of its own (`000/tech.md` §2).
 */
export type FocusTarget = {
  readonly id: string
  /**
   * Which target wins when several are mounted. Higher is more specific: a prompt card above the
   * chat view that contains it, the chat view above the session route around that.
   *
   * Declared rather than inferred from mount order, because React runs child effects before
   * parent ones — so the outermost surface registers last, and "newest wins" would hand focus to
   * exactly the wrong one. Ordering was load-bearing and invisible; this is neither.
   */
  readonly priority?: number
  readonly accepts: ReadonlySet<ControllerIntentKind>
  readonly handle: (intent: ControllerIntent) => void
  readonly textTarget?: DictationTextTarget
}
