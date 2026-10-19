import { describe, expect, it } from 'vitest'
import { userMessageJumpTarget } from './native-chat-user-message-jump'

const rows = ['user', 'assistant', 'tool', 'user', 'assistant', 'user', 'assistant'].map(
  (role) => ({ role })
)

describe('userMessageJumpTarget', () => {
  it('finds the nearest user message above the top row', () => {
    expect(userMessageJumpTarget(rows, 5, 'previous')).toBe(3)
    expect(userMessageJumpTarget(rows, 4, 'previous')).toBe(3)
    expect(userMessageJumpTarget(rows, 0, 'previous')).toBeNull()
  })

  it('starts from the bottom when the view has not said where it is', () => {
    expect(userMessageJumpTarget(rows, rows.length, 'previous')).toBe(5)
  })

  it('finds the next one below, and the newest line past the last', () => {
    expect(userMessageJumpTarget(rows, 0, 'next')).toBe(3)
    expect(userMessageJumpTarget(rows, 3, 'next')).toBe(5)
    expect(userMessageJumpTarget(rows, 5, 'next')).toBe('tail')
  })
})
