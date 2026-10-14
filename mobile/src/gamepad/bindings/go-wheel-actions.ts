import type { WheelActionBinding } from '../wheel/wheel-registry'
import type { WheelScreen } from '../wheel/wheel-layouts'
import { GO_ACTION_IDS } from './wheel-action-ids'

/**
 * The GO wheel's Up, New and Settings (`012`), which the shell owns because they need only the
 * router. Files, Changes and History come from the session, and home's New is Pair desktop.
 */

export type GoWheelOptions = {
  readonly screen: WheelScreen
  /** The host in the route; null off a host's screens. */
  readonly hostId: string | null
  readonly atSettings: boolean
  readonly onAllHosts: () => void
  readonly onWorkspaces: () => void
  readonly onNewWorktree: () => void
  readonly onSettings: () => void
}

export function goWheelActions(options: GoWheelOptions): readonly WheelActionBinding[] {
  const { screen, hostId } = options
  const actions: WheelActionBinding[] = []
  if (screen !== 'home') {
    // A host's list goes up to every host; anything inside a host goes up to its workspaces.
    const toWorkspaces = hostId !== null && screen !== 'host'
    actions.push({
      id: GO_ACTION_IDS.up,
      label: toWorkspaces ? 'Workspaces' : 'All hosts',
      availability: 'available',
      run: toWorkspaces ? options.onWorkspaces : options.onAllHosts
    })
    // Home registers its own New (Pair desktop); two owners of one id would retract each other.
    actions.push({
      id: GO_ACTION_IDS.new,
      label: 'New worktree',
      availability: hostId === null ? 'unavailable' : 'available',
      reason: 'Open a host first',
      run: options.onNewWorktree
    })
  }
  actions.push({
    id: GO_ACTION_IDS.settings,
    label: 'Settings',
    availability: options.atSettings ? 'unavailable' : 'available',
    reason: 'Already here',
    run: options.onSettings
  })
  return actions
}

/** Home's New: pairing a desktop is how the first host arrives. */
export function pairDesktopWheelAction(onPairDesktop: () => void): WheelActionBinding {
  return {
    id: GO_ACTION_IDS.new,
    label: 'Pair desktop',
    availability: 'available',
    run: onPairDesktop
  }
}
