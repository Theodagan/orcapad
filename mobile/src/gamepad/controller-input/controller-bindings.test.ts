import { describe, expect, it } from 'vitest'
import { CHORD_BUTTON, PRD_CONTROLLER_BINDINGS } from './controller-bindings'

/**
 * CTRL-AC1: this suite covers the accepted mapping and must never reach the provisional D-pad
 * set. The boundary ratchet fails a test that names both.
 */

describe('the accepted PRD mapping', () => {
  it('binds every row of CTRL-R1 and nothing else', () => {
    expect(PRD_CONTROLLER_BINDINGS.map((binding) => binding.label)).toEqual([
      'L2',
      'R2',
      'LB',
      'RB',
      'Y+LB',
      'Y+RB',
      'Left stick',
      'Right stick',
      'A',
      'B',
      'X',
      'R3',
      'L3'
    ])
  })

  it('scrolls on the triggers, up on the left', () => {
    const triggers = PRD_CONTROLLER_BINDINGS.filter((binding) => binding.kind === 'trigger')

    expect(triggers).toEqual([
      { kind: 'trigger', axis: 'l2', intent: 'scroll', direction: 'up', label: 'L2' },
      { kind: 'trigger', axis: 'r2', intent: 'scroll', direction: 'down', label: 'R2' }
    ])
  })

  it('drives wheel 1 from the left stick and wheel 2 from the right', () => {
    const sticks = PRD_CONTROLLER_BINDINGS.filter((binding) => binding.kind === 'stick')

    expect(sticks.map((binding) => [binding.wheel, binding.axes])).toEqual([
      [1, ['left-x', 'left-y']],
      [2, ['right-x', 'right-y']]
    ])
  })

  it('puts the shoulders on tabs unmodified and on workspaces under the chord', () => {
    const shoulders = PRD_CONTROLLER_BINDINGS.filter(
      (binding) => binding.kind === 'button' && (binding.button === 'lb' || binding.button === 'rb')
    )

    expect(
      shoulders.map((binding) =>
        binding.kind === 'button'
          ? [binding.label, binding.chord, binding.intent, binding.direction]
          : null
      )
    ).toEqual([
      ['LB', null, 'cycle-tab', 'previous'],
      ['RB', null, 'cycle-tab', 'next'],
      ['Y+LB', CHORD_BUTTON, 'cycle-workspace', 'previous'],
      ['Y+RB', CHORD_BUTTON, 'cycle-workspace', 'next']
    ])
  })

  it('leaves L3 unassigned as a stated contract rather than an omission', () => {
    expect(PRD_CONTROLLER_BINDINGS.filter((binding) => binding.kind === 'unassigned')).toEqual([
      { kind: 'unassigned', button: 'l3', label: 'L3' }
    ])
  })

  it('never binds the chord button to an action of its own', () => {
    const chordAsAction = PRD_CONTROLLER_BINDINGS.some(
      (binding) => binding.kind === 'button' && binding.button === CHORD_BUTTON
    )

    expect(chordAsAction).toBe(false)
  })
})
