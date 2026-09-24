import { describe, expect, it, vi } from 'vitest'
import {
  loadPreset,
  resolveSegments,
  validatePreset,
  type WheelPresetDefinition
} from './wheel-preset'
import { createWheelRegistry, type WheelActionBinding } from './wheel-registry'

const QUARTER = Math.PI / 2

function binding(id: string, overrides: Partial<WheelActionBinding> = {}): WheelActionBinding {
  return { id, label: id, availability: 'available', run: vi.fn(), ...overrides }
}

function definition(overrides: Partial<WheelPresetDefinition> = {}): WheelPresetDefinition {
  return {
    presetId: 'smoke-1',
    label: 'Smoke test wheel',
    wheel: 1,
    contractual: false,
    trial: {
      trialId: 'trial-001',
      targetDevice: 'Android emulator (orca-controller, API 36)',
      controller: 'Virtual gamepad',
      destructivePolicy: 'excludes-destructive',
      notes: 'First layout, harmless actions only.'
    },
    segments: [
      {
        id: 'north',
        label: 'North',
        centerAngle: 0,
        halfWidth: Math.PI / 6,
        bindingId: 'noop.one'
      },
      {
        id: 'east',
        label: 'East',
        centerAngle: QUARTER,
        halfWidth: Math.PI / 6,
        bindingId: 'noop.two'
      }
    ],
    ...overrides
  }
}

describe('loading a preset', () => {
  it('freezes it, because a preset is the record of what a trial ran', () => {
    const preset = loadPreset(definition())

    expect(Object.isFrozen(preset)).toBe(true)
    expect(Object.isFrozen(preset.trial)).toBe(true)
    expect(Object.isFrozen(preset.segments)).toBe(true)
    expect(Object.isFrozen(preset.segments[0])).toBe(true)
  })

  it('keeps every field the trial needs (WHEEL-R6)', () => {
    const preset = loadPreset(definition())

    expect(preset.trial).toEqual({
      trialId: 'trial-001',
      targetDevice: 'Android emulator (orca-controller, API 36)',
      controller: 'Virtual gamepad',
      destructivePolicy: 'excludes-destructive',
      notes: 'First layout, harmless actions only.'
    })
  })
})

describe('validating a preset', () => {
  it('accepts a complete experiment preset', () => {
    expect(validatePreset(definition())).toEqual([])
  })

  it('refuses one that claims to be contractual', () => {
    // The shape a preset has when it arrives from JSON, where the literal type proves nothing.
    expect(validatePreset({ ...definition(), contractual: true })[0]).toContain(
      'contractual must be literal false'
    )
  })

  it('refuses a preset that does not say which trial it belongs to', () => {
    const anonymous = definition({
      trial: { ...definition().trial, trialId: '', targetDevice: '  ' }
    })
    const problems = validatePreset(anonymous)

    expect(problems).toContain('trial.trialId is required')
    expect(problems).toContain('trial.targetDevice is required')
  })

  it('refuses duplicate segment ids, which would make a lock ambiguous', () => {
    const duplicated = definition({
      segments: [
        { id: 'north', label: 'A', centerAngle: 0, halfWidth: 0.5, bindingId: 'noop.one' },
        { id: 'north', label: 'B', centerAngle: 1, halfWidth: 0.5, bindingId: 'noop.two' }
      ]
    })

    expect(validatePreset(duplicated)[0]).toContain("duplicate segment id 'north'")
  })

  it('refuses a segment with no width, which could never be selected', () => {
    const invisible = definition({
      segments: [{ id: 'north', label: 'A', centerAngle: 0, halfWidth: 0, bindingId: 'noop.one' }]
    })

    expect(validatePreset(invisible)[0]).toContain('has no width')
  })
})

describe('resolving a preset against the registry', () => {
  it('marks a segment unavailable when no surface has contributed its binding', () => {
    const registry = createWheelRegistry()
    const segments = resolveSegments(loadPreset(definition()), registry)

    expect(segments.map((segment) => segment.availability)).toEqual(['unavailable', 'unavailable'])
  })

  it('takes availability from the binding once its surface is mounted', () => {
    const registry = createWheelRegistry()
    registry.register(binding('noop.one'))
    registry.register(binding('noop.two', { availability: 'unknown' }))

    expect(
      resolveSegments(loadPreset(definition()), registry).map((segment) => segment.availability)
    ).toEqual(['available', 'unknown'])
  })

  it('keeps the segment when its surface unmounts, rather than moving the others', () => {
    const registry = createWheelRegistry()
    const unregister = registry.register(binding('noop.one'))
    const preset = loadPreset(definition())

    expect(resolveSegments(preset, registry)).toHaveLength(2)
    unregister()
    const after = resolveSegments(preset, registry)

    // Same count, same geometry — only availability changed (002 §3).
    expect(after).toHaveLength(2)
    expect(after[0]?.centerAngle).toBe(0)
    expect(after[0]?.availability).toBe('unavailable')
  })

  it('prefers the live binding label over the preset placeholder', () => {
    const registry = createWheelRegistry()
    registry.register(binding('noop.one', { label: 'Stop turn' }))

    expect(resolveSegments(loadPreset(definition()), registry)[0]?.label).toBe('Stop turn')
  })

  it('falls back to the preset label when nothing is mounted to ask', () => {
    expect(resolveSegments(loadPreset(definition()), createWheelRegistry())[0]?.label).toBe('North')
  })

  it('runs nothing while resolving', () => {
    const registry = createWheelRegistry()
    const one = binding('noop.one')
    registry.register(one)

    resolveSegments(loadPreset(definition()), registry)

    expect(one.run).not.toHaveBeenCalled()
  })
})
