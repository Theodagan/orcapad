import { describe, expect, it, vi } from 'vitest'
import { promptToggleFor } from './native-chat-prompt-toggle'

describe('promptToggleFor', () => {
  it('expands a collapsed prompt', () => {
    const expand = vi.fn()
    expect(promptToggleFor({ collapsedPrompt: { title: 't', expand } })).toBe(expand)
  })

  it('collapses a shown ask, or a shown permission or question card', () => {
    const onCollapseAsk = vi.fn()
    const onCollapsePrompt = vi.fn()
    expect(promptToggleFor({ ask: { questions: [] }, onCollapseAsk, onCollapsePrompt })).toBe(
      onCollapseAsk
    )
    expect(promptToggleFor({ question: {}, onCollapsePrompt })).toBe(onCollapsePrompt)
  })

  it('offers nothing with no prompt on screen', () => {
    expect(promptToggleFor({ onCollapsePrompt: vi.fn() })).toBeUndefined()
  })
})
