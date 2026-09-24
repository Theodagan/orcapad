/**
 * Which host the controller is pointing at. The list itself stays the existing one: this holds an
 * id, never a copy of the catalog, so a host that appears, disappears or reorders is reflected
 * the next time selection is resolved rather than going stale (BIND-R1).
 */

export type SelectableHost = { readonly id: string }

/** Null when nothing is selected, or when what was selected is no longer in the list. */
export function selectedHost<T extends SelectableHost>(
  hosts: readonly T[],
  selectedId: string | null
): T | null {
  if (selectedId === null) {
    return null
  }
  return hosts.find((host) => host.id === selectedId) ?? null
}

/**
 * Clamped, not wrapped. The home list scrolls on past its hosts into a footer, so wrapping from
 * the last host back to the first would jump the view somewhere the thumb was not asking for.
 *
 * A selection that has gone restarts from the end the move came from, which is the same thing
 * that happens on a first press.
 */
export function nextSelectedHostId<T extends SelectableHost>(
  hosts: readonly T[],
  selectedId: string | null,
  direction: 'up' | 'down'
): string | null {
  if (hosts.length === 0) {
    return null
  }
  const current = hosts.findIndex((host) => host.id === selectedId)
  if (current === -1) {
    return (direction === 'down' ? hosts[0] : hosts[hosts.length - 1])?.id ?? null
  }
  const step = direction === 'down' ? 1 : -1
  const next = Math.min(Math.max(current + step, 0), hosts.length - 1)
  return hosts[next]?.id ?? null
}
