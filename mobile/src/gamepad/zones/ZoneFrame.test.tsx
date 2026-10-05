import { createElement, type ReactNode } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ControllerReader } from '../controller-input/controller-reader'
import { neutralSample, type ControllerSample } from '../controller-input/controller-sample'
import { ControllerProvider, useController } from '../controller-provider'
import type { FocusZone } from '../focus/focus-zones'
import { useControllerFocus } from '../focus/use-controller-focus'
import { ZoneFrame } from './ZoneFrame'

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

function Zone({ zone }: { readonly zone: FocusZone }): ReactNode {
  useControllerFocus({ id: `stub:${zone}`, zone, accepts: new Set(['confirm']), handle: () => {} })
  return createElement(ZoneFrame, { zone })
}

describe('the zone frame', () => {
  let renderer: ReactTestRenderer | null = null
  afterEach(() => {
    act(() => renderer?.unmount())
    renderer = null
  })

  function mount(zones: readonly FocusZone[]) {
    const { reader, publish } = fakeReader()
    let controller: ReturnType<typeof useController> | null = null
    function Probe(): ReactNode {
      controller = useController()
      return null
    }
    act(() => {
      renderer = create(
        createElement(
          ControllerProvider,
          { reader },
          createElement(Probe),
          ...zones.map((zone) => createElement(Zone, { key: zone, zone }))
        )
      )
    })
    const framed = (): string[] =>
      (renderer?.root.findAll((node) => typeof node.props.testID === 'string') ?? []).flatMap(
        (node) => (node.props.testID.startsWith('zone-frame:') ? [node.props.testID] : [])
      )
    return {
      framed,
      connect: () => act(() => publish({ ...neutralSample(0), connected: true })),
      pointAt: (zone: FocusZone) => act(() => controller?.focus.focusZone(zone))
    }
  }

  it('borders only the zone the pad is pointed at', () => {
    const screen = mount(['agent', 'header'])
    screen.connect()

    expect(screen.framed()).toEqual(['zone-frame:agent'])

    screen.pointAt('header')
    expect(screen.framed()).toEqual(['zone-frame:header'])
  })

  it('stays out of the way until a pad is attached', () => {
    const screen = mount(['agent', 'header'])

    expect(screen.framed()).toEqual([])
  })

  it('draws nothing when there is only one zone, because there is nothing to tell apart', () => {
    const screen = mount(['agent'])
    screen.connect()

    expect(screen.framed()).toEqual([])
  })
})
