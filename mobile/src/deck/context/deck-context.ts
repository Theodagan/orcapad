import { destinationForPath } from '../navigation/destinations'

/**
 * DECK-R4/UXA-R23: one resolver answers which host, project, workspace, session and request the
 * deck is looking at. Every screen reads it instead of re-parsing its own route, and the answer
 * decides whether session actions exist at all — they appear only on a session screen.
 */
export type DeckScreenKind =
  | 'overview'
  | 'sessions'
  | 'projects'
  | 'approvals'
  | 'ports'
  | 'settings'
  | 'workspace'
  | 'session'
  | 'unknown'

export type DeckContext = {
  readonly screen: DeckScreenKind
  readonly hostId: string | null
  readonly projectId: string | null
  readonly worktreeId: string | null
  readonly sessionId: string | null
  readonly requestId: string | null
}

export type DeckRoute = {
  readonly pathname: string
  readonly params: Readonly<Record<string, string | undefined>>
}

const WORKSPACE_ROUTE = /^\/deck\/w\/([^/]+)\/([^/]+)$/
const SESSION_ROUTE = /^\/deck\/s\/([^/]+)\/([^/]+)$/

function param(params: DeckRoute['params'], key: string): string | null {
  const value = params[key]
  return value === undefined || value === '' ? null : value
}

/** A route in, the deck's whole notion of "where am I" out. */
export function resolveDeckContext(route: DeckRoute): DeckContext {
  const session = SESSION_ROUTE.exec(route.pathname)
  if (session !== null) {
    return {
      screen: 'session',
      hostId: session[1],
      projectId: param(route.params, 'projectId'),
      worktreeId: session[2],
      sessionId: param(route.params, 'sessionId') ?? session[2],
      requestId: param(route.params, 'requestId')
    }
  }
  const workspace = WORKSPACE_ROUTE.exec(route.pathname)
  if (workspace !== null) {
    return {
      screen: 'workspace',
      hostId: workspace[1],
      projectId: param(route.params, 'projectId'),
      worktreeId: workspace[2],
      sessionId: null,
      requestId: null
    }
  }
  const destination = destinationForPath(route.pathname)
  if (destination !== null) {
    return {
      screen: destination.id,
      hostId: param(route.params, 'hostId'),
      projectId: param(route.params, 'projectId'),
      worktreeId: null,
      sessionId: null,
      requestId: destination.id === 'approvals' ? param(route.params, 'requestId') : null
    }
  }
  return {
    screen: 'unknown',
    hostId: null,
    projectId: null,
    worktreeId: null,
    sessionId: null,
    requestId: null
  }
}

/** Session actions (fork, stop, revert) belong to a session screen and nowhere else. */
export function showsSessionActions(context: DeckContext): boolean {
  return context.screen === 'session' && context.hostId !== null && context.worktreeId !== null
}

/** Which host's data a screen reads: a workspace's host, or the only paired host, or none. */
export function hostForContext(
  context: DeckContext,
  pairedHostIds: readonly string[]
): string | null {
  if (context.hostId !== null) {
    return context.hostId
  }
  return pairedHostIds.length === 1 ? pairedHostIds[0] : null
}
