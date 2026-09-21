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
  readonly accepts: ReadonlySet<ControllerIntentKind>
  readonly handle: (intent: ControllerIntent) => void
  readonly textTarget?: DictationTextTarget
}
