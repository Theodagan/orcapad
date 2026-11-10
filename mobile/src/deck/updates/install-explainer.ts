import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * T21/DECK-R49: Android will not install an app it has never been allowed to install. The deck
 * explains that once, before the first install, and then never again — a dialog on every update
 * would be worse than the permission screen it explains.
 */
const EXPLAINER_SHOWN_KEY = 'orca:deck:installExplainerShown'

/** Whether the explainer still has something to say (it does not, once it has been shown). */
export function shouldExplainInstall(alreadyShown: boolean): boolean {
  return !alreadyShown
}

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
