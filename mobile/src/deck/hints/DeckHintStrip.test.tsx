import { createElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import { DeckHintStrip, visibleHintCount } from './DeckHintStrip'

let modifierHeld = false
vi.mock('react-native', () => ({ Text: 'Text', View: 'View' }))
vi.mock('../../i18n/use-mobile-translation', () => ({
  useMobileTranslation: () => (_key: string, fallback?: string) => fallback ?? _key
}))
vi.mock('../theme/deck-theme', () => ({
  useDeckTheme: () => ({
    color: { text2: 'text2', raised: 'raised' },
    space: { xs: 4, sm: 8, md: 12 },
    radius: { pill: 999 },
    text: { meta: 12 }
  })
}))
vi.mock('../controller/use-deck-bindings', () => ({
  useDeckModifierHeld: () => modifierHeld
}))

function render(width: number): ReactTestRenderer {
  let renderer: ReactTestRenderer | null = null
  act(() => {
    renderer = create(createElement(DeckHintStrip, { scope: 'root', width }))
  })
  if (renderer === null) {
    throw new Error('renderer did not mount')
  }
  return renderer
}

describe('deck hint strip', () => {
  it('fits every chip inside the width it is given', () => {
    const renderer = render(640)
    const chips = renderer.root.findAll(
      (node) => (typeof node.props.children === 'function') === false && node.type === 'Text'
    )
    expect(chips.length).toBeGreaterThan(0)
    expect(chips.length).toBeLessThanOrEqual(visibleHintCount(99, 640))
  })

  it('drops the lowest-priority hints rather than overflowing', () => {
    expect(visibleHintCount(20, 640)).toBe(6)
    expect(visibleHintCount(20, 200)).toBe(1)
    expect(visibleHintCount(3, 20)).toBe(0)
  })

  it('swaps to the Y layer while the modifier is held', () => {
    modifierHeld = false
    const plain = render(640).root.findAllByType('Text' as never).length
    modifierHeld = true
    const withModifier = render(640).root.findAllByType('Text' as never).length
    modifierHeld = false
    expect(withModifier).toBeLessThan(plain)
    expect(withModifier).toBe(3)
  })
})
