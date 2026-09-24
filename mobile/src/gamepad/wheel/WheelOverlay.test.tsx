import { createElement, type ReactNode } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ControllerIntent } from '../controller-input/controller-intent'
import type { ControllerReader } from '../controller-input/controller-reader'
import { neutralSample, type ControllerSample } from '../controller-input/controller-sample'
import { ControllerProvider } from '../controller-provider'
import { WheelOverlay } from './WheelOverlay'
import { useWheelController, type WheelController } from './use-wheel-controller'
import { loadPreset, type WheelPresetDefinition } from './wheel-preset'
import { createWheelRegistry, type WheelRegistry } from './wheel-registry'

vi.mock('react-native', () => ({
  StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
  Text: 'Text',
  View: 'View'
}))

const QUARTER = Math.PI / 2

const preset: WheelPresetDefinition = loadPreset({
  presetId: 'smoke-1',
  label: 'Smoke',
  wheel: 1,
  contractual: false,
  trial: {
    trialId: 'trial-001',
    targetDevice: 'Android emulator',
    controller: 'Virtual gamepad',
    destructivePolicy: 'excludes-destructive',
    notes: 'harmless'
  },
  segments: [
    { id: 'north', label: 'North', centerAngle: 0, halfWidth: Math.PI / 6, bindingId: 'noop.one' },
    {
      id: 'east',
      label: 'East',
      centerAngle: QUARTER,
      halfWidth: Math.PI / 6,
      bindingId: 'noop.two'
    }
  ]
})

function fakeReader(): { reader: ControllerReader; publish: (s: ControllerSample) => void } {
  const listeners = new Set<(s: ControllerSample) => void>()
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

/** Mounts the overlay inside a provider, exposing the controller so a test can drive it. */
function Harness({
  registry,
  onController
}: {
  readonly registry: WheelRegistry
  readonly onController: (controller: WheelController) => void
}): ReactNode {
  const controller = useWheelController({ presets: { 1: preset }, registry, deadZone: 0.2 })
  onController(controller)
  return createElement(WheelOverlay, { controller })
}

const up: ControllerIntent = { kind: 'wheel-motion', wheel: 1, x: 0, y: -1 }

describe('WheelOverlay', () => {
  let renderer: ReactTestRenderer | null = null

  afterEach(() => {
    act(() => renderer?.unmount())
    renderer = null
  })

  function mount(
    registry: WheelRegistry,
    capture: (c: WheelController) => void
  ): (sample: ControllerSample) => void {
    const { reader, publish } = fakeReader()
    act(() => {
      renderer = create(
        createElement(
          ControllerProvider,
          { reader },
          createElement(Harness, { registry, onController: capture })
        )
      )
    })
    return publish
  }

  function labels(): string[] {
    return (renderer?.root.findAll((node) => node.type === 'Text') ?? []).flatMap((node) =>
      typeof node.children[0] === 'string' ? [node.children[0]] : []
    )
  }

  it('renders nothing while the wheel is closed', () => {
    let controller: WheelController | null = null
    mount(createWheelRegistry(), (c) => (controller = c))

    expect(renderer?.root.findAll((node) => node.type === 'View')).toHaveLength(1) // provider root
    expect(controller).not.toBeNull()
  })

  it('opens above the surface on stick motion and shows the preset', () => {
    let controller: WheelController | null = null
    mount(createWheelRegistry(), (c) => (controller = c))

    act(() => {
      controller?.intercept(up)
    })

    expect(labels()).toEqual(['North', 'East'])
  })

  it('takes no touches, so the surface underneath stays usable (WHEEL-R8)', () => {
    let controller: WheelController | null = null
    mount(createWheelRegistry(), (c) => (controller = c))
    act(() => {
      controller?.intercept(up)
    })

    const blocking = renderer?.root.findAll(
      (node) => node.type === 'View' && node.props.style?.position === 'absolute'
    )
    expect(blocking?.every((node) => node.props.pointerEvents === 'none')).toBe(true)
  })

  it('closes when the stick returns to centre', () => {
    let controller: WheelController | null = null
    mount(createWheelRegistry(), (c) => (controller = c))

    act(() => {
      controller?.intercept(up)
    })
    act(() => {
      controller?.intercept({ kind: 'wheel-motion', wheel: 1, x: 0, y: 0 })
    })

    expect(labels()).toEqual([])
  })

  it('commits without waiting for a render (WHEEL-T5)', () => {
    const registry = createWheelRegistry()
    const run = vi.fn()
    registry.register({ id: 'noop.one', label: 'North', availability: 'available', run })
    let controller: WheelController | null = null
    mount(registry, (c) => (controller = c))

    // Deliberately outside act(): no re-render is flushed between the motion and the confirm,
    // so a commit that depended on rendering would not happen.
    controller?.intercept(up)
    controller?.intercept({ kind: 'confirm' })

    expect(run).toHaveBeenCalledTimes(1)
  })

  it('leaves A to the focused surface while no wheel is open', () => {
    let controller: WheelController | null = null
    mount(createWheelRegistry(), (c) => (controller = c))

    expect(controller?.intercept({ kind: 'confirm' })).toBe(false)
  })

  it('claims A while a wheel is open, so the surface does not also act', () => {
    let controller: WheelController | null = null
    mount(createWheelRegistry(), (c) => (controller = c))

    act(() => {
      controller?.intercept(up)
    })
    expect(controller?.intercept({ kind: 'confirm' })).toBe(true)
  })

  it('renders an unavailable segment disabled rather than removing it', () => {
    let controller: WheelController | null = null
    mount(createWheelRegistry(), (c) => (controller = c))
    act(() => {
      controller?.intercept(up)
    })

    const faded = renderer?.root.findAll(
      (node) =>
        node.type === 'View' &&
        node.props.style?.some?.(
          (s: unknown) => s !== null && typeof s === 'object' && 'opacity' in s
        )
    )
    expect(faded?.length).toBe(2)
  })

  it('cancels an open wheel when the controller goes away mid-gesture (002 §6)', () => {
    let controller: WheelController | null = null
    const publish = mount(createWheelRegistry(), (c) => (controller = c))

    act(() => {
      publish(neutralSample(1, true))
    })
    act(() => {
      controller?.intercept(up)
    })
    expect(labels()).toEqual(['North', 'East'])

    act(() => {
      publish(neutralSample(2, false))
    })

    expect(labels()).toEqual([])
  })

  it('does not cancel merely because no controller has ever been attached', () => {
    let controller: WheelController | null = null
    mount(createWheelRegistry(), (c) => (controller = c))

    act(() => {
      controller?.intercept(up)
    })

    // Disconnected is a resting state, not an event: the wheel stays as it was put.
    expect(labels()).toEqual(['North', 'East'])
  })
})
