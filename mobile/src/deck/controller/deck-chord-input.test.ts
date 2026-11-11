import { describe, expect, it } from 'vitest'
import {
  CONTROLLER_AXES,
  neutralSample,
  type ControllerAxis,
  type ControllerButton,
  type ControllerSample
} from '../../gamepad/controller-input/controller-sample'
import {
  createDeckChordMatcher,
  DICTATION_HOLD_MS,
  PANEL_TOGGLE_HOLD_MS,
  type DeckIntentEvent
} from './deck-chord-input'
import type { DeckIntent, DeckScreenScope } from './chord-table'

function sample(
  down: readonly ControllerButton[],
  at: number,
  axes: Partial<Record<ControllerAxis, number>> = {}
): ControllerSample {
  const base = neutralSample(at)
  const buttons = new Map(base.buttons)
  for (const button of down) {
    buttons.set(button, 1)
  }
  const axisValues = new Map(base.axes)
  for (const axis of CONTROLLER_AXES) {
    const value = axes[axis]
    if (value !== undefined) {
      axisValues.set(axis, value)
    }
  }
  return { ...base, buttons, axes: axisValues, connected: true }
}

type Step = readonly [
  readonly ControllerButton[],
  number,
  (Partial<Record<ControllerAxis, number>> | undefined)?
]

/** Feeds a sequence of (buttons down, time) and answers the intents, without the scroll repeats. */
function run(steps: readonly Step[], scope: DeckScreenScope = 'root'): DeckIntent[] {
  return events(steps, scope).map((event) => event.intent)
}

function events(steps: readonly Step[], scope: DeckScreenScope = 'root'): DeckIntentEvent[] {
  const matcher = createDeckChordMatcher(scope)
  let previous = sample([], 0)
  const collected: DeckIntentEvent[] = []
  for (const [down, at, axes] of steps) {
    const next = sample(down, at, axes)
    collected.push(...matcher(previous, next))
    previous = next
  }
  return collected
}

