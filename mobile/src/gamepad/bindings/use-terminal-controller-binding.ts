import { useMemo } from 'react'
import type { ControllerInterception } from '../controller-input/native-controller-reader'
import type { DictationTextTarget } from '../focus/focus-target'
import type { WheelActionBinding } from '../wheel/wheel-registry'
import { shouldDeferToFocusedView } from './terminal-interception'
import { focusTargetFor, type IntentHandlerEntry } from './surface-binding'
import { useSurfaceBinding } from './use-surface-binding'

/**
 * The terminal's controller edge. Scrolling moves the existing local scrollback, control keys and
 * quick commands go out through the pane's existing input callback, and a tapped path still opens
 * through the existing file callback (`003` §7). Nothing here decodes a stream or claims a
 * viewport.
 *
 * Scroll is in whole lines rather than pixels: the WebView clamps by line at both ends of the
 * scrollback, so asking in its own unit is what keeps a held trigger from drifting past the end.
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

export type TerminalControllerBindingOptions = {
  readonly handle: string
  /** Lines per scroll sample; the pane decides, because it knows its own row height. */
  readonly linesPerScroll: number
  readonly scrollLines: (lines: number) => void
  readonly onSend: (bytes: string) => void
  readonly onBack: () => void
  readonly actions: readonly TerminalWheelAction[]
  readonly textTarget?: DictationTextTarget
  /** CTRL-T4's checkpoint, read per sample. Null wherever the native module is absent. */
  readonly interception?: ControllerInterception | null
}

export function useTerminalControllerBinding(options: TerminalControllerBindingOptions): void {
  const { handle, linesPerScroll, scrollLines, onSend, onBack, actions, textTarget, interception } =
    options

  const binding = useMemo(() => {
    const entries: IntentHandlerEntry[] = [
      [
        'scroll',
        (intent) => {
          if (intent.kind !== 'scroll') {
            return
          }
          if (shouldDeferToFocusedView(interception ?? null)) {
            // The WebView already took it; acting here would scroll twice.
            return
          }
          const lines = Math.max(1, Math.round(intent.velocity * linesPerScroll))
          scrollLines(intent.direction === 'up' ? -lines : lines)
        }
      ],
      ['back', onBack]
    ]

    const wheelActions: readonly WheelActionBinding[] = actions.map((action) => ({
      id: action.id,
      label: action.label,
      availability: action.enabled ? 'available' : 'unavailable',
      run: () => onSend(action.send)
    }))

    return {
      focusTarget: focusTargetFor(`terminal:${handle}`, entries, textTarget),
      wheelActions
    }
  }, [handle, linesPerScroll, scrollLines, onSend, onBack, actions, textTarget, interception])

  useSurfaceBinding(binding)
}
