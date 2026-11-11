import { TAP_MAX_MS } from '../../gamepad/controller-input/controller-bindings'
import {
  CONTROLLER_BUTTONS,
  type ControllerAxis,
  type ControllerButton,
  type ControllerSample
} from '../../gamepad/controller-input/controller-sample'
import { isDown, wentDown, wentUp } from '../../gamepad/controller-input/sample-edges'
import { bindingFor, type DeckControl, type DeckIntent, type DeckScreenScope } from './chord-table'

/**
 * The deck's own chord matcher. Orca's resolver reads a table whose modifier is X and whose Y tap
 * toggles dictation; the deck's modifier is Y (D2), and Y is a modifier only (PAD-9). Rather than
 * fork the resolver, the deck resolves its own table — same sample vocabulary, same edges.
 *
 * The rules it enforces that a table alone cannot state:
 * - a chord the table does not define does nothing; it never falls through to the bare button
 *   (so Y held with an A press is silent, and Y + up/down is not movement);
 * - a press that begins under the modifier keeps the modifier it began with, so releasing Y mid
 *   press cannot turn one gesture into two;
 * - a binding only fires in a scope where the table gives it one.
 *
 * Pure: samples in, intents out.
 */
export const DECK_MODIFIER_BUTTON: ControllerButton = 'y'
/** PAD-6: holding Y + a shoulder for this long toggles that panel. */
export const PANEL_TOGGLE_HOLD_MS = 450
/** PAD-7: holding Start this long toggles dictation. */
export const DICTATION_HOLD_MS = 650
/** Where a trigger counts as pulled, for the modified-trigger chords and for scrolling. */
export const TRIGGER_DEAD_ZONE = 0.5

/** One thing the deck should do, with what a speed-based intent needs to know. */
export type DeckIntentEvent = {
  readonly intent: DeckIntent
  /** Trigger pressure, 0..1, for the scroll intents. */
  readonly pressure: number
  /** Time this sample stands for, so a scroll is a speed rather than a step. */
  readonly elapsedMs: number
}

const TRIGGERS: readonly (readonly [ControllerAxis, DeckControl])[] = [
  ['l2', 'l2'],
  ['r2', 'r2']
]

const CONTROL_OF_BUTTON: Partial<Record<ControllerButton, DeckControl>> = {
  a: 'a',
  b: 'b',
  x: 'x',
  y: 'y',
  lb: 'l1',
  rb: 'r1',
  l3: 'l3',
  r3: 'r3',
  start: 'start',
  select: 'select'
}

const DIRECTION_OF_BUTTON: Partial<Record<ControllerButton, 'up' | 'down' | 'left' | 'right'>> = {
  'dpad-up': 'up',
  'dpad-down': 'down',
  'dpad-left': 'left',
  'dpad-right': 'right'
}

const MOVEMENT_OF_DIRECTION = {
  up: 'move-up',
  down: 'move-down',
  left: 'move-left',
  right: 'move-right'
} as const

function axisOf(sample: ControllerSample, axis: ControllerAxis): number {
  return sample.axes.get(axis) ?? 0
}

function crossedDeadZone(
  previous: ControllerSample,
  next: ControllerSample,
  axis: ControllerAxis
): boolean {
  return axisOf(previous, axis) < TRIGGER_DEAD_ZONE && axisOf(next, axis) >= TRIGGER_DEAD_ZONE
}

function heldButtons(
  sample: ControllerSample,
  except: ControllerButton
): readonly ControllerButton[] {
  return CONTROLLER_BUTTONS.filter((button) => button !== except && isDown(sample, button))
}

/** The chord that names `control` and, when a partner is given, that partner too. */
function pairBinding(
  control: DeckControl,
  partner: DeckControl,
  scope: DeckScreenScope,
  modifier: boolean
) {
  return (
    bindingFor(control, 'chord', { scope, modifier, withControl: partner }) ??
    bindingFor(partner, 'chord', { scope, modifier, withControl: control })
  )
}

export type DeckChordMatcher = (
  previous: ControllerSample,
  next: ControllerSample
) => readonly DeckIntentEvent[]

