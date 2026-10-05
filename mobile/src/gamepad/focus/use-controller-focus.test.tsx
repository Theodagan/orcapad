import { createElement, useEffect, useMemo, type ReactNode } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ControllerIntent } from '../controller-input/controller-intent'
import type { ControllerReader } from '../controller-input/controller-reader'
import { neutralSample, type ControllerSample } from '../controller-input/controller-sample'
import { ControllerProvider, useController } from '../controller-provider'
import { ControllerScreenGate } from './screen-focus-gate'
import { FOCUS_PRIORITY } from './focus-zones'
import { useControllerFocus } from './use-controller-focus'

vi.mock('react-native', () => ({
  StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
  View: 'View'
}))

type Listener = (sample: ControllerSample) => void

function fakeReader(): { reader: ControllerReader; publish: Listener } {
  const listeners = new Set<Listener>()
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
  handle
}: {
  readonly id: string
  readonly handle: (intent: ControllerIntent) => void
}): ReactNode {
  const target = useMemo(
    () => ({ id, accepts: new Set<ControllerIntent['kind']>(['confirm']), handle }),
    [id, handle]
  )
  useControllerFocus(target)
  return null
}

describe('useControllerFocus', () => {
  let renderer: ReactTestRenderer | null = null

  afterEach(() => {
    act(() => renderer?.unmount())
    renderer = null
  })

  it('routes a controller intent to the mounted surface', () => {
    const { reader, publish } = fakeReader()
    const handle = vi.fn()
    const confirm: ControllerIntent = { kind: 'confirm' }

    act(() => {
      renderer = create(
        createElement(
          ControllerProvider,
          { reader, resolve: () => [confirm] },
          createElement(Surface, { id: 'sessions', handle })
        )
      )
    })
    act(() => {
      publish(neutralSample(1, true))
    })

    expect(handle).toHaveBeenCalledWith(confirm)
  })

  it('stops receiving once the surface unmounts, leaving nothing focused', () => {
    const { reader, publish } = fakeReader()
    const handle = vi.fn()
    // Stable identity: the provider re-subscribes when `resolve` changes, and a fresh arrow per
    // render would tear the subscription down mid-test.
    const resolve = () => [{ kind: 'confirm' } as const]

    act(() => {
      renderer = create(
        createElement(
          ControllerProvider,
          { reader, resolve },
          createElement(Surface, { id: 'sessions', handle })
        )
      )
    })
    // Re-render the same tree without the surface, which is what a route change does.
    act(() => {
      renderer?.update(createElement(ControllerProvider, { reader, resolve }))
    })
    act(() => {
      publish(neutralSample(2, true))
    })

    expect(handle).not.toHaveBeenCalled()
  })

  it('registers nothing when a surface has no controller edge yet', () => {
    function Untargeted(): ReactNode {
      useControllerFocus(null)
      return null
    }

    expect(() => {
      act(() => {
        renderer = create(
          createElement(
            ControllerProvider,
            { reader: fakeReader().reader },
            createElement(Untargeted)
          )
        )
      })
    }).not.toThrow()
  })
})

/** A surface that declares only what identifies it and hands its handler over on each render. */
const CONFIRM_ONLY: readonly ControllerIntent['kind'][] = ['confirm']

function Declared({
  id,
  handle,
  zone,
  priority,
  accepts = CONFIRM_ONLY
}: {
  readonly id: string
  readonly handle: (intent: ControllerIntent) => void
  readonly zone?: 'agent' | 'shortcuts' | 'header' | 'panels'
  readonly priority?: number
  readonly accepts?: readonly ControllerIntent['kind'][]
}): ReactNode {
  useControllerFocus({ id, zone, priority, accepts: new Set(accepts), handle })
  return null
}

function Counter({ onChange }: { readonly onChange: () => void }): ReactNode {
  const { focus } = useController()
  // The registry notifies on every register and unregister, so a count is a count of churn.
  useEffect(() => focus.subscribe(onChange), [focus, onChange])
  return null
}

