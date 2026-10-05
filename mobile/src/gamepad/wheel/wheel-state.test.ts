import { describe, expect, it } from 'vitest'
import {
  CLOSED_WHEEL,
  reduceWheel,
  stateAfter,
  type WheelEvent,
  type WheelPreset,
  type WheelState
} from './wheel-state'
import type { SegmentAvailability, WheelId, WheelSegment } from './wheel-segment'

const QUARTER = Math.PI / 2

function segment(
  id: string,
  centerAngle: number,
  availability: SegmentAvailability = 'available'
): WheelSegment {
  return {
    id,
    label: id,
    centerAngle,
    halfWidth: Math.PI / 6,
    availability,
    bindingId: `binding.${id}`
  }
}

const wheelOne = [segment('north', 0), segment('east', QUARTER)]
const wheelTwo = [segment('far-south', Math.PI)]

function preset(overrides: Partial<WheelPreset> = {}): WheelPreset {
  return {
    segmentsFor: (wheel: WheelId) => (wheel === 1 ? wheelOne : wheelTwo),
    deadZone: 0.2,
    ...overrides
  }
}

const UP: WheelEvent = { kind: 'motion', wheel: 1, x: 0, y: -1 }
const RIGHT: WheelEvent = { kind: 'motion', wheel: 1, x: 1, y: 0 }
const CENTRED: WheelEvent = { kind: 'motion', wheel: 1, x: 0, y: 0 }
const openOnNorth: WheelState = { kind: 'open', wheel: 1, path: [], locked: 'north' }

function reduce(state: WheelState, event: WheelEvent, p: WheelPreset = preset()) {
  return reduceWheel(state, event, p)
}

/** One named test per rule in WHEEL-R1, in the PRD's own order. */
describe('PRD wheel rules', () => {
  it('rule 1 — a wheel opens immediately when its stick leaves the dead zone', () => {
    expect(reduce(CLOSED_WHEEL, UP)).toEqual({
      kind: 'state',
      state: { kind: 'open', wheel: 1, path: [], locked: 'north' }
    })
  })

  it('rule 2 — it locks the segment indicated by the stick', () => {
    const opened = stateAfter(reduce(CLOSED_WHEEL, UP))

    expect(stateAfter(reduce(opened, RIGHT))).toEqual({
      kind: 'open',
      wheel: 1,
      path: [],
      locked: 'east'
    })
  })

  it('rule 3 — stick movement alone never executes an action', () => {
    const motions: WheelEvent[] = [
      UP,
      RIGHT,
      { kind: 'motion', wheel: 1, x: 0.7, y: -0.7 },
      { kind: 'motion', wheel: 2, x: 0, y: 1 }
    ]
    let state: WheelState = CLOSED_WHEEL
    const outcomes = motions.map((event) => {
      const outcome = reduce(state, event)
      state = stateAfter(outcome)
      return outcome
    })

    expect(outcomes.some((outcome) => outcome.kind === 'commit')).toBe(false)
  })

  it('rule 4 — A commits the currently locked segment', () => {
    expect(reduce(openOnNorth, { kind: 'confirm' })).toEqual({
      kind: 'commit',
      wheel: 1,
      segmentId: 'north'
    })
  })

  it('rule 5 — returning to centre or leaving a valid segment before A cancels', () => {
    // The stick is already back at centre, so there is nothing to wait for before reopening.
    expect(reduce(openOnNorth, CENTRED)).toEqual({ kind: 'cancel', spent: null })
    // A dead arc between north and east is "no longer on a valid segment".
    expect(reduce(openOnNorth, { kind: 'motion', wheel: 1, x: 0.7, y: -0.7 })).toEqual({
      kind: 'cancel',
      spent: null
    })
    expect(stateAfter({ kind: 'cancel', spent: null })).toEqual(CLOSED_WHEEL)
  })

  it('rule 6 — no hold-to-summon delay exists', () => {
    // The very first sample past the dead zone opens it; nothing counts samples or elapsed time.
    const first = reduce(CLOSED_WHEEL, { kind: 'motion', wheel: 1, x: 0, y: -0.21 })

    expect(stateAfter(first).kind).toBe('open')
  })
})

