import { describe, expect, it } from 'vitest'
import { resolveAppUpdateSource } from './app-update-channel'
import { FORK_REPO, forkReleaseUpdateSource } from './fork-release-update-source'

describe('app update channel', () => {
  it('reads the fork releases on Android', () => {
    expect(resolveAppUpdateSource('android')).toBe(forkReleaseUpdateSource)
    expect(FORK_REPO).toBe('Theodagan/orcapad')
  })

  it('leaves iOS on the store and other platforms without a channel', () => {
    expect(resolveAppUpdateSource('ios')).not.toBe(forkReleaseUpdateSource)
    expect(resolveAppUpdateSource('other')).toBeNull()
  })
})