describe('useControllerFocus stability (005 USE-R2)', () => {
  let renderer: ReactTestRenderer | null = null
  afterEach(() => {
    act(() => renderer?.unmount())
    renderer = null
  })

  const confirm: ControllerIntent = { kind: 'confirm' }

  it('registers once however often its surface re-renders with fresh handlers', () => {
    const { reader } = fakeReader()
    const changes = vi.fn()
    const tree = (handle: () => void) =>
      createElement(
        ControllerProvider,
        { reader },
        createElement(Counter, { onChange: changes }),
        createElement(Declared, { id: 'agent', handle })
      )

    act(() => {
      renderer = create(tree(vi.fn()))
    })
    const afterMount = changes.mock.calls.length

    for (let index = 0; index < 5; index += 1) {
      act(() => renderer?.update(tree(vi.fn())))
    }

    expect(changes.mock.calls.length).toBe(afterMount)
  })

  it('calls the handler of the latest render, not the one it registered with', () => {
    const { reader, publish } = fakeReader()
    const stale = vi.fn()
    const fresh = vi.fn()
    const resolve = () => [confirm]
    const tree = (handle: () => void) =>
      createElement(
        ControllerProvider,
        { reader, resolve },
        createElement(Declared, { id: 'agent', handle })
      )

    act(() => {
      renderer = create(tree(stale))
    })
    act(() => renderer?.update(tree(fresh)))
    act(() => publish(neutralSample(1, true)))

    expect(fresh).toHaveBeenCalledTimes(1)
    expect(stale).not.toHaveBeenCalled()
  })

  it('re-registers when what identifies it changes: its accepted intents', () => {
    const { reader, publish } = fakeReader()
    const handle = vi.fn()
    const resolve = () => [{ kind: 'back' } as const]
    const tree = (accepts: readonly ControllerIntent['kind'][]) =>
      createElement(
        ControllerProvider,
        { reader, resolve },
        createElement(Declared, { id: 'agent', handle, accepts })
      )

    act(() => {
      renderer = create(tree(['confirm']))
    })
    act(() => publish(neutralSample(1, true)))
    expect(handle).not.toHaveBeenCalled()

    act(() => renderer?.update(tree(['confirm', 'back'])))
    act(() => publish(neutralSample(2, true)))
    expect(handle).toHaveBeenCalledTimes(1)
  })

  it('lets a parent that registers last still lose to the child it contains', () => {
    const { reader, publish } = fakeReader()
    const child = vi.fn()
    const parent = vi.fn()

    // React runs the child's effect first, so the parent registers last: the old "newest wins".
    function Route({ children }: { readonly children?: ReactNode }): ReactNode {
      useControllerFocus({
        id: 'route',
        priority: FOCUS_PRIORITY.screen,
        accepts: new Set(['confirm']),
        handle: parent
      })
      return children
    }

    act(() => {
      renderer = create(
        createElement(
          ControllerProvider,
          { reader, resolve: () => [confirm] },
          createElement(
            Route,
            null,
            createElement(Declared, {
              id: 'agent',
              priority: FOCUS_PRIORITY.surface,
              handle: child
            })
          )
        )
      )
    })
    act(() => publish(neutralSample(1, true)))

    expect(child).toHaveBeenCalledTimes(1)
    expect(parent).not.toHaveBeenCalled()
  })

  it('stays out of the registry while its screen is not the one being looked at', () => {
    const { reader, publish } = fakeReader()
    const handle = vi.fn()
    const tree = (active: boolean) =>
      createElement(
        ControllerProvider,
        { reader, resolve: () => [confirm] },
        createElement(
          ControllerScreenGate,
          { active },
          createElement(Declared, { id: 'workspace-list', handle })
        )
      )

    act(() => {
      renderer = create(tree(false))
    })
    act(() => publish(neutralSample(1, true)))
    expect(handle).not.toHaveBeenCalled()

    act(() => renderer?.update(tree(true)))
    act(() => publish(neutralSample(2, true)))
    expect(handle).toHaveBeenCalledTimes(1)

    act(() => renderer?.update(tree(false)))
    act(() => publish(neutralSample(3, true)))
    expect(handle).toHaveBeenCalledTimes(1)
  })

  it('does not let a retained screen answer an intent the visible one declines', () => {
    const { reader, publish } = fakeReader()
    const retained = vi.fn()
    const visible = vi.fn()
    const resolve = () => [confirm]

    act(() => {
      renderer = create(
        createElement(
          ControllerProvider,
          { reader, resolve },
          createElement(
            ControllerScreenGate,
            { active: false },
            createElement(Declared, { id: 'workspace-list', handle: retained })
          ),
          createElement(Declared, { id: 'session', accepts: ['back'], handle: visible })
        )
      )
    })
    act(() => publish(neutralSample(1, true)))

    // `A` on a session with nothing to confirm must not open the list underneath it.
    expect(retained).not.toHaveBeenCalled()
    expect(visible).not.toHaveBeenCalled()
  })
})
