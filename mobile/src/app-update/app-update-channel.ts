import type { AppUpdateSource } from './app-update-source'
import { appStoreUpdateSource } from './app-store-update-source'
import { forkReleaseUpdateSource } from './fork-release-update-source'

/**
 * DECK-R47: this fork ships its own APKs, so Android's update channel is the fork's releases and
 * never upstream's. iOS keeps the store, which is upstream's listing and unchanged here.
 */
export function resolveAppUpdateSource(
  platform: 'android' | 'ios' | 'other'
): AppUpdateSource | null {
  if (platform === 'android') {
    return forkReleaseUpdateSource
  }
  if (platform === 'ios') {
    return appStoreUpdateSource
  }
  return null
}
