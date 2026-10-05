import { createElement, type ReactNode } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ActionHintBar } from './ActionHintBar'
import { createActiveDictationRegistry } from './bindings/active-dictation'
import type { ControllerIntentKind } from './controller-input/controller-intent'
import type { ControllerReader } from './controller-input/controller-reader'
import { neutralSample, type ControllerSample } from './controller-input/controller-sample'
import { ControllerProvider } from './controller-provider'
import type { FocusZone } from './focus/focus-zones'
import { useControllerFocus } from './focus/use-controller-focus'

vi.mock('react-native', () => ({
  StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {}, hairlineWidth: 1 },
  Text: 'Text',
  View: 'View'
}))
vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 })
}))

function fakeReader(): { reader: ControllerReader; publish: (s: ControllerSample) => void } {
  const listeners = new Set<(sample: ControllerSample) => void>()
  return {
    reader: {
      support: () => 'available',
      current: () => neutralSample(0),
      subscribe: (listener) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      }
    },
    publish: (sample) => listeners.forEach((listener) => listener(sample))
  }
}

function Surface({
  id,
  zone,
  accepts,
  labels
}: {
  readonly id: string
  readonly zone?: FocusZone
  readonly accepts: readonly ControllerIntentKind[]
  readonly labels?: Partial<Record<ControllerIntentKind, string>>
}): ReactNode {
  useControllerFocus({ id, zone, accepts: new Set(accepts), handle: () => {}, labels })
  return null
}

describe('ActionHintBar', () => {
  let renderer: ReactTestRenderer | null = null
  afterEach(() => {
    act(() => renderer?.unmount())
    renderer = null
  })

  function mount(
    children: ReactNode[],
    options: {
      connected?: boolean
      wheelOpen?: boolean
      dictation?: ReturnType<typeof createActiveDictationRegistry>
    } = {}
  ) {
    const { reader, publish } = fakeReader()
    act(() => {
      renderer = create(
        createElement(
          ControllerProvider,
          { reader, activeDictation: options.dictation },
          ...children,
          createElement(ActionHintBar, { wheelOpen: options.wheelOpen })
        )
      )
    })
    act(() => publish({ ...neutralSample(1, options.connected ?? true) }))
  }

  function texts(): string[] {
    return (renderer?.root.findAll((node) => node.type === 'Text') ?? []).map((node) =>
      node.children.join('')
    )
  }

  it('shows nothing without a controller, so a touch user sees the screen as it was', () => {
    mount([createElement(Surface, { id: 'a', accepts: ['confirm'] })], { connected: false })

    expect(texts()).toEqual([])
  })

  it('shows nothing when nothing accepts anything', () => {
    mount([])

    expect(texts()).toEqual([])
  })

  it('says what each button does here, in the surface’s own words', () => {
    mount([
      createElement(Surface, {
        id: 'terminal',
        zone: 'agent',
        accepts: ['confirm', 'back'],
        labels: { confirm: 'Enter', back: 'Esc' }
      })
    ])

    expect(texts()).toEqual(['A', 'Enter', 'B', 'Esc'])
  })

  it('names the zone and where X goes next, once there is more than one', () => {
    mount([
      createElement(Surface, { id: 'agent', zone: 'agent', accepts: ['confirm'] }),
      createElement(Surface, { id: 'header', zone: 'header', accepts: ['confirm'] })
    ])

    expect(texts()).toEqual(['Agent', 'A', 'Select', 'X', 'Header'])
  })

  it('does not name a zone when there is only one', () => {
    mount([createElement(Surface, { id: 'agent', zone: 'agent', accepts: ['confirm'] })])

    expect(texts()).not.toContain('Agent')
  })

  it('never shows a control as its own label', () => {
    mount([
      createElement(Surface, {
        id: 'agent',
        zone: 'agent',
        accepts: ['confirm', 'back', 'scroll', 'cycle-tab', 'move-selection']
      })
    ])
    const pairs = texts()

    for (let index = 0; index < pairs.length; index += 2) {
      expect(pairs[index]).not.toBe(pairs[index + 1])
    }
  })

  it('offers dictation when the session can start it, and says Stop while it is live', () => {
    const dictation = createActiveDictationRegistry()
    const unregister = dictation.register({
      activity: 'idle',
      toggle: () => {},
      canStart: true,
      onUnavailable: () => {}
    })
    mount([createElement(Surface, { id: 'agent', zone: 'agent', accepts: ['confirm'] })], {
      dictation
    })
    expect(texts()).toContain('Dictate')

    act(() => {
      unregister()
      dictation.register({
        activity: 'recording',
        toggle: () => {},
        canStart: false,
        onUnavailable: () => {}
      })
    })
    expect(texts()).toContain('Stop dictation')
  })

  it('does not offer dictation it cannot start', () => {
    const dictation = createActiveDictationRegistry()
    dictation.register({
      activity: 'idle',
      toggle: () => {},
      canStart: false,
      onUnavailable: () => {}
    })
    mount([createElement(Surface, { id: 'agent', zone: 'agent', accepts: ['confirm'] })], {
      dictation
    })

    expect(texts()).not.toContain('Dictate')
  })

  it('shows only what A and B do to an open wheel, while one is open', () => {
    mount(
      [createElement(Surface, { id: 'agent', zone: 'agent', accepts: ['confirm', 'scroll'] })],
      {
        wheelOpen: true
      }
    )

    expect(texts()).toEqual(['Wheel', 'A', 'Select', 'B', 'Cancel'])
  })
})
