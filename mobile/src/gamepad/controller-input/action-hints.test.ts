import { describe, expect, it } from 'vitest'
import { actionHintsFor } from './action-hints'
import type { ControllerIntentKind } from './controller-intent'

const accepting = (...kinds: ControllerIntentKind[]): ReadonlySet<ControllerIntentKind> =>
  new Set(kinds)

describe('action hints', () => {
  it('shows nothing for a surface that answers for nothing', () => {
    expect(actionHintsFor(accepting())).toEqual([])
  })

  it('names the control for each intent the surface accepts', () => {
    const hints = actionHintsFor(accepting('confirm', 'back'))

    expect(hints.map((hint) => hint.control)).toEqual(['A', 'B'])
  })

  // The whole point of deriving: a hint can only exist where the binding does.
  it('never invents a hint for an intent nothing accepts', () => {
    const hints = actionHintsFor(accepting('confirm'))

    expect(hints.map((hint) => hint.control)).toEqual(['A'])
  })

  it('lets a surface say what the action means there', () => {
    const hints = actionHintsFor(accepting('confirm'), { confirm: 'Open workspace' })

    expect(hints[0]).toEqual({ control: 'A', label: 'Open workspace' })
  })

  it('falls back to the contract’s own wording', () => {
    const [hint] = actionHintsFor(accepting('confirm'))

    expect(hint?.label.length).toBeGreaterThan(0)
  })

  // The D-pad is contract as of 004 but is not in the PRD table, so it is added explicitly.
  it('includes navigation the PRD table does not list', () => {
    const hints = actionHintsFor(accepting('move-selection', 'move-horizontal'))

    expect(hints.map((hint) => hint.control)).toEqual(['D-pad ↑↓', 'D-pad ←→'])
  })

  /**
   * A bar that reshuffles while you read it is worse than one that is missing. Growing the
   * capability set may insert hints — the PRD table lists triggers before face buttons — but it
   * must never reorder the ones already there relative to each other.
   */
  it('keeps hints in the same relative order as capabilities grow', () => {
    const fewer = actionHintsFor(accepting('confirm', 'back')).map((hint) => hint.control)
    const more = actionHintsFor(accepting('confirm', 'back', 'stop', 'scroll')).map(
      (hint) => hint.control
    )

    expect(more.filter((control) => fewer.includes(control))).toEqual(fewer)
  })

  it('shows a chorded control as the chord', () => {
    const hints = actionHintsFor(accepting('cycle-workspace'))

    expect(hints.every((hint) => hint.control.includes('+'))).toBe(true)
  })
})
