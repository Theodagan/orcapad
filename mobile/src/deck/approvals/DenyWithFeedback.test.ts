import { describe, expect, it } from 'vitest'
import { acceptsDenyFeedback } from './deny-feedback'

const options = [{ label: 'Deny', send: '2' }]

describe('deny with feedback availability', () => {
  it('offers feedback for a plan review', () => {
    expect(
      acceptsDenyFeedback({
        title: 'Review plan',
        subject: { kind: 'plan', text: 'Do the work' },
        options
      })
    ).toBe(true)
  })

  it('omits feedback for an ordinary approval', () => {
    expect(acceptsDenyFeedback({ title: 'Allow writes?', options })).toBe(false)
  })
})
