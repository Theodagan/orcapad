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

const { loadInterfacePreference } = await import('../../storage/preferences')

/** A fresh process: the module's in-memory copy starts over, storage keeps what it had. */
async function restart() {
  vi.resetModules()
  return import('./interface-preference')
}

beforeEach(() => {
  stored.clear()
})

describe('interface preference', () => {
  it('defaults to Orca until the deck is made the default', async () => {
    const preference = await restart()
    await preference.startInterfacePreference()
    expect(preference.getInterfacePreference()).toBe('orca')
  })

  it('writes the choice to storage', async () => {
    const preference = await restart()
    await preference.setInterfacePreference('deck')
    expect(preference.getInterfacePreference()).toBe('deck')
    expect(await loadInterfacePreference()).toBe('deck')
  })

  it('reads the choice back after a restart', async () => {
    const first = await restart()
    await first.setInterfacePreference('deck')

    const second = await restart()
    expect(second.getInterfacePreference()).toBe('orca')
    await second.startInterfacePreference()
    expect(second.getInterfacePreference()).toBe('deck')
  })

  it('notifies subscribers once per change and stops after unsubscribe', async () => {
    const preference = await restart()
    const listener = vi.fn()
    const unsubscribe = preference.subscribeInterfacePreference(listener)
    await preference.setInterfacePreference('deck')
    await preference.setInterfacePreference('deck')
    unsubscribe()
    await preference.setInterfacePreference('orca')
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('keeps Orca when storage holds something unexpected', async () => {
    stored.set('orca:interface', 'nonsense')
    const preference = await restart()
    await preference.startInterfacePreference()
    expect(preference.getInterfacePreference()).toBe('orca')
  })
})
