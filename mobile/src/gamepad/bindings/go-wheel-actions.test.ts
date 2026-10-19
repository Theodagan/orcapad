import { describe, expect, it, vi } from 'vitest'
import type { WheelBinding } from '../wheel/wheel-registry'
import {
  goWheelActions,
  pagesWheelMenu,
  pairDesktopWheelAction,
  workspaceOfRoute,
  type GoWheelOptions
} from './go-wheel-actions'
import { GO_ACTION_IDS, VIEW_ACTION_IDS } from './wheel-action-ids'

function options(overrides: Partial<GoWheelOptions> = {}): GoWheelOptions {
  return {
    screen: 'session',
    hostId: 'h1',
    atSettings: false,
    canGoBack: true,
    workspace: null,
    onBack: vi.fn(),
    onWorkspacePage: vi.fn(),
    onNewWorktree: vi.fn(),
    onSettings: vi.fn(),
    ...overrides
  }
}

const byId = (actions: ReturnType<typeof goWheelActions>, id: string) =>
  actions.find((action) => action.id === id)

describe('GO wheel actions', () => {
  // Home's New is Pair desktop; registering it here too would retract one with the other.
  it('leaves New to the home screen itself', () => {
    const home = goWheelActions(options({ screen: 'home', hostId: null }))

    expect(byId(home, GO_ACTION_IDS.new)).toBeUndefined()
  })

  it('goes back while there is somewhere to go', () => {
    const anywhere = options()
    byId(goWheelActions(anywhere), GO_ACTION_IDS.back)?.run()
    expect(anywhere.onBack).toHaveBeenCalledTimes(1)

    const root = byId(goWheelActions(options({ canGoBack: false })), GO_ACTION_IDS.back)
    expect(root?.availability).toBe('unavailable')
  })

  it('leaves Files, Changes and History to the session there', () => {
    const ids = goWheelActions(options()).map((action) => action.id)

    expect(ids).not.toContain(GO_ACTION_IDS.files)
    expect(ids).not.toContain(GO_ACTION_IDS.history)
  })

  it('moves between the workspace pages off the session, but not to the one showing', () => {
    const onFiles = options({ screen: 'other', workspace: { page: 'files' } })
    const actions = goWheelActions(onFiles)
    expect(byId(actions, GO_ACTION_IDS.files)?.reason).toBe('Already here')
    expect(byId(actions, GO_ACTION_IDS.files)?.availability).toBe('unavailable')
    byId(actions, GO_ACTION_IDS.changes)?.run()
    expect(onFiles.onWorkspacePage).toHaveBeenCalledWith('changes')

    const settings = goWheelActions(options({ screen: 'other', workspace: null }))
    expect(byId(settings, GO_ACTION_IDS.history)?.reason).toBe('Open a workspace first')
  })

  it('reads the workspace and its page from the route segments', () => {
    expect(workspaceOfRoute(['h', '[hostId]', 'files', '[worktreeId]'])).toEqual({ page: 'files' })
    expect(workspaceOfRoute(['h', '[hostId]', 'source-control', '[worktreeId]'])).toEqual({
      page: 'changes'
    })
    expect(workspaceOfRoute(['h', '[hostId]', 'files', 'preview', '[worktreeId]'])).toEqual({
      page: 'files'
    })
    expect(workspaceOfRoute(['h', '[hostId]', 'session', '[worktreeId]'])).toEqual({ page: null })
    expect(workspaceOfRoute(['h', '[hostId]'])).toBeNull()
    expect(workspaceOfRoute(['settings'])).toBeNull()
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

  it('gathers the pages under Pages from whoever registered them, in a fixed order', () => {
    const open = vi.fn()
    const registered: Record<string, WheelBinding> = {
      [GO_ACTION_IDS.settings]: {
        id: GO_ACTION_IDS.settings,
        label: 'Settings',
        availability: 'available',
        run: open
      },
      [GO_ACTION_IDS.files]: {
        id: GO_ACTION_IDS.files,
        label: 'Files',
        availability: 'unavailable',
        run: open
      }
    }
    const pages = pagesWheelMenu((id) => registered[id] ?? null)
    const entries = pages.menu()

    expect(Array.isArray(entries) ? entries.map((entry) => entry.label) : []).toEqual([
      'Files',
      'Settings'
    ])
    expect(Array.isArray(entries) ? entries[0]?.availability : null).toBe('unavailable')
  })

  it('keeps the Chat/Terminal slot off the session, dark and saying why', () => {
    const toggle = byId(goWheelActions(options({ screen: 'other' })), VIEW_ACTION_IDS.chatTerminal)
    expect([toggle?.availability, toggle?.reason]).toEqual(['unavailable', 'Open a session first'])
    expect(byId(goWheelActions(options()), VIEW_ACTION_IDS.chatTerminal)).toBeUndefined()
  })

  it('names Pair desktop in the New slot', () => {
    const pair = vi.fn()
    const action = pairDesktopWheelAction(pair)

    expect([action.id, action.label]).toEqual([GO_ACTION_IDS.new, 'Pair desktop'])
  })
})
