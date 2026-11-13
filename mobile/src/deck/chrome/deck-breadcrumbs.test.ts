import { describe, expect, it } from 'vitest'
import { crumbLabelKey, deckBreadcrumbs, type DeckCrumbNames } from './deck-breadcrumbs'
import { resolveDeckContext } from '../context/deck-context'

const NO_NAMES: DeckCrumbNames = { host: null, project: null, workspace: null, session: null }

describe('the deck breadcrumb', () => {
  it('names only the host on a destination route', () => {
    const context = resolveDeckContext({
      pathname: '/deck/sessions',
      params: { hostId: 'alpha' }
    })

    expect(deckBreadcrumbs(context, NO_NAMES)).toEqual([{ kind: 'host', id: 'alpha', name: null }])
  })

  it('adds the project a destination was opened from', () => {
    const context = resolveDeckContext({
      pathname: '/deck/sessions',
      params: { hostId: 'alpha', projectId: 'orca' }
    })

    expect(deckBreadcrumbs(context, NO_NAMES).map(crumbLabelKey)).toEqual([
      'deck.crumb.host',
      'deck.crumb.project'
    ])
  })

  it('stops at the workspace on a workspace route', () => {
    const context = resolveDeckContext({
      pathname: '/deck/w/alpha/wt-1',
      params: { hostId: 'alpha', worktreeId: 'wt-1' }
    })

    expect(deckBreadcrumbs({ ...context, projectId: 'orca' }, NO_NAMES)).toEqual([
      { kind: 'host', id: 'alpha', name: null },
      { kind: 'project', id: 'orca', name: null },
      { kind: 'workspace', id: 'wt-1', name: null }
    ])
  })

  it('ends on the session, named when a caller resolved one', () => {
    const context = resolveDeckContext({
      pathname: '/deck/s/alpha/wt-1',
      params: { hostId: 'alpha', worktreeId: 'wt-1', sessionId: 'run-7' }
    })

    const crumbs = deckBreadcrumbs(context, { ...NO_NAMES, host: 'Retroid' })

    expect(crumbs[crumbs.length - 1]).toEqual({ kind: 'session', id: 'run-7', name: null })
    expect(crumbs[0]).toEqual({ kind: 'host', id: 'alpha', name: 'Retroid' })
  })

  it('draws nothing on a route the deck does not know', () => {
    expect(
      deckBreadcrumbs(resolveDeckContext({ pathname: '/elsewhere', params: {} }), NO_NAMES)
    ).toEqual([])
  })
})