describe('deck chord matcher', () => {
  it('treats Y as a modifier only: a Y tap and every undefined Y chord do nothing', () => {
    expect(
      run([
        [[], 0],
        [['y'], 10],
        [[], 60]
      ])
    ).toEqual([])
    for (const other of ['a', 'x', 'start', 'dpad-up', 'dpad-down', 'l3'] as const) {
      expect(
        run([
          [[], 0],
          [['y'], 10],
          [['y', other], 40],
          [[], 90]
        ])
      ).toEqual([])
    }
  })

  it('dismisses on B, and Y+B is the only back', () => {
    expect(
      run([
        [[], 0],
        [['b'], 10],
        [[], 80]
      ])
    ).toEqual(['dismiss'])
    expect(
      run([
        [[], 0],
        [['y'], 10],
        [['y', 'b'], 40],
        [[], 60]
      ])
    ).toEqual(['back'])
    // Y pressed after B is the same gesture.
    expect(
      run([
        [[], 0],
        [['b'], 10],
        [['b', 'y'], 40],
        [[], 60]
      ])
    ).toEqual(['back'])
  })

  it('steps through the focused area’s items on a bare shoulder press', () => {
    expect(
      run([
        [[], 0],
        [['lb'], 10],
        [[], 90]
      ])
    ).toEqual(['item-previous'])
    expect(
      run([
        [[], 0],
        [['rb'], 10],
        [[], 90]
      ])
    ).toEqual(['item-next'])
  })

  it('opens a side on a Y + shoulder tap and toggles that same side on a 450 ms hold', () => {
    expect(
      run([
        [[], 0],
        [['y'], 10],
        [['y', 'lb'], 20],
        [['y'], 60],
        [[], 100]
      ])
    ).toEqual(['focus-left-panel'])
    expect(
      run([
        [[], 0],
        [['y'], 10],
        [['y', 'rb'], 20],
        [['y', 'rb'], 20 + PANEL_TOGGLE_HOLD_MS],
        [[], 700]
      ])
    ).toEqual(['toggle-right-panel'])
    // The hold fires once, however long it is held.
    expect(
      run([
        [[], 0],
        [['y'], 10],
        [['y', 'lb'], 20],
        [['y', 'lb'], 20 + PANEL_TOGGLE_HOLD_MS],
        [['y', 'lb'], 20 + PANEL_TOGGLE_HOLD_MS * 3],
        [[], 700]
      ])
    ).toEqual(['toggle-left-panel'])
  })

  it('toggles both sides when both shoulders are held with Y, whichever arrives first', () => {
    expect(
      run([
        [[], 0],
        [['y', 'lb'], 10],
        [['y', 'lb', 'rb'], 30],
        [[], 700]
      ])
    ).toEqual(['toggle-both-panels'])
    expect(
      run([
        [[], 0],
        [['y', 'rb'], 10],
        [['y', 'rb', 'lb'], 30],
        [[], 700]
      ])
    ).toEqual(['toggle-both-panels'])
  })

  it('resizes on Y + left/right and never turns Y + arrows into movement', () => {
    expect(
      run([
        [[], 0],
        [['y'], 10],
        [['y', 'dpad-right'], 40],
        [[], 90]
      ])
    ).toEqual(['resize-wider'])
    expect(
      run([
        [[], 0],
        [['y'], 10],
        [['y', 'dpad-left'], 40],
        [[], 90]
      ])
    ).toEqual(['resize-narrower'])
    expect(
      run([
        [[], 0],
        [['dpad-right'], 10],
        [[], 90]
      ])
    ).toEqual(['move-right'])
  })

  it('toggles the text target on a Start tap and dictates only after the 650 ms hold', () => {
    expect(
      run([
        [[], 0],
        [['start'], 10],
        [[], 120]
      ])
    ).toEqual(['toggle-text-input'])
    expect(
      run([
        [[], 0],
        [['start'], 10],
        [['start'], 10 + DICTATION_HOLD_MS],
        [[], 700]
      ])
    ).toEqual(['toggle-dictation'])
  })

  it('scrolls on a bare trigger and never turns a modified trigger into a scroll', () => {
    const scrolling = events([
      [[], 0],
      [['r2'], 16, { r2: 0.9 }],
      [['r2'], 32, { r2: 0.9 }]
    ])
    expect(scrolling.map((event) => event.intent)).toEqual(['scroll-down', 'scroll-down'])
    expect(scrolling[0].pressure).toBe(0.9)
    expect(scrolling[0].elapsedMs).toBe(16)

    expect(
      run([
        [[], 0],
        [['y'], 10],
        [['y'], 20, { r2: 0.9 }],
        [['y'], 40, { r2: 0.9 }]
      ])
    ).toEqual([])
  })

  it('binds the modified triggers per scope, and leaves them free where nothing uses them', () => {
    const staged = (scope: DeckScreenScope) =>
      run(
        [
          [[], 0],
          [['y'], 10],
          [['y'], 20, { r2: 0.9 }],
          [['y'], 40, { r2: 0.9 }]
        ],
        scope
      )
    expect(staged('source-control')).toEqual(['stage-file'])
    expect(staged('file')).toEqual(['next-hunk'])
    expect(staged('request')).toEqual(['arm-allow'])
    expect(staged('tui')).toEqual(['tui-enter'])
    expect(staged('collection')).toEqual([])

    expect(
      run(
        [
          [[], 0],
          [['y'], 10],
          [['y'], 20, { l2: 0.9 }],
          [['y'], 40, { l2: 0.9 }]
        ],
        'source-control'
      )
    ).toEqual(['unstage-file'])
  })

  it('opens the key wheels with both sticks, and only where the table gives them a meaning', () => {
    const bothSticks = [
      [[], 0],
      [['l3'], 10],
      [['l3', 'r3'], 40],
      [[], 80]
    ] as const
    expect(run(bothSticks, 'tui')).toEqual(['open-wheels'])
    expect(run(bothSticks, 'session')).toEqual([])
    expect(
      run([
        [[], 0],
        [['l3'], 10],
        [[], 60]
      ])
    ).toEqual([])
  })

  it('forgets held buttons when the controller disconnects', () => {
    const matcher = createDeckChordMatcher('root')
    const down = sample(['y', 'lb'], 10)
    matcher(sample([], 0), down)
    const disconnected = { ...neutralSample(20), connected: false }
    matcher(down, disconnected)
    expect(matcher(disconnected, sample([], 30))).toEqual([])
  })
})
