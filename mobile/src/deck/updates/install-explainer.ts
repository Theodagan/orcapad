import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * T21/DECK-R49: Android will not install an app it has never been allowed to install. The deck
 * explains that before the first install. The explanation is a reminder, not the check: every
 * install attempt still opens with a real way to reach Android's own permission screen.
 */
const EXPLAINER_SHOWN_KEY = 'orca:deck:installExplainerShown'

export async function loadInstallExplainerShown(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(EXPLAINER_SHOWN_KEY)) === 'true'
  } catch {
    // Unreadable storage means we cannot prove it was shown, so explain rather than install blind.
    return false
  }
}

export async function saveInstallExplainerShown(): Promise<void> {
  await AsyncStorage.setItem(EXPLAINER_SHOWN_KEY, 'true')
}

/** Android's own "install unknown apps" screen, for this package. */
export function unknownSourcesSettingsUri(packageName: string): string {
  return `package:${packageName}`
}

export const MANAGE_UNKNOWN_APP_SOURCES = 'android.settings.MANAGE_UNKNOWN_APP_SOURCES'
