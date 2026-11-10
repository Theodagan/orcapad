import { createElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { Text } from 'react-native'
import { describe, expect, it, vi } from 'vitest'
import { Hintify, hintGlyphFits } from './Hintify'

vi.mock('react-native', async () => {
  const { createElement: element } = await import('react')
  const host = (type: string) => (props: Record<string, unknown>) => element(type, props)
  return { Text: host('Text'), View: host('View') }
})
vi.mock('../theme/deck-theme', () => ({
  useDeckTheme: () => ({
    color: { text1: 'text1', raised: 'raised' },
    space: { xs: 4, sm: 8 },
    radius: { pill: 999 },
    text: { meta: 12 }
  })
}))

function render(glyph: string, focused: boolean, width: number, height: number): ReactTestRenderer {
  let renderer: ReactTestRenderer | null = null
  act(() => {
    renderer = create(createElement(Hintify, { glyph, focused, width, height }, 'Row'))
  })
  if (renderer === null) {
    throw new Error('renderer did not mount')
  }
  return renderer
}

describe('hintify', () => {
  it('shows the glyph on the focused element', () => {
    expect(render('A', true, 200, 48).root.findAllByType(Text)).toHaveLength(1)
  })

  it('shows nothing on an unfocused element', () => {
    expect(render('A', false, 200, 48).root.findAllByType(Text)).toHaveLength(0)
  })

  it('routes the glyph to the strip when the element is too small to hold it', () => {
    expect(hintGlyphFits(80, 48)).toBe(false)
    expect(render('A', true, 80, 20).root.findAllByType(Text)).toHaveLength(0)
  })
})
