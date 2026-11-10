import { createElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import { DeckHostRefusal } from './DeckHostRefusal'

vi.mock('react-native', () => ({
  Pressable: 'Pressable',
  Text: 'Text',
  View: 'View'
}))
vi.mock('../../i18n/use-mobile-translation', () => ({
  useMobileTranslation: () => (_key: string, fallback?: string) => fallback ?? _key
}))

/** react-test-renderer 19 unmounts a tree created outside `act`. */
function render(element: Parameters<typeof create>[0]): ReactTestRenderer {
  let renderer: ReactTestRenderer | null = null
  act(() => {
    renderer = create(element)
  })
  if (renderer === null) {
    throw new Error('renderer did not mount')
  }
  return renderer
}

function textOf(renderer: ReactTestRenderer): string[] {
  return renderer.root
    .findAllByType('Text' as never)
    .map((node) =>
      Array.isArray(node.props.children) ? node.props.children.join('') : node.props.children
    )
}

describe('deck host refusal', () => {
  it('shows the plain reason and an Update control when the desktop refuses this client', () => {
    const renderer = render(
      createElement(
        DeckHostRefusal,
        {
          verdict: { kind: 'blocked', reason: 'mobile-too-old', desktopVersion: 3 },
          onUpdate: () => {}
        },
        createElement('Child' as never)
      )
    )
    expect(textOf(renderer)).toEqual([
      'This desktop cannot talk to this app',
      'This desktop needs a newer Orcapad. Update the app, then try this host again.',
      'Update Orcapad'
    ])
    expect(renderer.root.findAllByType('Pressable' as never)).toHaveLength(1)
  })

  it('offers the desktop-side remedy when the desktop itself is too old', () => {
    const renderer = render(
      createElement(DeckHostRefusal, {
        verdict: { kind: 'blocked', reason: 'desktop-too-old', desktopVersion: 1 },
        onUpdate: () => {}
      })
    )
    expect(textOf(renderer)).toContain(
      'This desktop is too old for this build of Orcapad. Update Orca on your computer, then try again.'
    )
  })

  it('renders the screen when the verdict is compatible', () => {
    const renderer = render(
      createElement(
        DeckHostRefusal,
        {
          verdict: { kind: 'ok' },
          onUpdate: () => {}
        },
        createElement('Child' as never)
      )
    )
    expect(renderer.root.findAllByType('Child' as never)).toHaveLength(1)
    expect(renderer.root.findAllByType('Text' as never)).toHaveLength(0)
  })
})