export function createDeckChordMatcher(scope: DeckScreenScope = 'root'): DeckChordMatcher {
  const downAt = new Map<ControllerButton, number>()
  /** Whether the modifier was held when this button went down: the gesture's identity. */
  const modifiedAtPress = new Map<ControllerButton, boolean>()
  /** What was already held alongside it: only a partner that arrives later makes it a chord. */
  const partnersAtPress = new Map<ControllerButton, ReadonlySet<ControllerButton>>()
  // A press that became part of a chord cannot also be a tap.
  const spent = new Set<ControllerButton>()
  const heldFired = new Set<ControllerButton>()

  const reset = (): void => {
    downAt.clear()
    modifiedAtPress.clear()
    partnersAtPress.clear()
    spent.clear()
    heldFired.clear()
  }

  return (previous, next) => {
    const elapsedMs = Math.max(next.sampledAt - previous.sampledAt, 0)
    if (!next.connected) {
      reset()
      return []
    }
    const events: DeckIntentEvent[] = []
    const report = (intent: DeckIntent, pressure = 0): void => {
      events.push({ intent, pressure, elapsedMs })
    }
    const modifierHeld = isDown(next, DECK_MODIFIER_BUTTON)

    // A trigger's modified chord fires once per crossing; bare, the triggers scroll (PAD-3/SCR-11).
    for (const [axis, control] of TRIGGERS) {
      const pressure = axisOf(next, axis)
      if (modifierHeld) {
        if (crossedDeadZone(previous, next, axis)) {
          const binding = bindingFor(control, 'chord', { scope, modifier: true })
          if (binding !== undefined) {
            report(binding.intent, pressure)
          }
        }
        continue
      }
      if (pressure >= TRIGGER_DEAD_ZONE) {
        report(control === 'l2' ? 'scroll-up' : 'scroll-down', pressure)
      }
    }

    for (const button of CONTROLLER_BUTTONS) {
      const direction = DIRECTION_OF_BUTTON[button]
      if (direction !== undefined) {
        if (wentDown(previous, next, button)) {
          const resize = modifierHeld
            ? bindingFor('dpad', 'tap', { scope, modifier: true, direction })
            : undefined
          if (resize !== undefined) {
            report(resize.intent)
          } else if (!modifierHeld) {
            report(MOVEMENT_OF_DIRECTION[direction])
          }
        }
        continue
      }
      const control = CONTROL_OF_BUTTON[button]
      if (control === null || control === undefined) {
        continue
      }
      const partners = heldButtons(next, button)

      if (wentDown(previous, next, button)) {
        downAt.set(button, next.sampledAt)
        modifiedAtPress.set(button, modifierHeld)
        partnersAtPress.set(button, new Set(partners))
        const isModifier = button === DECK_MODIFIER_BUTTON
        for (const partner of partners) {
          const partnerControl = CONTROL_OF_BUTTON[partner]
          if (partnerControl === null || partnerControl === undefined) {
            continue
          }
          if (isModifier) {
            const straight = bindingFor(partnerControl, 'chord', { scope, modifier: true })
            if (straight !== undefined) {
              report(straight.intent)
              spent.add(button)
              spent.add(partner)
            }
            continue
          }
          if (partner === DECK_MODIFIER_BUTTON) {
            // The modifier is not a partner control: it is the chord's modifier.
            const modified = bindingFor(control, 'chord', { scope, modifier: true })
            if (modified !== undefined) {
              report(modified.intent)
              spent.add(button)
              spent.add(partner)
            }
            continue
          }
          const pair = pairBinding(control, partnerControl, scope, modifierHeld)
          if (pair !== undefined) {
            report(pair.intent)
            spent.add(button)
            spent.add(partner)
          }
        }
      } else if (
        downAt.has(button) &&
        partners.some((partner) => !partnersAtPress.get(button)?.has(partner))
      ) {
        // A partner arrived while this was held: the press is a chord, whatever it becomes.
        spent.add(button)
      }

      const pressedAt = downAt.get(button)
      if (pressedAt !== undefined && isDown(next, button) && !heldFired.has(button)) {
        const modified = modifiedAtPress.get(button) === true
        const hold =
          control === 'start'
            ? bindingFor('start', 'hold', { scope })
            : control === 'l1' || control === 'r1'
              ? bindingFor(control, 'hold', { scope, modifier: modified })
              : undefined
        const threshold = control === 'start' ? DICTATION_HOLD_MS : PANEL_TOGGLE_HOLD_MS
        if (hold !== undefined && next.sampledAt - pressedAt >= threshold) {
          report(hold.intent)
          heldFired.add(button)
          spent.add(button)
        }
      }

      if (wentUp(previous, next, button)) {
        const quick = pressedAt !== undefined && next.sampledAt - pressedAt <= TAP_MAX_MS
        const modified = modifiedAtPress.get(button) === true
        // The modifier itself never taps, and an unbound modified press stays silent.
        const tap =
          quick && !spent.has(button) && button !== DECK_MODIFIER_BUTTON
            ? bindingFor(control, 'tap', { scope, modifier: modified })
            : undefined
        if (tap !== undefined) {
          report(tap.intent)
        }
        downAt.delete(button)
        modifiedAtPress.delete(button)
        partnersAtPress.delete(button)
        spent.delete(button)
        heldFired.delete(button)
      }
    }
    return events
  }
}
