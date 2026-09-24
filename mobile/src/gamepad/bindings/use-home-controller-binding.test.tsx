import { createElement, type ReactNode } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import { ControllerProvider, useController } from '../controller-provider'
import type { ControllerIntent } from '../controller-input/controller-intent'
import type { ControllerReader } from '../controller-input/controller-reader'
import { neutralSample, type ControllerSample } from '../controller-input/controller-sample'
import { createWheelRegistry } from '../wheel/wheel-registry'
import { useHomeControllerBinding } from './use-home-controller-binding'

vi.mock('react-native', () => ({
  StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
  View: 'View'
}))

const hosts = [{ id: 'alpha' }, { id: 'beta' }]

/** A reader whose connected state the test drives by hand. */
function fakeReader(): {
  reader: ControllerReader
  publish: (sample: ControllerSample) => void
} {
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
    publish: (sample) => {
      for (const listener of listeners) {
        listener(sample)
      }
    }
  }
}

type Harness = {
  renderer: ReactTestRenderer
  dispatch: (intent: ControllerIntent) => void
  connect: (connected: boolean) => void
  selected: () => string | null
  registry: ReturnType<typeof createWheelRegistry>
  onOpen: ReturnType<typeof vi.fn>
  onPairDesktop: ReturnType<typeof vi.fn>
  scrollTo: ReturnType<typeof vi.fn>
}

function mount(): Harness {
  const { reader, publish } = fakeReader()
  const registry = createWheelRegistry()
  const onOpen = vi.fn()
  const onPairDesktop = vi.fn()
  const scrollTo = vi.fn()
  let dispatch: (intent: ControllerIntent) => boolean = () => false
  let selected: string | null = null

  function Home(): ReactNode {
    selected = useHomeControllerBinding({ hosts, onOpen, onPairDesktop, scrollTo })
    dispatch = useController().dispatchIntent
    return null
  }

  let renderer: ReactTestRenderer | null = null
  act(() => {
    renderer = create(
      createElement(
        ControllerProvider,
        { reader, registerWheelAction: registry.register },
        createElement(Home)
      )
    )
  })
  if (renderer === null) {
    throw new Error('renderer did not mount')
  }

  return {
    renderer,
    dispatch: (intent) => act(() => void dispatch(intent)),
    connect: (connected) => act(() => publish({ ...neutralSample(0), connected })),
    selected: () => selected,
    registry,
    onOpen,
    onPairDesktop,
    scrollTo
  }
}

describe('home controller binding', () => {
  // BIND-AC10: a thumb never sees a selection it has no way to move.
  it('selects nothing until a controller is attached', () => {
    const home = mount()
    expect(home.selected()).toBeNull()

    home.connect(true)
    expect(home.selected()).toBe('alpha')

    home.connect(false)
    expect(home.selected()).toBeNull()
  })

  it('opens the selected host through the list’s own action, once', () => {
    const home = mount()
    home.connect(true)

    home.dispatch({ kind: 'confirm' })

    expect(home.onOpen).toHaveBeenCalledTimes(1)
    expect(home.onOpen).toHaveBeenCalledWith({ id: 'alpha' })
  })

  it('opens nothing when nothing is selected', () => {
    const home = mount()

    home.dispatch({ kind: 'confirm' })

    expect(home.onOpen).not.toHaveBeenCalled()
  })

  it('moves selection through the order the list renders', () => {
    const home = mount()
    home.connect(true)

    home.dispatch({ kind: 'move-selection', direction: 'down' })
    expect(home.selected()).toBe('beta')

    home.dispatch({ kind: 'confirm' })
    expect(home.onOpen).toHaveBeenCalledWith({ id: 'beta' })
  })

  it('scrolls the list it was given, accumulating while the trigger is held', () => {
    const home = mount()

    home.dispatch({ kind: 'scroll', direction: 'down', velocity: 1 })
    home.dispatch({ kind: 'scroll', direction: 'down', velocity: 1 })

    expect(home.scrollTo).toHaveBeenCalledTimes(2)
    const [first] = home.scrollTo.mock.calls[0] ?? []
    const [second] = home.scrollTo.mock.calls[1] ?? []
    expect(second).toBeGreaterThan(first)
  })

  // BIND-R10 plus `003` §10: the action exists exactly as long as the surface does.
  it('registers its wheel action while mounted and retracts it on unmount', () => {
    const home = mount()
    expect(home.registry.lookup('home.pair-desktop')).not.toBeNull()

    home.registry.lookup('home.pair-desktop')?.run()
    expect(home.onPairDesktop).toHaveBeenCalledTimes(1)

    act(() => home.renderer.unmount())
    expect(home.registry.lookup('home.pair-desktop')).toBeNull()
  })

  it('stops receiving intents once unmounted', () => {
    const home = mount()
    home.connect(true)
    act(() => home.renderer.unmount())

    home.dispatch({ kind: 'confirm' })

    expect(home.onOpen).not.toHaveBeenCalled()
  })
})
