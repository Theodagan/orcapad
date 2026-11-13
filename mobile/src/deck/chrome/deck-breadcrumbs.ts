import type { DeckContext } from '../context/deck-context'

/**
 * NAV-13/IH-4/SD-5: the breadcrumb names where the user is and nothing more. A crumb exists only
 * because the resolver found that id in the route (DECK-R4), so a screen cannot draw a trail it
 * does not have; the names themselves arrive from the caller, never invented here.
 */
export type DeckCrumbKind = 'host' | 'project' | 'workspace' | 'session'

export type DeckCrumbName = string | null

export type DeckCrumbNames = Readonly<Record<DeckCrumbKind, DeckCrumbName>>

export type DeckCrumb = {
  readonly kind: DeckCrumbKind
  readonly id: string
  readonly name: DeckCrumbName
}

const CRUMB_ORDER: readonly DeckCrumbKind[] = ['host', 'project', 'workspace', 'session']

const CRUMB_KEYS: Readonly<Record<DeckCrumbKind, string>> = {
  host: 'deck.crumb.host',
  project: 'deck.crumb.project',
  workspace: 'deck.crumb.workspace',
  session: 'deck.crumb.session'
}

const CRUMB_ID_OF: Readonly<Record<DeckCrumbKind, (context: DeckContext) => string | null>> = {
  host: (context) => context.hostId,
  project: (context) => context.projectId,
  workspace: (context) => context.worktreeId,
  session: (context) => context.sessionId
}

/** The trail the context actually carries, outermost first; empty when the route names nothing. */
export function deckBreadcrumbs(context: DeckContext, names: DeckCrumbNames): readonly DeckCrumb[] {
  return CRUMB_ORDER.flatMap((kind) => {
    const id = CRUMB_ID_OF[kind](context)
    return id === null ? [] : [{ kind, id, name: names[kind] }]
  })
}

/** What a crumb reads: the name the caller resolved, or its kind until one arrives. */
export function crumbLabelKey(crumb: DeckCrumb): string {
  return CRUMB_KEYS[crumb.kind]
}
