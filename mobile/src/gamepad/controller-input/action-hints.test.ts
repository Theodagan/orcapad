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

  // The bar once read "A A  B B": the fallback was the control's own name.
  it('falls back to a word for what the button does, never to the control name', () => {
    const hints = actionHintsFor(
      accepting('confirm', 'back', 'switch-zone', 'toggle-dictation', 'scroll', 'cycle-tab')
    )

    expect(hints.map((hint) => hint.label)).toEqual([
      'Select',
      'Back',
      'Zone',
      'Dictate',
      'Scroll',
      'Tabs'
    ])
    for (const hint of hints) {
      expect(hint.label).not.toBe(hint.control)
    }
  })

  it('prints the shoulders and triggers as they are printed on the pad', () => {
    const hints = actionHintsFor(accepting('cycle-tab', 'scroll', 'cycle-workspace'))

    expect(hints.map((hint) => hint.control)).toEqual(['L2/R2', 'L1/R1', 'Y+L1/R1'])
  })

  it('shows Y as the dictation tap, and X as the zone switch', () => {
    const hints = actionHintsFor(accepting('toggle-dictation', 'switch-zone'))

    expect(hints).toEqual([
      { control: 'X', label: 'Zone' },
      { control: 'Y', label: 'Dictate' }
    ])
  })

  it('reads the D-pad as one hint when both axes mean the same, and as two when they differ', () => {
    expect(actionHintsFor(accepting('move-selection', 'move-horizontal'))).toEqual([
      { control: 'D-pad', label: 'Move' }
    ])
    expect(
      actionHintsFor(accepting('move-selection', 'move-horizontal'), {
        'move-selection': 'Up / down',
        'move-horizontal': 'Left / right'
      }).map((hint) => hint.control)
    ).toEqual(['D-pad ↑↓', 'D-pad ←→'])
    expect(actionHintsFor(accepting('move-horizontal')).map((hint) => hint.control)).toEqual([
      'D-pad ←→'
    ])
  })

  it('names the agent zone by what the buttons really do there', () => {
    const hints = actionHintsFor(
      accepting('confirm', 'back', 'move-selection', 'move-horizontal'),
      {
        confirm: 'Enter',
        back: 'Esc',
        'move-selection': 'Arrows',
        'move-horizontal': 'Arrows'
      }
    )

    expect(hints).toEqual([
      { control: 'A', label: 'Enter' },
      { control: 'B', label: 'Esc' },
      { control: 'D-pad', label: 'Arrows' }
    ])
  })

  /**
   * A bar that reshuffles while you read it is worse than one that is missing. Growing the
   * capability set may insert hints — the PRD table lists triggers before face buttons — but it
   * must never reorder the ones already there relative to each other.
   */
  it('keeps hints in the same relative order as capabilities grow', () => {
    const fewer = actionHintsFor(accepting('confirm', 'back')).map((hint) => hint.control)
    const more = actionHintsFor(accepting('confirm', 'back', 'switch-zone', 'scroll')).map(
      (hint) => hint.control
    )

    expect(more.filter((control) => fewer.includes(control))).toEqual(fewer)
  })

  it('shows a chorded control as the chord', () => {
    const hints = actionHintsFor(accepting('cycle-workspace'))

    expect(hints).toEqual([{ control: 'Y+L1/R1', label: 'Worktrees' }])
  })
})
