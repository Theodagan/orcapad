import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react'
import { useFocusEffect } from 'expo-router'
import { useControllerBinding } from '../../gamepad/controller-provider'
import { isDown } from '../../gamepad/controller-input/sample-edges'
import { isDictationActive, shouldToggleDictation } from '../../gamepad/bindings/active-dictation'
import type { ControllerIntent } from '../../gamepad/controller-input/controller-intent'
import {
  createDeckChordMatcher,
  DECK_MODIFIER_BUTTON,
  type DeckIntentEvent
} from './deck-chord-input'
import type { DeckIntent, DeckScreenScope } from './chord-table'

/** What a deck screen does with each intent. An intent with no handler is not offered. */
export type DeckActionHandlers = Partial<Record<DeckIntent, (input: DeckIntentInput) => void>>

/** Enough for a handler to act without reading controller state again. */
export type DeckIntentInput = {
  readonly intent: DeckIntent
  /** Trigger pressure for the scroll intents, 0..1. */
  readonly pressure: number
  /** Time this sample stands for, so scrolling is a speed rather than a step. */
  readonly elapsedMs: number
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
 * The intents the focus and zone plumbing already understands. Sending these through
 * `dispatchIntent` is what keeps one focus language: the focused row, tab strip or pane answers
 * them, and only what nothing accepts falls through to the screen's own handler.
 */
const NAVIGATION_INTENTS: Partial<Record<DeckIntent, ControllerIntent>> = {
  'move-up': { kind: 'move-selection', direction: 'up' },
  'move-down': { kind: 'move-selection', direction: 'down' },
  'move-left': { kind: 'move-horizontal', direction: 'left' },
  'move-right': { kind: 'move-horizontal', direction: 'right' },
  confirm: { kind: 'confirm' },
  dismiss: { kind: 'back' },
  back: { kind: 'back' },
  'item-previous': { kind: 'cycle-tab', direction: 'previous' },
  'item-next': { kind: 'cycle-tab', direction: 'next' }
}

/**
 * T25/T26/DECK-R40: while a deck screen is **focused**, its own scoped table is the only thing
 * reading the pad. Orca's resolver answers with nothing on deck routes (`ControllerShell`), so a
 * press has exactly one dispatcher, and a deck screen retained underneath another screen stops
 * listening instead of answering for the one on top.
 */
export function useDeckBindings(args: {
  readonly scope: DeckScreenScope
  readonly handlers: DeckActionHandlers
}): void {
  const { reader, dispatchIntent, dictation } = useControllerBinding()
  const handlersNow = useRef(args.handlers)
  handlersNow.current = args.handlers
  const scope = args.scope

  const run = useCallback(
    (event: DeckIntentEvent): void => {
      const { intent } = event
      const input: DeckIntentInput = event

      // PAD-7: a live microphone is stoppable wherever focus is; starting needs somewhere to put it.
      if (
        intent === 'toggle-text-input' &&
        isDictationActive(dictation.current()?.activity ?? 'idle')
      ) {
        dictation.current()?.toggle()
        return
      }
      if (intent === 'toggle-dictation') {
        const active = dictation.current()
        if (active === null) {
          return
        }
        if (shouldToggleDictation(active.activity, active.canStart)) {
          active.toggle()
        } else {
          active.onUnavailable()
        }
        return
      }

      if (intent === 'scroll-up' || intent === 'scroll-down') {
        const scroll: ControllerIntent = {
          kind: 'scroll',
          direction: intent === 'scroll-up' ? 'up' : 'down',
          velocity: event.pressure,
          elapsedMs: event.elapsedMs,
          begins: false
        }
        if (!dispatchIntent(scroll)) {
          handlersNow.current[intent]?.(input)
        }
        return
      }

      const navigation = NAVIGATION_INTENTS[intent]
      if (navigation !== undefined && dispatchIntent(navigation)) {
        return
      }
      handlersNow.current[intent]?.(input)
    },
    [dictation, dispatchIntent]
  )

  useFocusEffect(
    useCallback(() => {
      const matcher = createDeckChordMatcher(scope)
      let previous = reader.current()
      const unsubscribe = reader.subscribe((sample) => {
        const events = matcher(previous, sample)
        previous = sample
        for (const event of events) {
          run(event)
        }
      })
      return unsubscribe
    }, [reader, run, scope])
  )
}
