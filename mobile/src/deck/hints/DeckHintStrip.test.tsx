import { createElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { Text } from 'react-native'
import { describe, expect, it, vi } from 'vitest'
import { DeckHintStrip, visibleHintCount } from './DeckHintStrip'

let modifierHeld = false

vi.mock('react-native', async () => {
  const { createElement: element } = await import('react')
  const host = (type: string) => (props: Record<string, unknown>) => element(type, props)
  return { Text: host('Text'), View: host('View') }
})
vi.mock('../../i18n/use-mobile-translation', () => ({
  useMobileTranslation: () => (key: string, fallback?: string) => fallback ?? key
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

function chips(renderer: ReactTestRenderer): number {
  return renderer.root.findAllByType(Text).length
}

describe('deck hint strip', () => {
  it('fits every chip inside the width it is given', () => {
    const shown = chips(render(640))
    expect(shown).toBeGreaterThan(0)
    expect(shown).toBeLessThanOrEqual(visibleHintCount(99, 640))
  })

  it('drops the lowest-priority hints rather than overflowing', () => {
    expect(visibleHintCount(20, 640)).toBe(6)
    expect(visibleHintCount(20, 200)).toBe(1)
    expect(visibleHintCount(3, 20)).toBe(0)
  })

  it('swaps to the Y layer while the modifier is held', () => {
    modifierHeld = false
    const plain = chips(render(640))
    modifierHeld = true
    const withModifier = chips(render(640))
    modifierHeld = false
    expect(withModifier).toBeLessThan(plain)
    expect(withModifier).toBe(3)
  })
})
