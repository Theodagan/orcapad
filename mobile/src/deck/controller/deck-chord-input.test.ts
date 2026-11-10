import { describe, expect, it } from 'vitest'
import type {
  ControllerButton,
  ControllerSample
} from '../../gamepad/controller-input/controller-sample'
import { neutralSample } from '../../gamepad/controller-input/controller-sample'
import { createDeckChordMatcher, DICTATION_HOLD_MS, PANEL_TOGGLE_HOLD_MS } from './deck-chord-input'
import type { DeckIntent } from './chord-table'

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
  for (const [axis, value] of Object.entries(axes)) {
    axisValues.set(axis as ControllerAxis, value)
  }
  return { ...base, buttons, axes: axisValues, connected: true }
}

/** Feeds a sequence of (buttons down, time) and collects every intent in order. */
type Step = readonly [
  readonly ControllerButton[],
  number,
  (Partial<Record<ControllerAxis, number>> | undefined)?
]

function run(steps: readonly Step[]): DeckIntent[] {
  const matcher = createDeckChordMatcher()
  let previous = sample([], 0)
  const intents: DeckIntent[] = []
  for (const [down, at, axes] of steps) {
    const next = sample(down, at, axes)
    intents.push(...matcher(previous, next))
    previous = next
  }
  return intents
}

describe('deck chord matcher', () => {
  it('treats Y as a modifier: a Y tap alone fires nothing', () => {
    expect(
      run([
        [[], 0],
        [['y'], 10],
        [[], 60]
      ])
    ).toEqual([])
  })

  it('dismisses on B and goes back on Y+B, never switching destination on B', () => {
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
  })

  it('moves panel focus on an L1 tap and toggles the panel on a Y + L1 hold', () => {
    expect(
      run([
        [[], 0],
        [['lb'], 10],
        [[], 90]
      ])
    ).toEqual(['focus-previous-panel'])
    expect(
      run([
        [[], 0],
        [['y'], 10],
        [['y', 'lb'], 20],
        [['y', 'lb'], 20 + PANEL_TOGGLE_HOLD_MS],
        [[], 600]
      ])
    ).toEqual(['toggle-panel'])
  })

  it('does not toggle a panel on a Y + L1 press that is let go quickly', () => {
    expect(
      run([
        [[], 0],
        [['y'], 10],
        [['y', 'lb'], 20],
        [['y'], 60],
        [[], 100]
      ])
    ).toEqual([])
  })

  it('toggles dictation only after the Start hold threshold', () => {
    // A quick Start is Help; the hold is what dictates (PAD-7).
    expect(
      run([
        [[], 0],
        [['start'], 10],
        [['start'], 200],
        [[], 220]
      ])
    ).toEqual(['open-help'])
    expect(
      run([
        [[], 0],
        [['start'], 10],
        [['start'], 10 + DICTATION_HOLD_MS],
        [[], 700]
      ])
    ).toEqual(['toggle-dictation'])
  })

  it('leaves L3 and R3 inert alone and opens the key wheels with both', () => {
    expect(
      run([
        [[], 0],
        [['l3'], 10],
        [[], 60]
      ])
    ).toEqual([])
    expect(
      run([
        [[], 0],
        [['r3'], 10],
        [[], 60]
      ])
    ).toEqual([])
    expect(
      run([
        [[], 0],
        [['l3'], 10],
        [['l3', 'r3'], 40],
        [[], 80]
      ])
    ).toEqual(['open-wheels'])
  })

  it('stages with Y + L2 and unstages with Y + R2', () => {
    expect(
      run([
        [[], 0],
        [['y'], 10],
        [['y'], 40, { l2: 0.9 }],
        [['y'], 60, { l2: 0.9 }],
        [[], 90]
      ])
    ).toEqual(['stage-file'])
    expect(
      run([
        [[], 0],
        [['y'], 10],
        [['y'], 40, { r2: 0.8 }],
        [[], 90]
      ])
    ).toEqual(['unstage-file'])
  })

  it('moves the focused pane with the arrows and confirms with A', () => {
    expect(
      run([
        [[], 0],
        [['dpad-up'], 10],
        [[], 40],
        [['dpad-down'], 50],
        [[], 90]
      ])
    ).toEqual(['move-up', 'move-down'])
    expect(
      run([
        [[], 0],
        [['a'], 10],
        [[], 60]
      ])
    ).toEqual(['confirm'])
  })

  it('forgets held buttons when the controller disconnects', () => {
    const matcher = createDeckChordMatcher()
    const down = sample(['y'], 10)
    matcher(sample([], 0), down)
    const disconnected = { ...neutralSample(20), connected: false }
    matcher(down, disconnected)
    expect(matcher(disconnected, sample([], 30))).toEqual([])
  })
})
