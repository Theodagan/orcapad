import { describe, expect, it, vi } from 'vitest'
import { agentMenuEntries } from './session-wheel-menus'

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
