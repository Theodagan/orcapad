import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { focusTargetFor, type SurfaceBinding } from '../../gamepad/bindings/surface-binding'
import { useSurfaceBinding } from '../../gamepad/bindings/use-surface-binding'
import { useControllerBinding } from '../../gamepad/controller-provider'
import { isDown } from '../../gamepad/controller-input/sample-edges'
import type { ControllerIntent } from '../../gamepad/controller-input/controller-intent'
import { createDeckChordMatcher, DECK_MODIFIER_BUTTON } from './deck-chord-input'
import type { DeckIntent, DeckScreenScope } from './chord-table'

/** What a deck screen does with each intent. An intent with no handler is not offered. */
export type DeckActionHandlers = Partial<Record<DeckIntent, (input: DeckIntentInput) => void>>

/** Enough for a handler to act without reading controller state again. */
export type DeckIntentInput = {
  readonly intent: DeckIntent
  /** Trigger pressure for the scroll intents, 0..1. */
  readonly pressure: number
}

/** Whether the deck's modifier (Y) is held right now; re-renders only when it flips. */
export function useDeckModifierHeld(): boolean {
  const { reader } = useControllerBinding()
  const held = useRef(false)
  const subscribe = useMemo(
    () => (notify: () => void) =>
      reader.subscribe((sample) => {
        const next = sample.connected && isDown(sample, DECK_MODIFIER_BUTTON)
        if (next !== held.current) {
          held.current = next
          notify()
        }
      }),
    [reader]
  )
  return useSyncExternalStore(subscribe, () => held.current)
}

/**
 * T26/DECK-R40: while a deck screen is mounted, the deck's chord table answers the controller.
 * Orca's per-screen bindings are not mounted on deck routes at all, so nothing of theirs fires
 * here; the deck registers one focus target for the intents only it interprets (scrolling).
 */
export function useDeckBindings(args: {
  readonly scope: DeckScreenScope
  readonly handlers: DeckActionHandlers
}): void {
  const { reader } = useControllerBinding()
  const handlersNow = useRef(args.handlers)
  handlersNow.current = args.handlers

  useEffect(() => {
    const matcher = createDeckChordMatcher()
    let previous = reader.current()
    return reader.subscribe((sample) => {
      const intents = matcher(previous, sample)
      previous = sample
      for (const intent of intents) {
        handlersNow.current[intent]?.({ intent, pressure: 0 })
      }
    })
  }, [reader])

  const binding = useMemo<SurfaceBinding>(() => {
    const scroll = (intent: ControllerIntent): void => {
      if (intent.kind !== 'scroll') {
        return
      }
      const deckIntent: DeckIntent = intent.direction === 'up' ? 'scroll-up' : 'scroll-down'
      handlersNow.current[deckIntent]?.({ intent: deckIntent, pressure: intent.velocity })
    }
    const target = focusTargetFor('deck', [['scroll', scroll]])
    return { focusTarget: target, wheelActions: [] }
  }, [])

  useSurfaceBinding(binding)
}