describe('the transition table', () => {
  it('opens either wheel from closed, by its own stick', () => {
    expect(stateAfter(reduce(CLOSED_WHEEL, { kind: 'motion', wheel: 2, x: 0, y: 1 }))).toEqual({
      kind: 'open',
      wheel: 2,
      path: [],
      locked: 'far-south'
    })
  })

  it('stays closed while the stick is inside the dead zone', () => {
    expect(reduce(CLOSED_WHEEL, { kind: 'motion', wheel: 1, x: 0.1, y: -0.1 })).toEqual({
      kind: 'state',
      state: CLOSED_WHEEL
    })
  })

  it('ignores the inactive stick entirely, so one wheel cannot steal the other', () => {
    expect(reduce(openOnNorth, { kind: 'motion', wheel: 2, x: 0, y: 1 })).toEqual({
      kind: 'state',
      state: openOnNorth
    })
  })

  it('cancels on B and on controller disconnect', () => {
    // B leaves a held stick behind, so the wheel is spent until that stick comes back.
    expect(reduce(openOnNorth, { kind: 'back' })).toEqual({ kind: 'cancel', spent: 1 })
    expect(reduce(openOnNorth, { kind: 'disconnect' })).toEqual({ kind: 'cancel', spent: null })
  })

  it('leaves A and B to the focused surface while the wheel is closed', () => {
    for (const event of [{ kind: 'confirm' }, { kind: 'back' }, { kind: 'disconnect' }] as const) {
      expect(reduce(CLOSED_WHEEL, event)).toEqual({ kind: 'state', state: CLOSED_WHEEL })
    }
  })
})

describe('failure behaviour (002 §6)', () => {
  it('opens an empty preset with no lock, and A cancels', () => {
    const empty = preset({ segmentsFor: () => [] })
    const opened = stateAfter(reduce(CLOSED_WHEEL, UP, empty))

    expect(opened).toEqual({ kind: 'open', wheel: 1, path: [], locked: null })
    expect(reduce(opened, { kind: 'confirm' }, empty)).toEqual({ kind: 'cancel', spent: 1 })
  })

  it('cancels A on an unavailable lock rather than delegating it', () => {
    const disabled = preset({ segmentsFor: () => [segment('north', 0, 'unavailable')] })

    expect(reduce(openOnNorth, { kind: 'confirm' }, disabled)).toEqual({ kind: 'cancel', spent: 1 })
  })

  it('commits an unknown lock, because unproven is not refused', () => {
    const unproven = preset({ segmentsFor: () => [segment('north', 0, 'unknown')] })

    expect(reduce(openOnNorth, { kind: 'confirm' }, unproven)).toEqual({
      kind: 'commit',
      wheel: 1,
      segmentId: 'north'
    })
  })

  it('cancels when the locked segment has unmounted since it was locked', () => {
    const unmounted = preset({ segmentsFor: () => [segment('east', QUARTER)] })

    expect(reduce(openOnNorth, { kind: 'confirm' }, unmounted)).toEqual({
      kind: 'cancel',
      spent: 1
    })
  })

  it('closes on every terminal outcome, spending the wheel when its stick may still be out', () => {
    expect(stateAfter({ kind: 'commit', wheel: 1, segmentId: 'north' })).toEqual({
      kind: 'closed',
      spent: 1
    })
    expect(stateAfter({ kind: 'cancel', spent: null })).toEqual(CLOSED_WHEEL)
    expect(stateAfter({ kind: 'cancel', spent: 2 })).toEqual({ kind: 'closed', spent: 2 })
  })
})

/** A stick held out through a commit or a B must not reopen the wheel it just closed. */
describe('a spent wheel (005)', () => {
  const spent: WheelState = { kind: 'closed', spent: 1 }

  it('stays closed while its stick is still out, however much it jitters', () => {
    for (const event of [
      UP,
      RIGHT,
      { kind: 'motion', wheel: 1, x: 0.05, y: -0.95 } satisfies WheelEvent
    ]) {
      expect(reduce(spent, event)).toEqual({ kind: 'state', state: spent })
    }
  })

  it('is cleared when the stick comes back to centre, and opens again after that', () => {
    const cleared = stateAfter(reduce(spent, CENTRED))

    expect(cleared).toEqual(CLOSED_WHEEL)
    expect(stateAfter(reduce(cleared, UP)).kind).toBe('open')
  })

  it('does not stop the other wheel from opening', () => {
    expect(stateAfter(reduce(spent, { kind: 'motion', wheel: 2, x: 0, y: 1 })).kind).toBe('open')
  })
})

