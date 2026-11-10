import { useSyncExternalStore } from 'react'
import {
  DEFAULT_INTERFACE_PREFERENCE,
  loadInterfacePreference,
  saveInterfacePreference,
  type MobileInterfacePreference
} from './preferences'

export type { MobileInterfacePreference }
export { DEFAULT_INTERFACE_PREFERENCE }

// Why: the entry route and the Settings row both read this, and neither may import the deck.
let current: MobileInterfacePreference = DEFAULT_INTERFACE_PREFERENCE
let started: Promise<void> | null = null
const listeners = new Set<() => void>()

function publish(next: MobileInterfacePreference): void {
  if (next === current) {
    return
  }
  current = next
  for (const listener of listeners) {
    listener()
  }
}

/** Loads the stored choice once per launch; the default shows until it lands. */
export function startInterfacePreference(): Promise<void> {
  started ??= loadInterfacePreference()
    .then(publish)
    .catch((error: unknown) => {
      console.warn('Interface preference could not be loaded', error)
    })
  return started
}

export function getInterfacePreference(): MobileInterfacePreference {
  return current
}

export function subscribeInterfacePreference(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Writes through to storage; the in-memory switch happens first so a relaunch never races it. */
export async function setInterfacePreference(next: MobileInterfacePreference): Promise<void> {
  publish(next)
  await saveInterfacePreference(next)
}

/** The Settings row's switch: the deck when Orca is showing, and the other way round. */
export function toggleInterfacePreference(): Promise<void> {
  return setInterfacePreference(current === 'deck' ? 'orca' : 'deck')
}

export function useInterfacePreference(): MobileInterfacePreference {
  return useSyncExternalStore(subscribeInterfacePreference, getInterfacePreference)
}
