import { useMemo } from 'react'
import { LIST_SCROLL_POINTS_PER_SECOND_AT_FULL_PRESSURE } from '../../gamepad/bindings/controller-scroll-rate'
import type { ControllerIntent } from '../../gamepad/controller-input/controller-intent'
import type { DeckActionHandlers, DeckIntentInput } from './use-deck-bindings'

/**
 * PAD-3 and SCR-11: L2/R2 scroll everywhere, as a speed rather than a step, so a light pull creeps
 * and a full pull moves. Outside a wheel and outside the Y layer a trigger means nothing else; the
 * chord table is where that is stated, and its test is where it is checked.
 */
export const DECK_SCROLL_DEAD_ZONE = 0.15

/** Points per second for a trigger pressure, 0 inside the dead zone, monotonic above it. */
export function deckScrollRate(pressure: number): number {
  if (!(pressure > DECK_SCROLL_DEAD_ZONE)) {
    return 0
  }
  const scaled = (pressure - DECK_SCROLL_DEAD_ZONE) / (1 - DECK_SCROLL_DEAD_ZONE)
  return scaled * LIST_SCROLL_POINTS_PER_SECOND_AT_FULL_PRESSURE
}

export type ScrollIntent = Extract<ControllerIntent, { kind: 'scroll' }>

/** Signed points a sample moves: negative is up, positive is down. */
export function deckScrollStep(intent: ScrollIntent): number {
  const rate = deckScrollRate(intent.velocity)
  const points = (rate * Math.max(intent.elapsedMs, 0)) / 1000
  return intent.direction === 'up' ? -points : points
}

/** Handlers to give `useDeckBindings`, so every deck screen scrolls its own content one way. */
export function useDeckScroll(
  onScroll: (points: number) => void
): Pick<DeckActionHandlers, 'scroll-up' | 'scroll-down'> {
  return useMemo(() => {
    const scroll = (input: DeckIntentInput): void => {
      // A speed times the time this sample stands for, so a slow pad scrolls as far as a fast one.
      const points = (deckScrollRate(input.pressure) * input.elapsedMs) / 1000
      if (points > 0) {
        onScroll(input.intent === 'scroll-up' ? -points : points)
      }
    }
    return { 'scroll-up': scroll, 'scroll-down': scroll }
  }, [onScroll])
}
