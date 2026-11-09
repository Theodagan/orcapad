import { describe, expect, it, vi } from 'vitest'
import { createWheelRegistry, type WheelActionBinding } from './wheel-registry'

function binding(id: string, overrides: Partial<WheelActionBinding> = {}): WheelActionBinding {
  return { id, label: id, availability: 'available', run: vi.fn(), ...overrides }
}

describe('wheel registry', () => {
  it('answers nothing for a binding no surface has contributed', () => {
    const registry = createWheelRegistry()

    expect(registry.lookup('agent.stop')).toBeNull()
    expect(registry.ids()).toEqual([])
  })

  it('returns a registered binding, action and all', () => {
    const registry = createWheelRegistry()
    const stop = binding('agent.stop')
    registry.register(stop)

    expect(registry.lookup('agent.stop')).toBe(stop)
    expect(registry.ids()).toEqual(['agent.stop'])
  })

  it('forgets a binding when its surface unmounts', () => {
    const registry = createWheelRegistry()
    const unregister = registry.register(binding('agent.stop'))

    unregister()

    expect(registry.lookup('agent.stop')).toBeNull()
    expect(registry.ids()).toEqual([])
  })

  it('keeps the replacement when a re-render re-registers the same id', () => {
    const registry = createWheelRegistry()
    const first = binding('agent.stop', { label: 'Stop' })
    const retractFirst = registry.register(first)
    const second = binding('agent.stop', { label: 'Stop turn' })
    registry.register(second)

    // React runs the new effect before the old cleanup; the stale cleanup must not win.
    retractFirst()

    expect(registry.lookup('agent.stop')).toBe(second)
  })

  it('is safe to unregister twice', () => {
    const registry = createWheelRegistry()
    const unregister = registry.register(binding('agent.stop'))

    unregister()
    expect(() => unregister()).not.toThrow()
    expect(registry.ids()).toEqual([])
  })

  it('notifies subscribers on register and unregister, and stops after unsubscribe', () => {
    const registry = createWheelRegistry()
    const listener = vi.fn()
    const unsubscribe = registry.subscribe(listener)

    const unregister = registry.register(binding('agent.stop'))
    expect(listener).toHaveBeenCalledTimes(1)

    unregister()
    expect(listener).toHaveBeenCalledTimes(2)

    unsubscribe()
    registry.register(binding('files.open'))
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it("never runs an action itself — that is the dispatcher's job (WHEEL-R2)", () => {
    const registry = createWheelRegistry()
    const stop = binding('agent.stop')
    const unregister = registry.register(stop)
    registry.lookup('agent.stop')
    registry.ids()
    unregister()

    expect(stop.run).not.toHaveBeenCalled()
  })
})
