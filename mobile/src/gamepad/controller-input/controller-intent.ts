/**
 * What the app reacts to. Surface-neutral on purpose: a binding knows `scroll`, never `r2`.
 * `move-selection` and `move-horizontal` are emitted only by the provisional D-pad set
 * (CTRL-R2) and are not part of the PRD contract.
 */
export type ControllerIntent =
  | { readonly kind: 'scroll'; readonly direction: 'up' | 'down'; readonly velocity: number }
  | { readonly kind: 'cycle-tab'; readonly direction: 'previous' | 'next' }
  | { readonly kind: 'cycle-workspace'; readonly direction: 'previous' | 'next' }
  | { readonly kind: 'wheel-motion'; readonly wheel: 1 | 2; readonly x: number; readonly y: number }
  | { readonly kind: 'confirm' }
  | { readonly kind: 'back' }
  | { readonly kind: 'stop' }
  | { readonly kind: 'toggle-dictation' }
  | { readonly kind: 'move-selection'; readonly direction: 'up' | 'down' }
  | { readonly kind: 'move-horizontal'; readonly direction: 'left' | 'right' }

export type ControllerIntentKind = ControllerIntent['kind']
