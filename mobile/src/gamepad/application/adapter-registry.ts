import type { GamepadAdapter } from './ports/gamepad-adapter'

/**
 * The composition root. The app shell binds one adapter at startup and every feature reads it
 * from here, which is what lets `gamepad/features/**` and `gamepad/state/**` stay free of any
 * import of `gamepad/adapters/**` — the rule the boundary test enforces.
 *
 * Module-level state on purpose: there is one runtime per app process, and threading an
 * adapter through every component would be the prop-drilling this indirection exists to avoid.
 */

let boundAdapter: GamepadAdapter | null = null

export function bindAdapter(adapter: GamepadAdapter): void {
  boundAdapter = adapter
}

/**
 * Throws when nothing is bound. That is a violated precondition, not a runtime failure, so it
 * is the one thing in this layer that throws rather than returning a `PortResult` (tech.md §3).
 */
export function boundGamepadAdapter(): GamepadAdapter {
  if (boundAdapter === null) {
    throw new Error('No adapter is bound: the app shell calls bindAdapter before it renders.')
  }
  return boundAdapter
}

export function isAdapterBound(): boolean {
  return boundAdapter !== null
}

export function resetAdapterRegistryForTests(): void {
  boundAdapter = null
}
