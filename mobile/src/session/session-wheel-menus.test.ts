import { describe, expect, it, vi } from 'vitest'
import {
  agentMenuEntries,
  ENTER_URL_ENTRY_ID,
  portUrl,
  webMenuEntries,
  worktreePorts
} from './session-wheel-menus'
import type { WheelPort } from './workspace-ports-operations'

const port = (
  number: number,
  worktreeId: string | null,
  extra: Partial<WheelPort> = {}
): WheelPort => ({
  port: number,
  connectHost: 'localhost',
  protocol: 'http',
  processName: null,
  advertisedUrl: null,
  worktreeId,
  ...extra
})

describe('the agent wheel', () => {
  it('offers each launchable agent, and launches the one chosen', () => {
    const launch = vi.fn()
    const entries = agentMenuEntries(
      [
        { agent: 'claude', label: 'Claude' },
        { agent: 'codex', label: 'Codex' }
      ],
      launch
    )

    expect(entries.map((entry) => entry.label)).toEqual(['Claude', 'Codex'])
    entries[1]?.run()
    expect(launch).toHaveBeenCalledWith('codex')
    expect(launch).toHaveBeenCalledTimes(1)
  })

  it('has nothing to offer when no agent is installed', () => {
    expect(agentMenuEntries([], vi.fn())).toEqual([])
  })
})

describe('the web wheel', () => {
  it('lists the ports of this worktree and no others', () => {
    const ports = worktreePorts([port(5173, 'wt-1'), port(3000, 'wt-2'), port(8080, null)], 'wt-1')

    expect(ports.map((port) => port.port)).toEqual([5173])
  })

  it('opens what a port printed about itself, and otherwise its own address', () => {
    expect(portUrl(port(5173, 'wt-1', { advertisedUrl: 'https://dev.local:5173' }))).toBe(
      'https://dev.local:5173'
    )
    expect(portUrl(port(5173, 'wt-1'))).toBe('http://localhost:5173')
    expect(portUrl(port(8443, 'wt-1', { protocol: 'https' }))).toBe('https://localhost:8443')
  })

  it('labels a port with its number and what is listening, and opens its URL', () => {
    const open = vi.fn()
    const entries = webMenuEntries(
      [port(5173, 'wt-1', { processName: 'vite' }), port(3000, 'wt-1')],
      open
    )

    expect(entries.map((entry) => entry.label)).toEqual([':5173 vite', ':3000', 'Enter URL…'])
    entries[0]?.run()
    expect(open).toHaveBeenCalledWith('http://localhost:5173')
  })

  it('always leaves a way to type an address, even with no ports open', () => {
    const open = vi.fn()
    const entries = webMenuEntries([], open)

    expect(entries.map((entry) => entry.id)).toEqual([ENTER_URL_ENTRY_ID])
    entries[0]?.run()
    expect(open).toHaveBeenCalledWith('about:blank')
  })
})
