/**
 * DECK-R42: data from the desktop is parsed leniently in the deck. A field added upstream must
 * never blank a screen, and a status or kind this build has never heard of falls back to a neutral
 * state rather than being dropped or shown as something it is not.
 *
 * Orca's own reply schemas mostly salvage already (`looseObject` plus `salvagedOptional`); these
 * helpers are for the fields a screen draws a decision from, where "unknown" has to be a value.
 */
export type NeutralValue = 'unknown'

const UNKNOWN: NeutralValue = 'unknown'

export function lenientRecord(raw: unknown): Readonly<Record<string, unknown>> {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {}
}

/** A known value, or `unknown`: never the first entry, never a guess. */
export function lenientEnum<T extends string>(raw: unknown, known: readonly T[]): T | NeutralValue {
  return typeof raw === 'string' && known.includes(raw as T) ? (raw as T) : UNKNOWN
}

/** Items that parse, in order; one unreadable entry costs its own row, not the list. */
export function lenientList<T>(raw: unknown, item: (value: unknown) => T | null): readonly T[] {
  if (!Array.isArray(raw)) {
    return []
  }
  const items: T[] = []
  for (const value of raw) {
    const parsed = item(value)
    if (parsed !== null) {
      items.push(parsed)
    }
  }
  return items
}

export function lenientText(raw: unknown): string {
  return typeof raw === 'string' ? raw : ''
}

export function lenientNumber(raw: unknown, fallback: number): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw
  }
  // Hosts differ on whether a numeric field arrives as a string; a number that parses is the number.
  if (typeof raw === 'string' && raw.trim() !== '') {
    const parsed = Number(raw)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return fallback
}

/** Runs a parser and answers `null` instead of throwing: a bad row is data, not an outage. */
export function lenientParse<T>(parse: (raw: unknown) => T | null, raw: unknown): T | null {
  try {
    return parse(raw)
  } catch {
    return null
  }
}

/** The fields this build knows about, plus whatever else the host sent, untouched. */
export function withUnknownFields(
  known: Readonly<Record<string, unknown>>,
  raw: unknown
): Readonly<Record<string, unknown>> {
  return { ...lenientRecord(raw), ...known }
}
