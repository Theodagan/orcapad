import { describe, expect, it } from 'vitest'
import {
  clampCaret,
  deleteWordBefore,
  insertDictation,
  moveCaretHorizontally,
  moveCaretVertically
} from './composer-text-editing'

describe('moving the caret sideways', () => {
  it('steps one character and stops at either end', () => {
    expect(moveCaretHorizontally('abc', 1, 'right')).toBe(2)
    expect(moveCaretHorizontally('abc', 1, 'left')).toBe(0)
    expect(moveCaretHorizontally('abc', 0, 'left')).toBe(0)
    expect(moveCaretHorizontally('abc', 3, 'right')).toBe(3)
  })

  it('steps over an emoji whole rather than into the middle of it', () => {
    const text = 'a😀b'
    expect(moveCaretHorizontally(text, 1, 'right')).toBe(3)
    expect(moveCaretHorizontally(text, 3, 'left')).toBe(1)
  })

  it('treats a caret past the end as the end', () => {
    expect(clampCaret('abc', 99)).toBe(3)
    expect(moveCaretHorizontally('abc', 99, 'left')).toBe(2)
  })
})

describe('moving the caret between lines', () => {
  const text = 'first\nsecond line\nx'

  it('keeps its column, shortened to a line that is not long enough', () => {
    expect(moveCaretVertically(text, 9, 'up')).toBe(3) // 'sec|ond' -> 'fir|st'
    expect(moveCaretVertically(text, 14, 'up')).toBe(5) // past the end of 'first'
    expect(moveCaretVertically(text, 3, 'down')).toBe(9)
    expect(moveCaretVertically(text, 14, 'down')).toBe(text.length)
  })

  it('goes to the start from the first line and the end from the last', () => {
    expect(moveCaretVertically(text, 3, 'up')).toBe(0)
    expect(moveCaretVertically(text, text.length, 'down')).toBe(text.length)
    expect(moveCaretVertically('one wrapped paragraph', 8, 'up')).toBe(0)
    expect(moveCaretVertically('one wrapped paragraph', 8, 'down')).toBe(21)
  })

  it('walks onto an empty line', () => {
    expect(moveCaretVertically('a\n\nb', 1, 'down')).toBe(2)
    expect(moveCaretVertically('a\n\nb', 3, 'up')).toBe(2)
  })
})

describe('deleting a word', () => {
  it('drops the word before the caret and puts the caret where it began', () => {
    expect(deleteWordBefore('send it now', 11)).toEqual({ text: 'send it ', caret: 8 })
  })

  it('drops the spaces first, then the word behind them', () => {
    expect(deleteWordBefore('send it   ', 10)).toEqual({ text: 'send ', caret: 5 })
  })

  it('works from the middle of a word and leaves what follows alone', () => {
    expect(deleteWordBefore('hello world', 8)).toEqual({ text: 'hello rld', caret: 6 })
    expect(deleteWordBefore('one two three', 7)).toEqual({ text: 'one  three', caret: 4 })
  })

  it('crosses a line break the way a space is crossed', () => {
    expect(deleteWordBefore('one\ntwo', 7)).toEqual({ text: 'one\n', caret: 4 })
  })

  it('has nothing to do at the start of the draft', () => {
    expect(deleteWordBefore('hello', 0)).toBeNull()
    expect(deleteWordBefore('', 0)).toBeNull()
  })
})

describe('setting a dictated phrase into the draft', () => {
  it('replaces an empty draft', () => {
    expect(insertDictation('', 0, ' hello there ')).toEqual({ text: 'hello there', caret: 11 })
  })

  it('appends after the last word with one space, as dictation always has', () => {
    expect(insertDictation('fix the bug', 11, 'in the parser')).toEqual({
      text: 'fix the bug in the parser',
      caret: 25
    })
  })

  it('lands in the middle, spaced from both neighbours', () => {
    expect(insertDictation('fix bug', 4, 'the')).toEqual({ text: 'fix the bug', caret: 8 })
    expect(insertDictation('fix  bug', 4, 'the')).toEqual({ text: 'fix the bug', caret: 7 })
  })

  it('adds no space where one is already', () => {
    expect(insertDictation('hello ', 6, 'world')).toEqual({ text: 'hello world', caret: 11 })
    expect(insertDictation('line\n', 5, 'two')).toEqual({ text: 'line\ntwo', caret: 8 })
  })

  it('ignores a transcript with nothing in it', () => {
    expect(insertDictation('keep', 2, '   ')).toEqual({ text: 'keep', caret: 2 })
  })
})

describe('the cell a block caret covers', () => {
  it('is one unit, two for an emoji, and none at the end', async () => {
    const { caretCellLength } = await import('./composer-text-editing')
    expect(caretCellLength('abc', 1)).toBe(1)
    expect(caretCellLength('a😀', 1)).toBe(2)
    expect(caretCellLength('abc', 3)).toBe(0)
  })
})
