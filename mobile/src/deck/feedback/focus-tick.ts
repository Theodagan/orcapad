/**
 * SD-9: a light click plus a haptic tick when the controller moves focus. Only controller moves:
 * a finger already knows where it landed, and a tick on every touch would be noise.
 */
export type FocusMove = {
  readonly previous: string | null
  readonly next: string | null
  readonly source: 'pad' | 'touch'
}

export type FocusTickSinks = {
  readonly click: () => void
  readonly haptic: () => void
}

export function shouldTick(move: FocusMove, enabled: boolean): boolean {
  return enabled && move.source === 'pad' && move.next !== null && move.next !== move.previous
}

/** Returns the notifier a focus owner calls on every move; it decides whether anything plays. */
export function createFocusTick(
  isEnabled: () => boolean,
  sinks: FocusTickSinks
): (move: FocusMove) => void {
  return (move) => {
    if (!shouldTick(move, isEnabled())) {
      return
    }
    sinks.click()
    sinks.haptic()
  }
}
