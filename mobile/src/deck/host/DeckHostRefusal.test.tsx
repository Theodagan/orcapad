import { createElement, type ReactNode } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { Pressable, Text } from 'react-native'
import { describe, expect, it, vi } from 'vitest'
import { DeckHostRefusal } from './DeckHostRefusal'

vi.mock('react-native', async () => {
  const { createElement: element } = await import('react')
  const host = (type: string) => (props: Record<string, unknown>) => element(type, props)
  return { Pressable: host('Pressable'), Text: host('Text'), View: host('View') }
})
vi.mock('../../i18n/use-mobile-translation', () => ({
  useMobileTranslation: () => (key: string, fallback?: string) => fallback ?? key
}))
vi.mock('../theme/deck-theme', () => ({
  useDeckTheme: () => ({
    color: { base: 'base', text1: 'text1', text2: 'text2', accent: 'accent', onAccent: 'onAccent' },
    space: { xs: 4, md: 12, xl: 24 },
    radius: { control: 12 },
    text: { pageTitle: 22, body: 14 }
  })
}))

/** Stands in for a deck screen: the refusal renders it only when the verdict is compatible. */
function Screen(): ReactNode {
  return createElement('Screen', null)
}

function render(verdict: Parameters<typeof DeckHostRefusal>[0]['verdict']): ReactTestRenderer {
  let renderer: ReactTestRenderer | null = null
  act(() => {
    renderer = create(
      createElement(DeckHostRefusal, { verdict, onUpdate: () => {} }, createElement(Screen, null))
    )
  })
  if (renderer === null) {
    throw new Error('renderer did not mount')
  }
  return renderer
}

function texts(renderer: ReactTestRenderer): string[] {
  return renderer.root.findAllByType(Text).map((node) => String(node.props.children))
}

describe('deck host refusal', () => {
  it('shows the plain reason and an Update control when the desktop refuses this client', () => {
    const renderer = render({ kind: 'blocked', reason: 'mobile-too-old', desktopVersion: 3 })
    expect(texts(renderer)).toEqual([
      'This desktop cannot talk to this app',
      'This desktop needs a newer Orcapad. Update the app, then try this host again.',
      'Update Orcapad'
    ])
    expect(renderer.root.findAllByType(Pressable)).toHaveLength(1)
    expect(renderer.root.findAllByType(Screen)).toHaveLength(0)
  })

  it('offers the desktop-side remedy when the desktop itself is too old', () => {
    const renderer = render({ kind: 'blocked', reason: 'desktop-too-old', desktopVersion: 1 })
    expect(texts(renderer)).toContain(
      'This desktop is too old for this build of Orcapad. Update Orca on your computer, then try again.'
    )
  })

  it('renders the screen when the verdict is compatible', () => {
    const renderer = render({ kind: 'ok' })
    expect(renderer.root.findAllByType(Screen)).toHaveLength(1)
    expect(renderer.root.findAllByType(Text)).toHaveLength(0)
  })
})
