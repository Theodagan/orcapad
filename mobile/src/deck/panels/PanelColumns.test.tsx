import { createElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { Text, View } from 'react-native'
import { describe, expect, it, vi } from 'vitest'
import { PanelColumns } from './PanelColumns'

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
    color: { base: 'base', panel: 'panel', hair: 'hair', text1: 't1', text3: 't3' },
    space: { xs: 4, sm: 8 },
    text: { body: 14, meta: 12 }
  })
}))

function render(screen: Parameters<typeof PanelColumns>[0]['screen'], windowWidth: number) {
  let renderer: ReactTestRenderer | null = null
  act(() => {
    renderer = create(
      createElement(PanelColumns, { screen, windowWidth }, createElement(View, { testID: 'main' }))
    )
  })
  if (renderer === null) {
    throw new Error('renderer did not mount')
  }
  return renderer
}

function copyOf(renderer: ReactTestRenderer): string[] {
  return renderer.root.findAllByType(Text).map((node) => String(node.props.children))
}

/** Panel columns are as wide as `PANEL_WIDTH`; the main column takes whatever is left. */
function columnCount(renderer: ReactTestRenderer): number {
  return renderer.root.findAllByType(View).filter((node) => {
    const style: unknown = node.props.style
    return typeof style === 'object' && style !== null && 'width' in style && style.width === 280
  }).length
}

describe('panel columns on screen', () => {
  it('draws both columns at landscape width and none at portrait width', () => {
    expect(columnCount(render('session', 1200))).toBe(2)
    expect(columnCount(render('session', 480))).toBe(0)
  })

  it('draws the left panels and the session panels for a session screen', () => {
    const copy = copyOf(render('session', 1200))
    expect(copy).toContain('deck.panel.quickMenu')
    expect(copy).toContain('deck.panel.sessionLog')
  })

  it('shows a disabled panel with its reason', () => {
    expect(copyOf(render('ports', 1200))).toContain('This desktop does not provide it.')
  })
})
