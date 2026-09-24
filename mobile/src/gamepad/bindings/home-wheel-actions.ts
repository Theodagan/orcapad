import type { WheelActionBinding } from '../wheel/wheel-registry'

/**
 * The home screen's wheel contribution (BIND-R10). Kept apart from the hook so a preset can name
 * the id without importing React — a preset is data, and pulling a renderer into it is how the
 * pure binding modules got split in the first place.
 */

export const HOME_WHEEL_ACTION_IDS = {
  pairDesktop: 'home.pair-desktop'
} as const

/** Opening the existing pair route is about as non-destructive as an action gets (WHEEL-R7). */
export function homeWheelActions(onPairDesktop: () => void): readonly WheelActionBinding[] {
  return [
    {
      id: HOME_WHEEL_ACTION_IDS.pairDesktop,
      label: 'Pair desktop',
      availability: 'available',
      run: onPairDesktop
    }
  ]
}
