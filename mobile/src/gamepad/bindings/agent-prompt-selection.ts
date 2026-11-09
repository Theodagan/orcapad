/**
 * Moving a cursor through an agent's options, so `A` has something to accept.
 *
 * `003` BIND-T4 refused to answer an ask or a question because their options are peers with no
 * default, and picking one for the user could answer "Delete everything?" with whatever the agent
 * listed first. That refusal was right and it still stands. What `004` changes is that there is
 * now a selection to accept: the user moves to an option and commits it, which is what a person
 * does with a thumb.
 *
 * The cursor lives in the card, because the card owns its selection state. This is only the
 * arithmetic, kept pure so the clamping is testable without a chat on screen.
 */

/** Clamped, not wrapped — the same choice the lists make, for the same reason. */
export function movePromptCursor(
  cursor: number,
  optionCount: number,
  direction: 'up' | 'down'
): number {
  if (optionCount <= 0) {
    return 0
  }
  const next = direction === 'down' ? cursor + 1 : cursor - 1
  return Math.min(Math.max(next, 0), optionCount - 1)
}

/**
 * Where the cursor should sit when the card moves to another question. Following the existing
 * selection rather than resetting to the top: the user is reviewing an answer they already gave,
 * and sending them back to the first option would hide it.
 */
export function cursorForQuestion(selectedIndices: readonly number[]): number {
  const first = [...selectedIndices].sort((a, b) => a - b)[0]
  return first === undefined || first < 0 ? 0 : first
}
