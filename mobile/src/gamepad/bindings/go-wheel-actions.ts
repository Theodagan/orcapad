import {
  isMenuBinding,
  type WheelActionBinding,
  type WheelBinding,
  type WheelMenuBinding
} from '../wheel/wheel-registry'
import type { WheelScreen } from '../wheel/wheel-layouts'
import { GO_ACTION_IDS, VIEW_ACTION_IDS } from './wheel-action-ids'

/**
 * The GO wheel's shell-owned slots (`012`): Back, New and Settings, which need only the
 * router, and off the session Files, Changes and History of the workspace in the route. The
 * session registers its own three, and home's New is Pair desktop.
 */

export type WorkspacePage = 'files' | 'changes' | 'history'

export type GoWheelOptions = {
  readonly screen: WheelScreen
  /** The host in the route; null off a host's screens. */
  readonly hostId: string | null
  readonly atSettings: boolean
  readonly canGoBack: boolean
  /** Whether the route names a workspace, and which of its pages is showing, if any. */
  readonly workspace: { readonly page: WorkspacePage | null } | null
  readonly onBack: () => void
  readonly onNewWorktree: () => void
  readonly onWorkspacePage: (page: WorkspacePage) => void
  readonly onSettings: () => void
}

const WORKSPACE_PAGES: ReadonlyArray<readonly [WorkspacePage, string, string]> = [
  ['files', GO_ACTION_IDS.files, 'Files'],
  ['changes', GO_ACTION_IDS.changes, 'Changes'],
  ['history', GO_ACTION_IDS.history, 'History']
]

export function goWheelActions(options: GoWheelOptions): readonly WheelActionBinding[] {
  const { screen, hostId, workspace } = options
  const actions: WheelActionBinding[] = [
    {
      id: GO_ACTION_IDS.back,
      label: 'Back',
      availability: options.canGoBack ? 'available' : 'unavailable',
      reason: 'Nowhere to go back to',
      run: options.onBack
    }
  ]
  // Home registers its own New (Pair desktop); two owners of one id would retract each other.
  if (screen !== 'home') {
    actions.push({
      id: GO_ACTION_IDS.new,
      label: 'New worktree',
      availability: hostId === null ? 'unavailable' : 'available',
      reason: 'Open a host first',
      run: options.onNewWorktree
    })
  }
  if (screen !== 'session') {
    // The session owns the real toggle; elsewhere the slot stays and says why it is dark.
    actions.push({
      id: VIEW_ACTION_IDS.chatTerminal,
      label: 'Chat ⇄ Terminal',
      availability: 'unavailable',
      reason: 'Open a session first',
      run: () => {}
    })
    for (const [page, id, label] of WORKSPACE_PAGES) {
      const here = workspace?.page === page
      actions.push({
        id,
        label,
        availability: workspace !== null && !here ? 'available' : 'unavailable',
        reason: here ? 'Already here' : 'Open a workspace first',
        run: () => options.onWorkspacePage(page)
      })
    }
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

const PAGE_ACTION_IDS = [
  GO_ACTION_IDS.files,
  GO_ACTION_IDS.changes,
  GO_ACTION_IDS.history,
  GO_ACTION_IDS.settings
] as const

/**
 * GO's Pages ▸: every action that opens a page, gathered from whoever registered it (the session
 * or the shell) when the menu opens, so a page and its menu entry can never disagree.
 */
export function pagesWheelMenu(lookup: (id: string) => WheelBinding | null): WheelMenuBinding {
  return {
    id: GO_ACTION_IDS.pages,
    label: 'Pages',
    availability: 'available',
    menu: () =>
      PAGE_ACTION_IDS.flatMap((id) => {
        const binding = lookup(id)
        return binding === null || isMenuBinding(binding)
          ? []
          : [
              {
                id: binding.id,
                label: binding.label,
                availability: binding.availability,
                run: binding.run
              }
            ]
      })
  }
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

const PAGE_BY_SEGMENT: Readonly<Record<string, WorkspacePage>> = {
  files: 'files',
  'source-control': 'changes',
  review: 'changes',
  pr: 'changes',
  'agent-history': 'history',
  history: 'history'
}

/** The workspace a route belongs to, read from its file segments as the wheels' screen is. */
export function workspaceOfRoute(
  segments: readonly string[]
): { readonly page: WorkspacePage | null } | null {
  if (segments[0] !== 'h' || segments.at(-1) !== '[worktreeId]') {
    return null
  }
  return { page: PAGE_BY_SEGMENT[segments[2] ?? ''] ?? null }
}
