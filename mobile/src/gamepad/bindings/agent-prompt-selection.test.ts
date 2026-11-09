import { describe, expect, it } from 'vitest'
import { cursorForQuestion, movePromptCursor } from './agent-prompt-selection'

describe('the prompt cursor', () => {
  it('moves one option at a time', () => {
    expect(movePromptCursor(0, 3, 'down')).toBe(1)
    expect(movePromptCursor(1, 3, 'up')).toBe(0)
  })

  it('clamps at both ends rather than wrapping', () => {
    expect(movePromptCursor(2, 3, 'down')).toBe(2)
    expect(movePromptCursor(0, 3, 'up')).toBe(0)
  })

  it('has nowhere to go with no options', () => {
    expect(movePromptCursor(0, 0, 'down')).toBe(0)
  })

  // Reviewing an answer already given: sending the cursor back to the top would hide it.
  it('follows the answer already given when a question comes back', () => {
    expect(cursorForQuestion([2])).toBe(2)
    expect(cursorForQuestion([3, 1])).toBe(1)
  })

  it('starts at the top when nothing is chosen', () => {
    expect(cursorForQuestion([])).toBe(0)
  })

  // A free-text choice is stored as -1 by the card; it is not a row the cursor can sit on.
  it('ignores a non-option selection', () => {
    expect(cursorForQuestion([-1])).toBe(0)
  })
})
