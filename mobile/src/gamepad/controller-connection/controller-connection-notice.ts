/**
 * When to tell the user their controller is gone.
 *
 * Only after one has actually been seen. A build that has never had a pad attached is not in a
 * failed state — it is a phone — and warning about a disconnect that never happened is how a
 * notice trains people to ignore it (`001` §9).
 */

export type ControllerConnectionHistory = {
  readonly connected: boolean
  /** Latched: a pad seen once makes its absence afterwards a disconnect rather than a default. */
  readonly everConnected: boolean
}

export const INITIAL_CONNECTION_HISTORY: ControllerConnectionHistory = {
  connected: false,
  everConnected: false
}

export function observeConnection(
  history: ControllerConnectionHistory,
  connected: boolean
): ControllerConnectionHistory {
  if (history.connected === connected) {
    return history
  }
  return { connected, everConnected: history.everConnected || connected }
}

export function shouldWarnAboutDisconnect(history: ControllerConnectionHistory): boolean {
  return history.everConnected && !history.connected
}
