import { describe, expect, it, vi } from 'vitest'
import { goWheelActions, pairDesktopWheelAction, type GoWheelOptions } from './go-wheel-actions'
import { GO_ACTION_IDS } from './wheel-action-ids'

function options(overrides: Partial<GoWheelOptions> = {}): GoWheelOptions {
  return {
    screen: 'session',
    hostId: 'h1',
    atSettings: false,
    onAllHosts: vi.fn(),
    onWorkspaces: vi.fn(),
    onNewWorktree: vi.fn(),
    onSettings: vi.fn(),
    ...overrides
  }
}

const byId = (actions: ReturnType<typeof goWheelActions>, id: string) =>
  actions.find((action) => action.id === id)

describe('GO wheel actions', () => {
  it('goes up to the workspaces from inside a host, and to every host from its list', () => {
    const inside = options()
    byId(goWheelActions(inside), GO_ACTION_IDS.up)?.run()
    expect(inside.onWorkspaces).toHaveBeenCalledTimes(1)
    expect(byId(goWheelActions(inside), GO_ACTION_IDS.up)?.label).toBe('Workspaces')

    const list = options({ screen: 'host' })
    byId(goWheelActions(list), GO_ACTION_IDS.up)?.run()
    expect(list.onAllHosts).toHaveBeenCalledTimes(1)
    expect(byId(goWheelActions(list), GO_ACTION_IDS.up)?.label).toBe('All hosts')
  })

  // Home's New is Pair desktop; registering it here too would retract one with the other.
  it('leaves Up and New to the home screen itself', () => {
    const ids = goWheelActions(options({ screen: 'home', hostId: null })).map((action) => action.id)

    expect(ids).toEqual([GO_ACTION_IDS.settings])
  })

  it('offers New worktree only with a host, and says why not', () => {
    const none = byId(goWheelActions(options({ screen: 'other', hostId: null })), GO_ACTION_IDS.new)

    expect(none?.availability).toBe('unavailable')
    expect(none?.reason).toBe('Open a host first')
  })

  it('opens Settings, except from Settings', () => {
    const anywhere = options()
    byId(goWheelActions(anywhere), GO_ACTION_IDS.settings)?.run()
    expect(anywhere.onSettings).toHaveBeenCalledTimes(1)

    const there = goWheelActions(options({ screen: 'other', atSettings: true }))
    expect(byId(there, GO_ACTION_IDS.settings)?.availability).toBe('unavailable')
  })

  it('names Pair desktop in the New slot', () => {
    const pair = vi.fn()
    const action = pairDesktopWheelAction(pair)

    expect([action.id, action.label]).toEqual([GO_ACTION_IDS.new, 'Pair desktop'])
  })
})
