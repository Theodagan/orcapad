import { describe, expect, it } from 'vitest'
import { DO_ACTION_IDS, GO_ACTION_IDS, VIEW_ACTION_IDS } from '../bindings/wheel-action-ids'
import { validatePreset } from './wheel-preset'
import { slotAngle, wheelLayoutsFor, wheelScreenFor, type WheelScreen } from './wheel-layouts'

const SCREENS: readonly WheelScreen[] = ['home', 'host', 'session', 'other']
const SIXTH = Math.PI / 3

describe('wheel screens', () => {
  // Segments, not the pathname: a real workspace id is `repo::/abs/path`, so its pathname has
  // extra `/`s and a session once read as `other`, with no DO wheel and a three-slot GO.
  it('reads the screen from the route segments', () => {
    expect(wheelScreenFor([])).toBe('home')
    expect(wheelScreenFor(['h', '[hostId]'])).toBe('host')
    expect(wheelScreenFor(['h', '[hostId]', 'session', '[worktreeId]'])).toBe('session')
    expect(wheelScreenFor(['h', '[hostId]', 'files', '[worktreeId]'])).toBe('other')
    expect(wheelScreenFor(['h', '[hostId]', 'agent-history', '[worktreeId]'])).toBe('other')
    expect(wheelScreenFor(['h', '[hostId]', 'files', 'preview', '[worktreeId]'])).toBe('other')
    expect(wheelScreenFor(['settings'])).toBe('other')
  })
})

describe('wheel layouts', () => {
  it('keeps every GO action at the same angle on every screen that has it', () => {
    const angles = new Map<string, number>()
    for (const screen of SCREENS) {
      for (const segment of wheelLayoutsFor(screen)[1]?.segments ?? []) {
        const seen = angles.get(segment.bindingId)
        if (seen !== undefined) {
          expect(segment.centerAngle, `${segment.bindingId} on ${screen}`).toBe(seen)
        }
        angles.set(segment.bindingId, segment.centerAngle)
      }
    }
    const QUARTER = Math.PI / 2
    expect(angles.get(VIEW_ACTION_IDS.chatTerminal)).toBe(0)
    expect(angles.get(GO_ACTION_IDS.pages)).toBeCloseTo(QUARTER)
    expect(angles.get(GO_ACTION_IDS.new)).toBeCloseTo(2 * QUARTER)
    expect(angles.get(GO_ACTION_IDS.back)).toBeCloseTo(3 * QUARTER)
  })

  it('gives every screen the same four GO slots, the pages gathered under Pages', () => {
    const goIds = (screen: WheelScreen) =>
      wheelLayoutsFor(screen)[1]?.segments.map((segment) => segment.bindingId)

    for (const screen of SCREENS) {
      expect(goIds(screen), screen).toEqual([
        VIEW_ACTION_IDS.chatTerminal,
        GO_ACTION_IDS.pages,
        GO_ACTION_IDS.new,
        GO_ACTION_IDS.back
      ])
    }
  })

  it('puts DO on the right stick in a session only', () => {
    expect(wheelLayoutsFor('session')[2]?.segments.map((segment) => segment.bindingId)).toEqual([
      DO_ACTION_IDS.launch,
      DO_ACTION_IDS.stop,
      DO_ACTION_IDS.keys,
      DO_ACTION_IDS.close,
      DO_ACTION_IDS.keyboard,
      DO_ACTION_IDS.view
    ])
    for (const screen of ['home', 'host', 'other'] as const) {
      expect(wheelLayoutsFor(screen)[2]).toBeUndefined()
    }
  })

  it('never puts Stop and Close side by side', () => {
    const segments = wheelLayoutsFor('session')[2]?.segments ?? []
    const angleOf = (id: string) =>
      segments.find((segment) => segment.bindingId === id)?.centerAngle
    const stop = angleOf(DO_ACTION_IDS.stop) ?? 0
    const close = angleOf(DO_ACTION_IDS.close) ?? 0

    expect(Math.abs(stop - close)).toBeGreaterThan(SIXTH * 1.5)
  })

  it('keeps the same layout object for a screen across calls', () => {
    expect(wheelLayoutsFor('session')).toBe(wheelLayoutsFor('session'))
  })

  it('is a valid preset on every screen', () => {
    for (const screen of SCREENS) {
      for (const preset of Object.values(wheelLayoutsFor(screen))) {
        expect(validatePreset(preset), `${preset.presetId}`).toEqual([])
      }
    }
  })

  it('spaces slots evenly from twelve o’clock', () => {
    expect(slotAngle(0, 6)).toBe(0)
    expect(slotAngle(3, 6)).toBeCloseTo(Math.PI)
  })
})
