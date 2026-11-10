import { createElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import { Hintify, hintGlyphFits } from './Hintify'

vi.mock('react-native', () => ({ Text: 'Text', View: 'View' }))
vi.mock('../theme/deck-theme', () => ({
  useDeckTheme: () => ({
    color: { text1: 'text1', raised: 'raised' },
    space: { xs: 4, sm: 8 },
    radius: { pill: 999 },
    text: { meta: 12 }
  })
}))

function render(element: ReturnType<typeof createElement>): ReactTestRenderer {
  let renderer: ReactTestRenderer | null = null
  act(() => {
    renderer = create(element)
  })
  if (renderer === null) {
    throw new Error('renderer did not mount')
  }
  return renderer
}

describe('hintify', () => {
  it('shows the glyph on the focused element', () => {
    const renderer = render(
      createElement(Hintify, { glyph: 'A', focused: true, width: 200, height: 48 }, 'Row')
    )
    expect(renderer.root.findAllByType('Text' as never)).toHaveLength(1)
  })

  it('shows nothing on an unfocused element', () => {
    const renderer = render(
      createElement(Hintify, { glyph: 'A', focused: false, width: 200, height: 48 }, 'Row')
    )
    expect(renderer.root.findAllByType('Text' as never)).toHaveLength(0)
  })

  it('routes the glyph to the strip when the element is too small to hold it', () => {
    expect(hintGlyphFits(80, 48)).toBe(false)
    const renderer = render(
      createElement(Hintify, { glyph: 'A', focused: true, width: 80, height: 20 }, 'Row')
    )
    expect(renderer.root.findAllByType('Text' as never)).toHaveLength(0)
  })
})
