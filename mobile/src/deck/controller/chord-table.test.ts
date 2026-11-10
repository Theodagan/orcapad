import { describe, expect, it } from 'vitest'
import {
  bindingFor,
  bindingsForScope,
  DECK_CHORDS,
  isTimedOrChorded,
  modifierBindingsForScope,
  type DeckChordKind,
  type DeckControl
} from './chord-table'

function chordKey(control: DeckControl, kind: DeckChordKind, withControl?: DeckControl): string {
  return `${control}|${kind}|${withControl ?? ''}`
}

describe('deck chord table', () => {
  it('has no duplicate chord', () => {
    const keys = DECK_CHORDS.map((binding) =>
      chordKey(binding.chord.control, binding.chord.kind, binding.chord.with)
    )
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('labels every intent and names a touch alternative for every timed or chorded one', () => {
    for (const binding of DECK_CHORDS) {
      expect(binding.labelKey).toMatch(/^deck\.chord\./)
      if (isTimedOrChorded(binding)) {
        expect(binding.touchAlternative).toMatch(/^deck\.touch\./)
      }
    }
  })

  it('keeps Y as a modifier only: no binding fires on a Y tap', () => {
    expect(DECK_CHORDS.filter((binding) => binding.chord.control === 'y')).toEqual([])
  })

  it('leaves B as dismiss at root, with Y+B the only back', () => {
    expect(bindingFor('b', 'tap')?.intent).toBe('dismiss')
    expect(bindingFor('b', 'chord', { withModifier: true })?.intent).toBe('back')
  })

  it('never binds a trigger to anything but scrolling outside the Y layer', () => {
    const plainTriggers = DECK_CHORDS.filter(
      (binding) => binding.chord.control === 'l2' || binding.chord.control === 'r2'
    ).filter((binding) => binding.chord.with === undefined)
    expect(plainTriggers.map((binding) => binding.intent)).toEqual(['scroll-up', 'scroll-down'])
  })

  it('leaves L3 and R3 inert on their own', () => {
    expect(bindingFor('l3', 'tap')).toBeUndefined()
    expect(bindingFor('r3', 'tap')).toBeUndefined()
    expect(bindingFor('l3', 'chord', { withControl: 'r3' })?.intent).toBe('open-wheels')
  })

  it('shows the Y layer only where a modifier binding exists', () => {
    expect(modifierBindingsForScope('root').map((binding) => binding.intent)).toEqual([
      'back',
      'toggle-panel',
      'toggle-panel'
    ])
    // A wheel keeps Y+B: stepping back out of it is the same gesture as anywhere else.
    expect(modifierBindingsForScope('wheel').map((binding) => binding.intent)).toEqual([
      'back',
      'toggle-panel',
      'toggle-panel'
    ])
  })

  it('adds the session and collection layers on top of root', () => {
    const intents = bindingsForScope('session').map((binding) => binding.intent)
    expect(intents).toContain('toggle-dictation')
    expect(intents).toContain('open-wheels')
    expect(intents).toContain('dismiss')
    // A wheel is still the deck: confirm, dismiss, back and the panel chords stay reachable.
    const wheelIntents = bindingsForScope('wheel').map((binding) => binding.intent)
    expect(wheelIntents).toContain('confirm')
    expect(wheelIntents).toContain('dismiss')
    expect(wheelIntents).toContain('back')
    expect(wheelIntents).not.toContain('stage-file')
  })
})