describe('a wheel that opens a wheel (005 USE-R10)', () => {
  const opener: WheelSegment = { ...segment('launch', 0), opens: true, bindingId: 'agent.launch' }
  const choices = [segment('claude', 0), segment('codex', Math.PI)]
  const nested = preset({
    segmentsFor: (wheel, path) => (wheel === 1 ? (path.length === 0 ? [opener] : choices) : [])
  })
  const onOpener: WheelState = { kind: 'open', wheel: 1, path: [], locked: 'launch' }

  it('descends instead of committing, and runs nothing', () => {
    const outcome = reduce(onOpener, { kind: 'confirm' }, nested)

    expect(outcome).toEqual({ kind: 'descend', wheel: 1, path: ['agent.launch'] })
    expect(stateAfter(outcome)).toEqual({
      kind: 'open',
      wheel: 1,
      path: ['agent.launch'],
      locked: null
    })
  })

  it('locks among the new segments, and commits one of them', () => {
    const inside = stateAfter(reduce(onOpener, { kind: 'confirm' }, nested))
    const locked = stateAfter(reduce(inside, UP, nested))

    expect(locked).toMatchObject({ path: ['agent.launch'], locked: 'claude' })
    expect(reduce(locked, { kind: 'confirm' }, nested)).toEqual({
      kind: 'commit',
      wheel: 1,
      segmentId: 'claude'
    })
  })

  it('does not commit from a descent with nothing locked: A cancels it', () => {
    const inside = stateAfter(reduce(onOpener, { kind: 'confirm' }, nested))

    expect(reduce(inside, { kind: 'confirm' }, nested)).toEqual({ kind: 'cancel', spent: 1 })
  })

  it('steps back one level on B, and closes on the next', () => {
    const inside: WheelState = { kind: 'open', wheel: 1, path: ['agent.launch'], locked: 'claude' }

    const back = reduce(inside, { kind: 'back' }, nested)
    expect(back).toEqual({ kind: 'ascend', wheel: 1, path: [] })
    expect(stateAfter(back)).toEqual({ kind: 'open', wheel: 1, path: [], locked: null })
    expect(reduce(stateAfter(back), { kind: 'back' }, nested)).toEqual({ kind: 'cancel', spent: 1 })
  })

  it('cancels the whole wheel when the stick returns to centre inside a menu', () => {
    const inside: WheelState = { kind: 'open', wheel: 1, path: ['agent.launch'], locked: 'claude' }

    expect(reduce(inside, CENTRED, nested)).toEqual({ kind: 'cancel', spent: null })
  })

  it('refuses to descend into a menu that is not available, which cancels', () => {
    const greyed = preset({ segmentsFor: () => [{ ...opener, availability: 'unavailable' }] })

    expect(reduce(onOpener, { kind: 'confirm' }, greyed)).toEqual({ kind: 'cancel', spent: 1 })
  })

  it('opens an empty menu with no lock, rather than refusing to show it', () => {
    const empty = preset({ segmentsFor: (_wheel, path) => (path.length === 0 ? [opener] : []) })
    const inside = stateAfter(reduce(onOpener, { kind: 'confirm' }, empty))

    expect(stateAfter(reduce(inside, UP, empty))).toMatchObject({ locked: null })
  })

  it('pages like a menu: each page is one more level, and B steps back a page', () => {
    const page2: WheelState = {
      kind: 'open',
      wheel: 1,
      path: ['agent.launch', 'agent.launch#2'],
      locked: 'codex'
    }

    expect(reduce(page2, { kind: 'back' }, nested)).toEqual({
      kind: 'ascend',
      wheel: 1,
      path: ['agent.launch']
    })
  })
})
