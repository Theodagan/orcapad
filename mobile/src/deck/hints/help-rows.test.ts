import { describe, expect, it } from 'vitest'
import { bindingsForScope, type DeckBinding } from '../controller/chord-table'
import { helpRows } from './help-rows'

const translate = (key: string, fallback?: string): string => fallback ?? key

describe('deck help diagram', () => {
  it('labels each control from the live chord table', () => {
    const rows = helpRows(translate, 'root')
    // The stub translator answers with the key, so the row shows the key it resolved.
    expect(rows.find((row) => row.control === 'a')?.label).toBe('A: deck.chord.confirm')
    expect(rows.find((row) => row.control === 'l1')?.label).toBe(
      'L1: deck.chord.focusPreviousPanel'
    )
    expect(rows.find((row) => row.control === 'start')?.label).toBe('START: deck.chord.help')
  })

  it('shows the modifier on the controls the Y layer rebinds', () => {
    const changed: readonly DeckBinding[] = bindingsForScope('root').map((binding) =>
      binding.chord.control === 'l1' ? { ...binding, labelKey: 'deck.chord.renamed' } : binding
    )
    expect(helpRows(translate, 'root', changed).find((row) => row.control === 'l1')?.label).toBe(
      'L1: deck.chord.renamed'
    )
  })

  it('omits controls the table leaves free on this screen', () => {
    const controls = helpRows(translate, 'wheel').map((row) => row.control)
    expect(controls).toContain('a')
    expect(controls).not.toContain('l3')
  })
})
