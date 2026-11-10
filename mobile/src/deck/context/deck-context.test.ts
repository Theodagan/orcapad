import { describe, expect, it } from 'vitest'
import {
  hostForContext,
  resolveDeckContext,
  showsSessionActions,
  type DeckRoute
} from './deck-context'

function route(pathname: string, params: Record<string, string | undefined> = {}): DeckRoute {
  return { pathname, params }
}

describe('deck context', () => {
  it('resolves a destination route to its screen', () => {
    expect(resolveDeckContext(route('/deck/sessions'))).toMatchObject({
      screen: 'sessions',
      hostId: null
    })
  })

  it('reads the workspace a route names', () => {
    expect(resolveDeckContext(route('/deck/w/host-1/worktree-9'))).toEqual({
      screen: 'workspace',
      hostId: 'host-1',
      projectId: null,
      worktreeId: 'worktree-9',
      sessionId: null,
      requestId: null
    })
  })

  it('reads a session, including the request it was opened from', () => {
    expect(
      resolveDeckContext(route('/deck/s/host-1/worktree-9', { sessionId: 's-3', requestId: 'r-7' }))
    ).toEqual({
      screen: 'session',
      hostId: 'host-1',
      projectId: null,
      worktreeId: 'worktree-9',
      sessionId: 's-3',
      requestId: 'r-7'
    })
  })

  it('carries a request id only where an inbox row names one', () => {
    expect(resolveDeckContext(route('/deck/approvals', { requestId: 'r-1' })).requestId).toBe('r-1')
    expect(resolveDeckContext(route('/deck/sessions', { requestId: 'r-1' })).requestId).toBeNull()
  })

  it('says unknown rather than guessing', () => {
    expect(resolveDeckContext(route('/deck/somewhere-else')).screen).toBe('unknown')
  })

  it('offers session actions on a session screen only', () => {
    expect(showsSessionActions(resolveDeckContext(route('/deck/s/host-1/worktree-9')))).toBe(true)
    expect(showsSessionActions(resolveDeckContext(route('/deck/w/host-1/worktree-9')))).toBe(false)
    expect(showsSessionActions(resolveDeckContext(route('/deck/sessions')))).toBe(false)
  })

  it('falls back to the only paired host, and to none when there are several', () => {
    const context = resolveDeckContext(route('/deck/sessions'))
    expect(hostForContext(context, ['host-1'])).toBe('host-1')
    expect(hostForContext(context, ['host-1', 'host-2'])).toBeNull()
    expect(hostForContext(resolveDeckContext(route('/deck/w/host-2/worktree-1')), ['host-1'])).toBe(
      'host-2'
    )
  })
})
