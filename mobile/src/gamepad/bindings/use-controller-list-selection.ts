import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useControllerBinding } from '../controller-provider'
import type { IdOf } from './list-selection'

/**
 * Where the pad's cursor is in a rendered list. The raw id is kept as it was chosen, and what it
 * means is resolved against the list as it is now: an id whose row has gone falls back to the
 * first row rather than pointing at nothing (BIND-R1).
 *
 * Handlers read through `current()`, which sees a `select` made earlier in the same sample batch,
 * so a move then a confirm in one sample acts on the row moved to, not the one React last drew.
 * Selection exists only while a pad is attached (BIND-AC10).
 */
export type ControllerListSelection = {
  /** The resolved id, for drawing the cursor. */
  readonly selectedId: string | null
  /** The resolved id right now, for handlers. Stable. */
  readonly current: () => string | null
  /** Stable. */
  readonly select: (id: string | null) => void
}

function resolveSelection<T>(
  items: readonly T[],
  idOf: IdOf<T>,
  raw: string | null,
  fallbackId: string | null,
  connected: boolean
): string | null {
  if (!connected) {
    return null
  }
  if (raw !== null && items.some((item) => idOf(item) === raw)) {
    return raw
  }
  return fallbackId
}

export function useControllerListSelection<T>(
  items: readonly T[],
  idOf: IdOf<T>,
  /** Where the cursor lands first; the first item when omitted. */
  fallbackId?: string | null
): ControllerListSelection {
  const { connected } = useControllerBinding()
  const first = items[0]
  const fallback = fallbackId !== undefined ? fallbackId : first === undefined ? null : idOf(first)
  const [raw, setRaw] = useState<string | null>(null)
  const rawRef = useRef<string | null>(null)
  const latest = useRef({ items, idOf, fallback, connected })
  useLayoutEffect(() => {
    latest.current = { items, idOf, fallback, connected }
  })

  useEffect(() => {
    // A pad that comes back starts from the top again, as on a first press.
    if (!connected) {
      rawRef.current = null
      setRaw(null)
    }
  }, [connected])

  const current = useCallback((): string | null => {
    const live = latest.current
    return resolveSelection(live.items, live.idOf, rawRef.current, live.fallback, live.connected)
  }, [])

  const select = useCallback((id: string | null): void => {
    rawRef.current = id
    setRaw(id)
  }, [])

  return {
    selectedId: resolveSelection(items, idOf, raw, fallback, connected),
    current,
    select
  }
}
