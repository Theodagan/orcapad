import { createElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import { FocusableOrca } from './focusable-orca'

let focusedNow = false
const onActivate = vi.fn()

vi.mock('react-native', () => ({ Pressable: 'Pressable', View: 'View' }))
vi.mock('../../theme/use-mobile-color-scheme', () => ({ useMobileColorScheme: () => 'dark' }))
vi.mock('../theme/deck-theme', () => ({
  useDeckTheme: () => ({ radius: { control: 12 }, space: { sm: 8 } })
}))
vi.mock('../../gamepad/zones/ZoneItem', () => ({
  ZoneItem: (props: { children: (state: { focused: boolean; focusRef: null }) => unknown }) =>
    props.children({ focused: focusedNow, focusRef: null })
}))
vi.mock('../../gamepad/focus/ControllerFocusRing', async () => {
  const { createElement } = await import('react')
  return { ControllerFocusRing: () => createElement('Ring' as never, null) }
})

function render(): ReactTestRenderer {
  let renderer: ReactTestRenderer | null = null
  act(() => {
    renderer = create(
      createElement(
        FocusableOrca,
        { zone: 'list', id: 'row-1', order: 0, onActivate },
        'WorktreeRow'
      )
    )
  })
  if (renderer === null) {
    throw new Error('renderer did not mount')
  }
  return renderer
}

describe('focusable Orca rows', () => {
  it('draws the focus ring only while focused', () => {
    focusedNow = false
    expect(render().root.findAllByType('Ring' as never)).toHaveLength(0)
    focusedNow = true
    expect(render().root.findAllByType('Ring' as never)).toHaveLength(1)
    focusedNow = false
  })

  it('calls the row’s own handler on a tap, the same one A calls', () => {
    const renderer = render()
    act(() => {
      renderer.root.findByType('Pressable' as never).props.onPress()
    })
    expect(onActivate).toHaveBeenCalledTimes(1)
  })
})
