import { beforeEach, describe, expect, it, vi } from 'vitest'

const stored = vi.hoisted(() => new Map<string, string>())
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => stored.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      stored.set(key, value)
    })
  }
}))

const { createDeckSettingsStore, DEFAULT_DECK_SETTINGS, parseDeckSettings } =
  await import('./deck-settings-store')

beforeEach(() => {
  stored.clear()
})

describe('deck settings store', () => {
  it('starts from the defaults', async () => {
    const store = createDeckSettingsStore()
    await store.start()
    expect(store.get()).toEqual(DEFAULT_DECK_SETTINGS)
    expect(store.get().splitKeys).toBe(true)
    expect(store.get().wheelLatencyReadout).toBe(false)
  })

  it('persists a change and reads it back in a fresh store', async () => {
    const first = createDeckSettingsStore()
    await first.set({ splitKeys: false, focusTick: false })

    const second = createDeckSettingsStore()
    await second.start()
    expect(second.get()).toMatchObject({ splitKeys: false, focusTick: false })
  })

  it('notifies subscribers on every change', async () => {
    const store = createDeckSettingsStore()
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)
    await store.set({ haptics: false })
    unsubscribe()
    await store.set({ haptics: true })
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('keeps the default for a field it cannot read', () => {
    expect(parseDeckSettings('{"splitKeys":"yes","focusTick":false}')).toEqual({
      ...DEFAULT_DECK_SETTINGS,
      focusTick: false
    })
    expect(parseDeckSettings('not json')).toEqual(DEFAULT_DECK_SETTINGS)
    expect(parseDeckSettings(null)).toEqual(DEFAULT_DECK_SETTINGS)
  })
})
