import { useLayoutEffect, useMemo, useRef } from 'react'
import { TERMINAL_ACCESSORY_KEY_DEFINITIONS } from '../../terminal/terminal-key-definitions'
import { FOCUS_PRIORITY } from '../focus/focus-zones'
import type { WheelActionBinding } from '../wheel/wheel-registry'
import { createScrollIntegrator } from './controller-scroll-rate'
import { focusTargetFor, type IntentHandlerEntry, type SurfaceBinding } from './surface-binding'
import { useSurfaceBinding } from './use-surface-binding'

/**
 * The terminal's controller edge. Scrolling moves whatever owns scroll in the terminal's current
 * mode, and the WebView decides which that is (`005` USE-R3): xterm's own scrollback, or arrow
 * keys and wheel reports for a full-screen TUI, exactly as touch does. The D-pad, `A` and `B`
 * are the arrow keys, Enter and Escape, so an agent waiting on a menu can be driven (USE-R6).
 * Nothing here decodes a stream or claims a viewport.
 *
 * Keys go out through the same raw path the shortcut keys use, not through the gesture gate that
 * touch scrolling goes through: that gate exists to stop a stray swipe typing into a shell, and
 * it silently drops Enter and Escape, which is what an agent menu needs.
 */

/** A control key or quick command the pane can already send, named so a preset can reach it. */
export type TerminalWheelAction = {
  readonly id: string
  readonly label: string
  readonly send: string
  /**
   * WHEEL-R7: a quick command is arbitrary shell, so it is offered disabled until device trials
   * show cancel and commit are trustworthy. A disabled action renders and cancels rather than
   * disappearing (`002` §6), which is precisely what a trial needs to see.
   */
  readonly enabled: boolean
}

/** Full trigger pressure scrolls this many rows a second. A device trial tunes it, not taste. */
export const TERMINAL_LINES_PER_SECOND_AT_FULL_PRESSURE = 40

export type TerminalControllerBindingOptions = {
  readonly handle: string
  /**
   * False for a pane nobody is looking at (another tab's, or one covered by the native chat): it
   * registers nothing, neither focus nor wheel actions, so it can never answer for the visible one.
   */
  readonly enabled: boolean
  /** Signed rows; the WebView routes them by the terminal's mode. */
  readonly scrollLines: (lines: number) => void
  /** Sends bytes to the agent exactly as a shortcut key does. */
  readonly sendKey: (bytes: string) => void
  /** Keep this array's identity stable: a new one re-registers the wheel actions. */
  readonly actions: readonly TerminalWheelAction[]
}

function keyBytes(id: string): string | null {
  return TERMINAL_ACCESSORY_KEY_DEFINITIONS.find((key) => key.id === id)?.bytes ?? null
}

const KEYS = {
  up: keyBytes('arrowUp'),
  down: keyBytes('arrowDown'),
  left: keyBytes('arrowLeft'),
  right: keyBytes('arrowRight'),
  enter: keyBytes('enter'),
  escape: keyBytes('escape')
}

export function useTerminalControllerBinding(options: TerminalControllerBindingOptions): void {
  const { handle, enabled, actions } = options
  // Handlers read the latest callbacks, so the binding does not change identity when a caller's does.
  const latest = useRef(options)
  useLayoutEffect(() => {
    latest.current = options
  })
  const integrator = useMemo(
    () =>
      createScrollIntegrator({
        unitsPerSecond: TERMINAL_LINES_PER_SECOND_AT_FULL_PRESSURE,
        minimumFirstStep: 1
      }),
    []
  )

  const binding = useMemo<SurfaceBinding>(() => {
    const send = (bytes: string | null): void => {
      if (bytes !== null) {
        latest.current.sendKey(bytes)
      }
    }
    const entries: IntentHandlerEntry[] = [
      [
        'scroll',
        (intent) => {
          if (intent.kind !== 'scroll') {
            return
          }
          const lines = integrator.step(intent)
          if (lines !== 0) {
            latest.current.scrollLines(lines)
          }
        }
      ],
      [
        'move-selection',
        (intent) => {
          if (intent.kind === 'move-selection') {
            send(intent.direction === 'up' ? KEYS.up : KEYS.down)
          }
        }
      ],
      [
        'move-horizontal',
        (intent) => {
          if (intent.kind === 'move-horizontal') {
            send(intent.direction === 'left' ? KEYS.left : KEYS.right)
          }
        }
      ],
      ['confirm', () => send(KEYS.enter)],
      ['back', () => send(KEYS.escape)]
    ]

    const wheelActions: readonly WheelActionBinding[] = actions.map((action) => ({
      id: action.id,
      label: action.label,
      availability: action.enabled ? 'available' : 'unavailable',
      run: () => latest.current.sendKey(action.send)
    }))

    return {
      focusTarget: {
        ...focusTargetFor(`terminal:${handle}`, entries),
        zone: 'agent',
        priority: FOCUS_PRIORITY.surface,
        labels: {
          scroll: 'Scroll',
          'move-selection': 'Arrows',
          'move-horizontal': 'Arrows',
          confirm: 'Enter',
          back: 'Esc'
        }
      },
      wheelActions
    }
  }, [handle, actions, integrator])

  useSurfaceBinding(enabled ? binding : null)
}
