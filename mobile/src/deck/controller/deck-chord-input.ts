import { TAP_MAX_MS } from '../../gamepad/controller-input/controller-bindings'
import {
  CONTROLLER_BUTTONS,
  type ControllerAxis,
  type ControllerButton,
  type ControllerSample
} from '../../gamepad/controller-input/controller-sample'
import { isDown, wentDown, wentUp } from '../../gamepad/controller-input/sample-edges'
import { bindingFor, type DeckControl, type DeckIntent } from './chord-table'

/**
 * The deck's own chord matcher. Orca's resolver reads a table whose modifier is X and whose Y tap
 * toggles dictation; the deck's modifier is Y (D2), and Y alone must do nothing (PAD-9). Rather than
 * fork the resolver, the deck resolves its own table in `chord-table.ts` — same sample vocabulary,
 * same tap-versus-chord rules as Orca's tap tracker, different table.
 *
 * Pure: samples in, intents out.
 */
export const DECK_MODIFIER_BUTTON: ControllerButton = 'y'
/** PAD-6: holding Y + a shoulder for this long toggles that panel. */
export const PANEL_TOGGLE_HOLD_MS = 450
/** PAD-7: holding Start this long toggles dictation. */
export const DICTATION_HOLD_MS = 650
/** Where a trigger counts as pulled, for the Y + trigger chords. */
export const TRIGGER_DEAD_ZONE = 0.5

/** A trigger crossing its dead zone fires its chord once, on the way in. */
const TRIGGER_CHORDS: readonly (readonly [ControllerAxis, DeckControl])[] = [
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

const DIRECTION_OF_BUTTON: Partial<Record<ControllerButton, DeckIntent>> = {
  'dpad-up': 'move-up',
  'dpad-down': 'move-down',
  'dpad-left': 'move-left',
  'dpad-right': 'move-right'
}

function controlOf(button: ControllerButton): DeckControl | null {
  return CONTROL_OF_BUTTON[button] ?? null
}

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

export type DeckChordMatcher = (
  previous: ControllerSample,
  next: ControllerSample
) => readonly DeckIntent[]

export function createDeckChordMatcher(): DeckChordMatcher {
  const downAt = new Map<ControllerButton, number>()
  // A press that became part of a chord cannot also be a tap.
  const spent = new Set<ControllerButton>()
  const heldFired = new Set<ControllerButton>()

  const reset = (): void => {
    downAt.clear()
    spent.clear()
    heldFired.clear()
  }

  return (previous, next) => {
    if (!next.connected) {
      reset()
      return []
    }
    const intents: DeckIntent[] = []
    const modifierHeld = isDown(next, DECK_MODIFIER_BUTTON)

    // Y + a trigger is the only meaning a trigger has beyond scrolling (PAD-3, FILE-5).
    if (modifierHeld) {
      for (const [axis, control] of TRIGGER_CHORDS) {
        if (crossedDeadZone(previous, next, axis)) {
          const chord = bindingFor(control, 'chord', { withModifier: true })
          if (chord !== undefined) {
            intents.push(chord.intent)
          }
        }
      }
    }

    for (const button of CONTROLLER_BUTTONS) {
      const direction = DIRECTION_OF_BUTTON[button]
      if (direction !== undefined) {
        // Arrows move the focused pane and repeat; the deck takes the press, not a tap.
        if (wentDown(previous, next, button)) {
          intents.push(direction)
        }
        continue
      }
      const control = controlOf(button)
      if (control === null) {
        continue
      }
      const partners = heldButtons(next, button)

      if (wentDown(previous, next, button)) {
        downAt.set(button, next.sampledAt)
        // This button is the second half of a chord?
        for (const partner of partners) {
          const partnerControl = controlOf(partner)
          if (partnerControl === null) {
            continue
          }
          const chord =
            partner === DECK_MODIFIER_BUTTON
              ? bindingFor(control, 'chord', { withModifier: true })
              : bindingFor(partnerControl, 'chord', { withControl: control })
          if (chord !== undefined) {
            intents.push(chord.intent)
            spent.add(button)
            spent.add(partner)
          }
        }
      } else if (partners.length > 0) {
        // A partner arrived while this was held: the press is a chord, whatever it becomes.
        spent.add(button)
      }

      const pressedAt = downAt.get(button)
      const threshold =
        control === 'start'
          ? DICTATION_HOLD_MS
          : control === 'l1' || control === 'r1'
            ? PANEL_TOGGLE_HOLD_MS
            : null
      if (
        threshold !== null &&
        pressedAt !== undefined &&
        isDown(next, button) &&
        !heldFired.has(button) &&
        next.sampledAt - pressedAt >= threshold
      ) {
        const hold = bindingFor(control, 'hold', { withModifier: modifierHeld })
        // Start needs the modifier state captured the way the table says: Start alone taps Help.
        const holdForControl =
          control === 'start' ? bindingFor('start', 'hold') : modifierHeld ? hold : undefined
        if (holdForControl !== undefined) {
          intents.push(holdForControl.intent)
          heldFired.add(button)
          spent.add(button)
        }
      }

      if (wentUp(previous, next, button)) {
        const quick = pressedAt !== undefined && next.sampledAt - pressedAt <= TAP_MAX_MS
        const tap = quick && !spent.has(button) ? bindingFor(control, 'tap') : undefined
        if (tap !== undefined && control !== DECK_MODIFIER_BUTTON) {
          intents.push(tap.intent)
        }
        downAt.delete(button)
        spent.delete(button)
        heldFired.delete(button)
      }
    }
    return intents
  }
}
