import type { ControllerIntent } from './controller-intent'
import type { ControllerSample } from './controller-sample'
import { axisOf } from './sample-edges'

/**
 * While a wheel is open the triggers steer it: `R2` selects what the stick points at and `L2`
 * backs out, so the right thumb never has to leave the stick for a face button. `A` and `B` are
 * spent under a wheel, and so is scroll: the pad belongs to the wheel (`005` USE-R11).
 *
 * A pull has to be a deliberate one, which is why a trigger fires on crossing a half-pull rather
 * than on the dead zone that starts a scroll. One already held when the wheel opened never fires,
 * and one pulled under a wheel does not scroll the moment the wheel closes: it stays spent until
 * it is let go.
 */

type Trigger = 'l2' | 'r2'

const TRIGGERS: readonly Trigger[] = ['l2', 'r2']
const INTENT_OF: Record<Trigger, Extract<ControllerIntent, { kind: 'confirm' | 'back' }>> = {
  r2: { kind: 'confirm' },
  l2: { kind: 'back' }
}
const TRIGGER_OF_SCROLL = { up: 'l2', down: 'r2' } as const satisfies Record<string, Trigger>
const FIRM_PULL = 0.5

/** The two controls as printed on the pad, for whatever draws what an open wheel answers to. */
export const WHEEL_TRIGGER_NAMES = { select: 'R2', back: 'L2' } as const

export type WheelTriggerSteering = (
  previous: ControllerSample,
  next: ControllerSample,
  intents: readonly ControllerIntent[],
  captured: boolean,
  triggerDeadZone: number
) => readonly ControllerIntent[]

export function createWheelTriggerSteering(): WheelTriggerSteering {
  // Triggers pulled while a wheel was open, until they come back up.
  const spent = new Set<Trigger>()

  return (previous, next, intents, captured, triggerDeadZone) => {
    if (!next.connected) {
      spent.clear()
      return intents
    }
    for (const trigger of TRIGGERS) {
      if (axisOf(next, trigger) <= triggerDeadZone) {
        spent.delete(trigger)
      } else if (captured) {
        spent.add(trigger)
      }
    }

    const steered: ControllerIntent[] = []
    for (const intent of intents) {
      if (intent.kind === 'scroll') {
        if (captured || spent.has(TRIGGER_OF_SCROLL[intent.direction])) {
          continue
        }
      } else if (captured && (intent.kind === 'confirm' || intent.kind === 'back')) {
        continue
      }
      steered.push(intent)
    }
    if (captured) {
      for (const trigger of TRIGGERS) {
        if (axisOf(previous, trigger) < FIRM_PULL && axisOf(next, trigger) >= FIRM_PULL) {
          steered.push(INTENT_OF[trigger])
        }
      }
    }
    return steered
  }
}
