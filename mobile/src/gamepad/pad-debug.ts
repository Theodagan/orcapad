import { useSyncExternalStore } from 'react'

/**
 * A line under the hint strip saying what the last presses did: which intent, who took it, and
 * what Android's own focus did. For diagnosing a device build; off in a normal one.
 */
export const PAD_DEBUG = false

const MAX_LINES = 3
let lines: readonly string[] = []
const listeners = new Set<() => void>()

export function padDebug(line: string): void {
  if (!PAD_DEBUG) {
    return
  }
  // A held trigger reports every sample; a repeat bumps a count instead of flooding the lines.
  const [last, ...rest] = lines
  const match = last?.match(/^(.*?)(?: ×(\d+))?$/)
  lines =
    match?.[1] === line
      ? [`${line} ×${Number(match[2] ?? '1') + 1}`, ...rest]
      : [line, ...lines].slice(0, MAX_LINES)
  for (const listener of listeners) {
    listener()
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function usePadDebugLines(): readonly string[] {
  return useSyncExternalStore(subscribe, () => lines)
}
