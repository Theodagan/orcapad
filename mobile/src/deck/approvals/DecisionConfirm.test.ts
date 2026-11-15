import { describe, expect, it } from 'vitest'
import { canConfirmDecision, type DecisionConfirmation } from './decision-confirmation'

const confirmation: DecisionConfirmation = {
  requestId: 'request-1',
  request: { title: 'Allow writes?', options: [{ label: 'Allow', send: '1' }] },
  option: { label: 'Allow', send: '1' }
}

describe('request-bound decision confirmation', () => {
  it('confirms only the request the dialog named', () => {
    expect(canConfirmDecision(confirmation, 'request-1', 'confirm')).toBe(true)
    expect(canConfirmDecision(confirmation, 'request-2', 'confirm')).toBe(false)
  })

  it('does not decide from a trigger alone', () => {
    expect(canConfirmDecision(confirmation, 'request-1', 'trigger')).toBe(false)
  })
})
