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

const {
  loadInstallExplainerShown,
  MANAGE_UNKNOWN_APP_SOURCES,
  saveInstallExplainerShown,
  shouldExplainInstall,
  unknownSourcesSettingsUri
} = await import('./install-explainer')

beforeEach(() => {
  stored.clear()
})

describe('install permission explainer', () => {
  it('explains once, then never again', async () => {
    expect(shouldExplainInstall(await loadInstallExplainerShown())).toBe(true)
    await saveInstallExplainerShown()
    expect(shouldExplainInstall(await loadInstallExplainerShown())).toBe(false)
  })

  it('explains rather than guessing when storage cannot be read', async () => {
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage')
    vi.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('storage unavailable'))
    expect(await loadInstallExplainerShown()).toBe(false)
  })

  it('opens Android’s own permission screen for this package', () => {
    expect(MANAGE_UNKNOWN_APP_SOURCES).toBe('android.settings.MANAGE_UNKNOWN_APP_SOURCES')
    expect(unknownSourcesSettingsUri('com.theodagan.orcapad')).toBe('package:com.theodagan.orcapad')
  })
})
