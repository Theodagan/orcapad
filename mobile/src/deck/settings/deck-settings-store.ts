import AsyncStorage from '@react-native-async-storage/async-storage'
import { useSyncExternalStore } from 'react'
import { isRecord } from '../host/lenient-host-data'

/**
 * The deck's own preferences — the ones Orca has no setting for. One store, so the split keyboard
 * (T65), the focus tick (T36) and the source-control chords (T88) read the same value.
 */
export type DeckSettings = {
  /** Landscape halves in the side-panel slots instead of bottom keys (KEY-2, IH-14). */
  readonly splitKeys: boolean
  /** A light click plus haptics on controller focus moves only (SD-9). */
  readonly focusTick: boolean
  readonly haptics: boolean
  readonly sounds: boolean
  /** The dev-only wheel latency overlay (T72). */
  readonly wheelLatencyReadout: boolean
}

export const DEFAULT_DECK_SETTINGS: DeckSettings = {
  splitKeys: true,
  focusTick: true,
  haptics: true,
  sounds: true,
  wheelLatencyReadout: false
}

const SETTINGS_KEY = 'orca:deck:settings'

export type DeckSettingsStore = {
  get(): DeckSettings
  set(patch: Partial<DeckSettings>): Promise<void>
  subscribe(listener: () => void): () => void
  /** Loads the stored copy once; the defaults show until it lands. */
  start(): Promise<void>
}

/** Reads each stored field, keeping the default for anything unreadable (DECK-R42). */
export function parseDeckSettings(raw: string | null): DeckSettings {
  if (raw === null) {
    return DEFAULT_DECK_SETTINGS
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) {
      return DEFAULT_DECK_SETTINGS
    }
    const booleanOr = (key: keyof DeckSettings): boolean => {
      const value = parsed[key]
      return typeof value === 'boolean' ? value : DEFAULT_DECK_SETTINGS[key]
    }
    return {
      splitKeys: booleanOr('splitKeys'),
      focusTick: booleanOr('focusTick'),
      haptics: booleanOr('haptics'),
      sounds: booleanOr('sounds'),
      wheelLatencyReadout: booleanOr('wheelLatencyReadout')
    }
  } catch {
    return DEFAULT_DECK_SETTINGS
  }
}

export function createDeckSettingsStore(): DeckSettingsStore {
  let current = DEFAULT_DECK_SETTINGS
  let started: Promise<void> | null = null
  const listeners = new Set<() => void>()

  const publish = (next: DeckSettings): void => {
    current = next
    for (const listener of listeners) {
      listener()
    }
  }

  return {
    get: () => current,
    async set(patch) {
      publish({ ...current, ...patch })
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(current))
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    start() {
      started ??= AsyncStorage.getItem(SETTINGS_KEY)
        .then((raw) => publish(parseDeckSettings(raw)))
        .catch((error: unknown) => {
          console.warn('Deck settings could not be loaded', error)
        })
      return started
    }
  }
}

export const deckSettingsStore = createDeckSettingsStore()

export function useDeckSettings(): DeckSettings {
  return useSyncExternalStore(deckSettingsStore.subscribe, deckSettingsStore.get)
}
