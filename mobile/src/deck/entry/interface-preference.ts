import { useSyncExternalStore } from 'react'
import {
  DEFAULT_INTERFACE_PREFERENCE,
  getInterfacePreference,
  setInterfacePreference,
  startInterfacePreference,
  subscribeInterfacePreference,
  toggleInterfacePreference,
  type MobileInterfacePreference
} from '../../storage/interface-preference'

/**
 * The deck's view of the interface switch. The store itself lives in Orca's storage layer because
 * the entry route and the Settings row read it too, and neither may import the deck (DECK-R40).
 */
export {
  getInterfacePreference,
  setInterfacePreference,
  startInterfacePreference,
  subscribeInterfacePreference,
  toggleInterfacePreference
}
export type { MobileInterfacePreference }

export const DEFAULT_DECK_INTERFACE: MobileInterfacePreference = DEFAULT_INTERFACE_PREFERENCE

export function useInterfacePreference(): MobileInterfacePreference {
  return useSyncExternalStore(subscribeInterfacePreference, getInterfacePreference)
}

export function useDeckInterface(): boolean {
  return useInterfacePreference() === 'deck'
}
