import { createElement, type ReactNode } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ControllerReader } from '../controller-input/controller-reader'
import { neutralSample, type ControllerSample } from '../controller-input/controller-sample'
import { ControllerProvider, useController } from '../controller-provider'
import { ControllerScreenGate } from '../focus/screen-focus-gate'
import { useControllerFocus } from '../focus/use-controller-focus'
import { ZoneItem } from './ZoneItem'

vi.mock('react-native', () => ({
  StyleSheet: { create: <T,>(styles: T) => styles, absoluteFillObject: { position: 'absolute' } },
  View: 'View'
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

/** The agent a session always has beside its header, so there is somewhere to switch from. */
function Agent(): ReactNode {
  useControllerFocus({
    id: 'agent',
    zone: 'agent',
    accepts: new Set(['confirm']),
    handle: () => {}
  })
  return null
}

describe('a zone item', () => {
  let renderer: ReactTestRenderer | null = null
  afterEach(() => {
    act(() => renderer?.unmount())
    renderer = null
  })

  function mount(options: { screenActive?: boolean } = {}) {
    const { reader, publish } = fakeReader()
    const requestNativeFocus = vi.fn()
    const pressed: string[] = []
    const seen: Record<string, boolean> = {}
    let controller: ReturnType<typeof useController> | null = null

    function Probe(): ReactNode {
      controller = useController()
      return null
    }
    const item = (id: string, order: number, props: { disabled?: boolean } = {}) =>
      createElement(
        ZoneItem,
        {
          key: id,
          zone: 'header',
          id,
          order,
          disabled: props.disabled,
          onActivate: () => pressed.push(id)
        },
        ({ focused, focusRef }) => {
          seen[id] = focused
          return createElement('View', { testID: id, ref: focusRef })
        }
      )

    const tree = (withItems: boolean) =>
      createElement(
        ControllerProvider,
        { reader, requestNativeFocus },
        createElement(Probe),
        createElement(Agent),
        createElement(
          ControllerScreenGate,
          { active: options.screenActive ?? true },
          ...(withItems
            ? [item('back', 0), item('files', 1), item('hidden', 2, { disabled: true })]
            : [])
        )
      )
    act(() => {
      // The renderer answers a host ref with this: the item's id stands in for its native view.
      renderer = create(tree(true), {
        createNodeMock: (element) => ({ id: element.props.testID })
      })
    })
    const press = (kind: 'switch-zone' | 'confirm' | 'back'): void => {
      act(() => void controller?.dispatchIntent({ kind }))
    }
    return {
      seen,
      pressed,
      requestNativeFocus,
      connect: () => act(() => publish({ ...neutralSample(0), connected: true })),
      press,
      moveRight: () =>
        act(() => void controller?.dispatchIntent({ kind: 'move-horizontal', direction: 'right' })),
      zones: () => controller?.focus.snapshot().zones ?? [],
      removeItems: () => act(() => renderer?.update(tree(false)))
    }
  }

  it('marks itself focused only once the pad has reached its zone and stands on it', () => {
    const screen = mount()
    screen.connect()
    expect(screen.seen).toMatchObject({ back: false, files: false })

    screen.press('switch-zone')
    expect(screen.seen).toMatchObject({ back: true, files: false })

    screen.moveRight()
    expect(screen.seen).toMatchObject({ back: false, files: true })
  })

  it('shows no cursor to a touch user, even where the pad would stand', () => {
    const screen = mount()

    expect(screen.seen).toMatchObject({ back: false, files: false })
  })

  it('presses with A the very thing its touch handler presses', () => {
    const screen = mount()
    screen.connect()
    screen.press('switch-zone')
    screen.moveRight()

    screen.press('confirm')

    expect(screen.pressed).toEqual(['files'])
  })

  it('asks Android to focus the element the cursor lands on, and only then', () => {
    const screen = mount()
    screen.connect()
    expect(screen.requestNativeFocus).not.toHaveBeenCalled()

    screen.press('switch-zone')
    expect(screen.requestNativeFocus).toHaveBeenLastCalledWith({ id: 'back' })

    screen.moveRight()
    expect(screen.requestNativeFocus).toHaveBeenLastCalledWith({ id: 'files' })
    expect(screen.requestNativeFocus).toHaveBeenCalledTimes(2)
  })

  it('skips an item that cannot be pressed', () => {
    const screen = mount()
    screen.connect()
    screen.press('switch-zone')
    screen.moveRight()
    screen.moveRight()

    expect(screen.seen.hidden).toBe(false)
    expect(screen.seen.files).toBe(true)
  })

  it('does not take part while its screen is not the one being looked at', () => {
    const screen = mount({ screenActive: false })
    screen.connect()

    expect(screen.zones()).toEqual(['agent'])
  })

  it('leaves the zone when its last item unmounts', () => {
    const screen = mount()
    expect(screen.zones()).toEqual(['agent', 'header'])

    screen.removeItems()

    expect(screen.zones()).toEqual(['agent'])
  })
})
