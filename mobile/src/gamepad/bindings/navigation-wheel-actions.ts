import type { WheelActionBinding } from '../wheel/wheel-registry'

/**
 * What the left wheel can do from anywhere in the app (`005` USE-R9): get back to the list of
 * workspaces, and start a new one. Both are navigation the app already has, so this only names
 * them. The ids are what a preset points at; the screen that owns the router supplies the doing.
 */
export const NAVIGATION_WHEEL_ACTION_IDS = {
  backToMenu: 'nav.back-to-menu',
  newWorktree: 'nav.new-worktree',
  focusMode: 'nav.focus-mode',
  shortcuts: 'nav.shortcuts'
} as const

export type NavigationWheelOptions = {
  /** The host the user is working on; null on the home screen, where neither action has a host. */
  readonly hostId: string | null
  /** Already looking at that host's workspace list, where "back" would go nowhere. */
  readonly atWorkspaceList: boolean
  readonly onBackToMenu: () => void
  readonly onNewWorktree: () => void
}

export function navigationWheelActions(
  options: NavigationWheelOptions
): readonly WheelActionBinding[] {
  const hasHost = options.hostId !== null
  return [
    {
      id: NAVIGATION_WHEEL_ACTION_IDS.backToMenu,
      label: 'Back to menu',
      availability: hasHost && !options.atWorkspaceList ? 'available' : 'unavailable',
      run: options.onBackToMenu
    },
    {
      id: NAVIGATION_WHEEL_ACTION_IDS.newWorktree,
      label: 'New worktree',
      availability: hasHost ? 'available' : 'unavailable',
      run: options.onNewWorktree
    }
  ]
}
