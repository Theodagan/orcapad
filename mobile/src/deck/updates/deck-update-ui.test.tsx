import { createElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { Pressable, Text } from 'react-native'
import { describe, expect, it, vi } from 'vitest'
import { DeckUpdateNotice } from './DeckUpdateNotice'
import { DeckUpdatePanel } from './DeckUpdatePanel'
import type { DeckUpdateState } from './deck-update-store'

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
      raised: 'raised',
      text1: 't1',
      text2: 't2',
      text3: 't3',
      accent: 'accent',
      onAccent: 'on',
      risk: 'risk'
    },
    space: { xs: 4, sm: 8, md: 12, lg: 16 },
    radius: { surface: 16, control: 12, floating: 24 },
    text: { title: 18, body: 14, meta: 12 },
    feedback: { disabledOpacity: 0.4 }
  })
}))

const RELEASE = {
  version: '1.5.0',
  apkUrl: 'https://github.com/Theodagan/orcapad/releases/download/x/a.apk',
  sizeBytes: 1024,
  digest: 'sha256:aa'
}

function renderPanel(
  state: DeckUpdateState,
  handlers = { check: vi.fn(), download: vi.fn(), install: vi.fn() }
) {
  let renderer: ReactTestRenderer | null = null
  act(() => {
    renderer = create(
      createElement(DeckUpdatePanel, {
        state,
        onCheck: handlers.check,
        onDownload: handlers.download,
        onInstall: handlers.install
      })
    )
  })
  if (renderer === null) {
    throw new Error('renderer did not mount')
  }
  return { renderer, handlers }
}

function copyOf(renderer: ReactTestRenderer): string[] {
  return renderer.root
    .findAllByType(Text)
    .map((node) =>
      Array.isArray(node.props.children)
        ? node.props.children.map((part: unknown) => String(part)).join('')
        : String(node.props.children)
    )
}

describe('deck update panel', () => {
  it('shows the installed version and nothing else when there is no news', () => {
    const { renderer } = renderPanel({ kind: 'idle', installedVersion: '1.4.214' })
    expect(copyOf(renderer)).toEqual([
      'App update',
      'Installed: 1.4.214',
      'Check for updates',
      'Update',
      'Install'
    ])
  })

  it('offers Update once a version is available, and Install only once it is downloaded', () => {
    const { renderer } = renderPanel({
      kind: 'available',
      installedVersion: '1.4.214',
      release: RELEASE
    })
    expect(copyOf(renderer)).toContain('Latest: 1.5.0')
    const buttons = renderer.root.findAllByType(Pressable)
    expect(buttons[1].props.disabled).toBe(false)
    expect(buttons[2].props.disabled).toBe(true)
  })

  it('shows download progress', () => {
    const { renderer } = renderPanel({
      kind: 'downloading',
      installedVersion: '1.4.214',
      release: RELEASE,
      receivedBytes: 512,
      totalBytes: 1024
    })
    expect(copyOf(renderer)).toContain('50%')
  })

  it('says what failed, in the host’s words', () => {
    const { renderer } = renderPanel({
      kind: 'error',
      installedVersion: '1.4.214',
      error: { kind: 'check', detail: 'tag refs HTTP 403' }
    })
    expect(copyOf(renderer)).toContain('The update check failed: tag refs HTTP 403')
  })

  it('reaches every control', () => {
    const { renderer, handlers } = renderPanel({
      kind: 'ready',
      installedVersion: '1.4.214',
      release: RELEASE,
      fileUri: 'file:///cache/a.apk'
    })
    const buttons = renderer.root.findAllByType(Pressable)
    act(() => {
      buttons[0].props.onPress()
      buttons[1].props.onPress()
      buttons[2].props.onPress()
    })
    expect(handlers.install).toHaveBeenCalledTimes(1)
  })
})

describe('deck update notice', () => {
  it('announces the version and can be taken or put off', () => {
    const onOpen = vi.fn()
    const onDismiss = vi.fn()
    let renderer: ReactTestRenderer | null = null
    act(() => {
      renderer = create(createElement(DeckUpdateNotice, { version: '1.5.0', onOpen, onDismiss }))
    })
    if (renderer === null) {
      throw new Error('renderer did not mount')
    }
    expect(copyOf(renderer)[0]).toContain('1.5.0')
    const buttons = renderer.root.findAllByType(Pressable)
    act(() => {
      buttons[1].props.onPress()
    })
    expect(onDismiss).toHaveBeenCalledTimes(1)
    expect(onOpen).not.toHaveBeenCalled()
  })
})
