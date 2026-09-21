import { describe, expect, it, vi } from 'vitest'
import type { ControllerIntent, ControllerIntentKind } from '../controller-input/controller-intent'
import { createFocusRegistry } from './focus-registry'
import type { FocusTarget } from './focus-target'

const confirm: ControllerIntent = { kind: 'confirm' }
const back: ControllerIntent = { kind: 'back' }

function target(id: string, accepts: readonly ControllerIntentKind[] = ['confirm']): FocusTarget {
  return { id, accepts: new Set(accepts), handle: vi.fn() }
}

describe('focus registry', () => {
  it('dispatches nothing until a target mounts', () => {
    const registry = createFocusRegistry()

    expect(registry.activeTarget()).toBeNull()
    expect(registry.dispatch(confirm)).toBe(false)
  })

  it('sends an accepted intent to the active target', () => {
    const registry = createFocusRegistry()
    const session = target('session')
    registry.register(session)

    expect(registry.dispatch(confirm)).toBe(true)
    expect(session.handle).toHaveBeenCalledWith(confirm)
  })

  it('leaves an unaccepted intent alone rather than guessing a fallback', () => {
    const registry = createFocusRegistry()
    const session = target('session', ['confirm'])
    registry.register(session)

    expect(registry.dispatch(back)).toBe(false)
    expect(session.handle).not.toHaveBeenCalled()
  })

  it('activates by id and ignores an id nothing mounted', () => {
    const registry = createFocusRegistry()
    const list = target('list')
    const detail = target('detail')
    registry.register(list)
    registry.register(detail)

    registry.activate('list')
    expect(registry.activeTarget()).toBe(list)

    registry.activate('never-mounted')
    expect(registry.activeTarget()).toBe(list)
  })

  it('never dispatches to an unmounted target', () => {
    const registry = createFocusRegistry()
    const overlay = target('overlay')
    const unregister = registry.register(overlay)

    unregister()
    expect(registry.dispatch(confirm)).toBe(false)
    expect(overlay.handle).not.toHaveBeenCalled()
  })

  it('falls back to the newest remaining mount when the active target leaves', () => {
    const registry = createFocusRegistry()
    const list = target('list')
    const detail = target('detail')
    registry.register(list)
    const closeOverlay = registry.register(detail)

    registry.activate('detail')
    closeOverlay()

    expect(registry.activeTarget()).toBe(list)
  })

  it('keeps the active target across a re-render that replaces the entry', () => {
    const registry = createFocusRegistry()
    const first = target('session')
    const unregisterFirst = registry.register(first)
    const second = target('session')
    registry.register(second)

    // React unmounts the old effect after running the new one; the stale cleanup must not
    // delete the entry the re-render just installed.
    unregisterFirst()

    expect(registry.activeTarget()).toBe(second)
    expect(registry.dispatch(confirm)).toBe(true)
    expect(second.handle).toHaveBeenCalledWith(confirm)
  })
})
