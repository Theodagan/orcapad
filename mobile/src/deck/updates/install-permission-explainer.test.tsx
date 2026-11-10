import { createElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { Pressable, Text } from 'react-native'
import { describe, expect, it, vi } from 'vitest'
import { InstallPermissionExplainer } from './install-permission-explainer'

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
    color: {
      panel: 'panel',
      text1: 't1',
      text2: 't2',
      text3: 't3',
      accent: 'accent',
      onAccent: 'on'
    },
    space: { sm: 8, md: 12, lg: 16 },
    radius: { surface: 16, control: 12 },
    text: { title: 18, body: 14, meta: 12 }
  })
}))

function render(onOpenSettings = vi.fn(), onDismiss = vi.fn()): ReactTestRenderer {
  let renderer: ReactTestRenderer | null = null
  act(() => {
    renderer = create(createElement(InstallPermissionExplainer, { onOpenSettings, onDismiss }))
  })
  if (renderer === null) {
    throw new Error('renderer did not mount')
  }
  return renderer
}

describe('install permission explainer', () => {
  it('explains the permission and offers Android settings', () => {
    const renderer = render()
    const copy = renderer.root.findAllByType(Text).map((node) => String(node.props.children))
    expect(copy[0]).toBe('Allow installs from Orcapad')
    expect(copy[1]).toContain('Android asks once')
    expect(renderer.root.findAllByType(Pressable)).toHaveLength(2)
  })

  it('opens the settings screen from its button', () => {
    const onOpenSettings = vi.fn()
    const renderer = render(onOpenSettings)
    act(() => {
      renderer.root.findAllByType(Pressable)[0].props.onPress()
    })
    expect(onOpenSettings).toHaveBeenCalledTimes(1)
  })

  it('can be put off for now', () => {
    const onDismiss = vi.fn()
    const renderer = render(vi.fn(), onDismiss)
    act(() => {
      renderer.root.findAllByType(Pressable)[1].props.onPress()
    })
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
