/**
 * Editing a draft by caret alone, for a pad with no keyboard (`005` round 2). Pure: text and caret
 * in, text and caret out, so every rule has a test and the composer only has to apply the result.
 *
 * The caret is an offset between two UTF-16 units, as a text input reports it. It never lands
 * inside a surrogate pair, because a half emoji is not something anyone can delete or type after.
 */

export type CaretEdit = { readonly text: string; readonly caret: number }

const isHighSurrogate = (code: number): boolean => code >= 0xd800 && code <= 0xdbff
const isLowSurrogate = (code: number): boolean => code >= 0xdc00 && code <= 0xdfff

export function clampCaret(text: string, caret: number): number {
  return Math.min(Math.max(Math.trunc(caret), 0), text.length)
}

/** How many UTF-16 units the caret would cover if it were drawn as a block: none at the end. */
export function caretCellLength(text: string, caret: number): number {
  const at = clampCaret(text, caret)
  if (at >= text.length) {
    return 0
  }
  return isHighSurrogate(text.charCodeAt(at)) && isLowSurrogate(text.charCodeAt(at + 1)) ? 2 : 1
}

export function moveCaretHorizontally(
  text: string,
  caret: number,
  direction: 'left' | 'right'
): number {
  const at = clampCaret(text, caret)
  if (direction === 'left') {
    if (at === 0) {
      return 0
    }
    return isLowSurrogate(text.charCodeAt(at - 1)) && isHighSurrogate(text.charCodeAt(at - 2))
      ? at - 2
      : at - 1
  }
  if (at >= text.length) {
    return text.length
  }
  return isHighSurrogate(text.charCodeAt(at)) && isLowSurrogate(text.charCodeAt(at + 1))
    ? at + 2
    : at + 1
}

/**
 * Up and down by line, where a line is what a newline ends. A draft that is one long wrapped
 * paragraph has one line, so up goes to its start and down to its end: the pad cannot see how the
 * screen wrapped it, and "the start" and "the end" are the two places worth getting to.
 */
export function moveCaretVertically(text: string, caret: number, direction: 'up' | 'down'): number {
  const at = clampCaret(text, caret)
  const lineStart = text.lastIndexOf('\n', at - 1) + 1
  const column = at - lineStart
  if (direction === 'up') {
    if (lineStart === 0) {
      return 0
    }
    const previousStart = text.lastIndexOf('\n', lineStart - 2) + 1
    return previousStart + Math.min(column, lineStart - 1 - previousStart)
  }
  const lineEnd = text.indexOf('\n', at)
  if (lineEnd === -1) {
    return text.length
  }
  const nextStart = lineEnd + 1
  const nextEnd = text.indexOf('\n', nextStart)
  const nextLength = (nextEnd === -1 ? text.length : nextEnd) - nextStart
  return nextStart + Math.min(column, nextLength)
}

/**
 * What Ctrl+W does in a shell and in the agent prompts a terminal shows: drop the spaces before
 * the caret, then the word before them. Null when there is nothing before the caret to drop.
 */
export function deleteWordBefore(text: string, caret: number): CaretEdit | null {
  const at = clampCaret(text, caret)
  let start = at
  while (start > 0 && /\s/.test(text.charAt(start - 1))) {
    start -= 1
  }
  while (start > 0 && !/\s/.test(text.charAt(start - 1))) {
    start -= 1
  }
  if (start === at) {
    return null
  }
  return { text: text.slice(0, start) + text.slice(at), caret: start }
}

/**
 * A dictated phrase set into the draft at the caret, spaced from whatever it lands against so the
 * words do not run together, with the caret left after it for the next phrase.
 */
export function insertDictation(text: string, caret: number, transcript: string): CaretEdit {
  const words = transcript.trim()
  const at = clampCaret(text, caret)
  if (words.length === 0) {
    return { text, caret: at }
  }
  const before = text.slice(0, at)
  const after = text.slice(at)
  const lead = before.length > 0 && !/\s$/.test(before) ? ' ' : ''
  const trail = after.length > 0 && !/^\s/.test(after) ? ' ' : ''
  const inserted = `${lead}${words}${trail}`
  return { text: `${before}${inserted}${after}`, caret: at + inserted.length }
}
