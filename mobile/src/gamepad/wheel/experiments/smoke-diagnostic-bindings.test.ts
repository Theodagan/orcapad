import { describe, expect, it } from 'vitest'
import { createWheelRegistry } from '../wheel-registry'
import { SMOKE_BINDING_SPECS, createSmokeDiagnostics } from './smoke-diagnostic-bindings'

describe('smoke diagnostic bindings', () => {
  it('registers every spec with the availability it declares', () => {
    const registry = createWheelRegistry()
    createSmokeDiagnostics().register(registry)
    for (const spec of SMOKE_BINDING_SPECS) {
      const binding = registry.lookup(spec.id)
      expect(binding?.label).toBe(spec.label)
      expect(binding?.availability).toBe(spec.availability)
    }
  })

  it('records each run in order', () => {
    const registry = createWheelRegistry()
    const diagnostics = createSmokeDiagnostics()
    diagnostics.register(registry)
    void registry.lookup('smoke.slot-2')?.run()
    void registry.lookup('smoke.slot-1')?.run()
    expect(diagnostics.runs().map((run) => run.bindingId)).toEqual(['smoke.slot-2', 'smoke.slot-1'])
    diagnostics.clear()
    expect(diagnostics.runs()).toEqual([])
  })

  // The only feedback a device trial gets: a commit and a cancel both just close the wheel, so
  // the run count on the label is how a tester tells them apart on the next open.
  it('shows its run count on its own label', () => {
    const registry = createWheelRegistry()
    createSmokeDiagnostics().register(registry)
    void registry.lookup('smoke.slot-1')?.run()
    expect(registry.lookup('smoke.slot-1')?.label).toBe('Slot 1 x1')
    void registry.lookup('smoke.slot-1')?.run()
    expect(registry.lookup('smoke.slot-1')?.label).toBe('Slot 1 x2')
    expect(registry.lookup('smoke.slot-2')?.label).toBe('Slot 2')
  })

  it('retracts every binding, including ones that have replaced themselves', () => {
    const registry = createWheelRegistry()
    const diagnostics = createSmokeDiagnostics()
    const retract = diagnostics.register(registry)
    void registry.lookup('smoke.slot-1')?.run()
    retract()
    expect(registry.ids()).toEqual([])
  })
})
