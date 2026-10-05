import type { ControllerIntent } from '../controller-input/controller-intent'

/**
 * Trigger pressure to distance, over time. The resolver emits a scroll intent per sample and says
 * how much time it stands for, because how often samples come is the hardware's business: a held
 * trigger can send none for seconds, a moving one a hundred a second. Integrating speed over that
 * time makes the distance a property of how hard the trigger is pressed and for how long, so a
 * burst of samples and a steady tick scroll the same (`005` USE-R1, USE-R3).
 */

type ScrollIntent = Extract<ControllerIntent, { readonly kind: 'scroll' }>

/** Full trigger pressure scrolls a list or a transcript this many points a second. */
export const LIST_SCROLL_POINTS_PER_SECOND_AT_FULL_PRESSURE = 900
/** A tap on a trigger always moves at least this much, so it is felt. */
export const LIST_SCROLL_MINIMUM_FIRST_STEP_POINTS = 12

export type ScrollIntegrator = {
  /** Signed whole units to move for this sample (negative is up); the remainder carries over. */
  readonly step: (intent: ScrollIntent) => number
}

export type ScrollIntegratorOptions = {
  /** Distance per second at full pressure: rows for a terminal, points for a list. */
  readonly unitsPerSecond: number
  /** The first step of a gesture is at least this, so a tap always moves something. */
  readonly minimumFirstStep?: number
}

export function createScrollIntegrator(options: ScrollIntegratorOptions): ScrollIntegrator {
  const { unitsPerSecond, minimumFirstStep = 0 } = options
  let lastDirection: ScrollIntent['direction'] | null = null
  let carry = 0

  return {
    step(intent) {
      // Both triggers at once alternate direction every sample, and each flip is a new gesture, so
      // they cancel rather than one of them winning by accident.
      const fresh = intent.begins || intent.direction !== lastDirection
      lastDirection = intent.direction
      if (fresh) {
        carry = 0
      }
      const pressure = Number.isFinite(intent.velocity)
        ? Math.min(Math.max(intent.velocity, 0), 1)
        : 0
      // Squared, so a light squeeze creeps and a full one runs.
      const exact = carry + (pressure * pressure * unitsPerSecond * intent.elapsedMs) / 1000
      const whole = fresh ? Math.max(Math.trunc(exact), minimumFirstStep) : Math.trunc(exact)
      carry = Math.max(0, exact - whole)
      if (whole === 0) {
        return 0
      }
      return intent.direction === 'up' ? -whole : whole
    }
  }
}
