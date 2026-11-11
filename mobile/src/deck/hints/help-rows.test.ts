import { describe, expect, it } from 'vitest'
import { bindingsForScope } from '../controller/chord-table'
import { helpRows } from './help-rows'

const translate = (key: string, fallback?: string): string => fallback ?? key

describe('deck help diagram', () => {
  it('draws the bare and the Y rows of a control the table rebinds', () => {
    const rows = helpRows(translate, 'root')
    // The stub translator answers with the key, so a row shows the key it resolved.
    expect(rows.find((row) => row.control === 'L1')?.label).toBe('L1: deck.chord.itemPrevious')
    expect(rows.find((row) => row.control === 'Y + L1')?.label).toBe(
      'Y + L1: deck.chord.focusLeftPanel / deck.chord.toggleLeftPanel / deck.chord.toggleBothPanels'
    )
  })

  it('draws only the controls the table binds on that screen', () => {
    const controls = helpRows(translate, 'root').map((row) => row.control)
    expect(controls).toContain('START')
    expect(controls).not.toContain('L3')
    // The key wheels exist only where the table gives the stick pair a meaning.
    expect(helpRows(translate, 'tui').map((row) => row.control)).toContain('L3')
  })

  it('takes its rows from the table it is given', () => {
    const renamed = bindingsForScope('root').map((binding) =>
      binding.intent === 'item-previous' ? { ...binding, labelKey: 'deck.chord.renamed' } : binding
    )
    expect(helpRows(translate, 'root', renamed).find((row) => row.control === 'L1')?.label).toBe(
      'L1: deck.chord.renamed'
    )
  })
})
