/**
 * What the app reacts to. Surface-neutral on purpose: a binding knows `scroll`, never `r2`.
 * `move-selection` and `move-horizontal` are the D-pad's, contract since `004` LOOP-R2.
 */
export type ControllerIntent =
  | {
      readonly kind: 'scroll'
      readonly direction: 'up' | 'down'
      /** Trigger pressure, 0..1. A speed, not a step: see `elapsedMs`. */
      readonly velocity: number
      /** Time this sample stands for, so distance is speed times time whatever the sample rate. */
      readonly elapsedMs: number
      /** The first sample of a hold: a fresh gesture, which has nothing before it to carry over. */
      readonly begins: boolean
    }
  | { readonly kind: 'cycle-tab'; readonly direction: 'previous' | 'next' }
  | { readonly kind: 'cycle-workspace'; readonly direction: 'previous' | 'next' }
  | { readonly kind: 'wheel-motion'; readonly wheel: 1 | 2; readonly x: number; readonly y: number }
  | { readonly kind: 'switch-zone' }
  | { readonly kind: 'confirm' }
  | { readonly kind: 'back' }
  | { readonly kind: 'toggle-dictation' }
  | { readonly kind: 'move-selection'; readonly direction: 'up' | 'down' }
  | { readonly kind: 'move-horizontal'; readonly direction: 'left' | 'right' }

export type ControllerIntentKind = ControllerIntent['kind']

/** What an intent does on a given surface, in the words a hint bar shows. */
export type IntentLabels = Partial<Record<ControllerIntentKind, string>>
