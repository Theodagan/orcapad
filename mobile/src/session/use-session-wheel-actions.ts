import { useMemo } from 'react'
import { AGENT_WHEEL_ACTION_IDS } from '../gamepad/bindings/agent-wheel-action-ids'
import { useWheelActions } from '../gamepad/bindings/use-wheel-actions'
import type { WheelBinding } from '../gamepad/wheel/wheel-registry'
import { getRepoIdFromMobileWorktreeId } from './mobile-session-route-helpers'
import { loadMobileNewTabAgentOptions } from './mobile-new-tab-agent-loader'
import { resolveMobileTerminalTabAgentId } from './mobile-terminal-tab-agent'
import { agentMenuEntries, webMenuEntries, worktreePorts } from './session-wheel-menus'
import { workspacePortsScanRead } from './workspace-ports-operations'
import type { MobileSessionController } from './use-mobile-session-controller'

/**
 * What the right wheel can do from a session (`005` USE-R10). Each one is a path the session
 * already has: the tab's own close, the new-tab drawer's agent launch, the browser tab creation
 * a tapped URL uses. The wheel only names them, and lists the agents and ports they act on.
 *
 * Stopping is not here: it belongs to the surface that can stop, which is the chat or the
 * terminal in front of you.
 */
export function useSessionWheelActions(controller: MobileSessionController): void {
  const {
    client,
    worktreeId,
    connState,
    activeSessionTab,
    handleCloseSessionTab,
    handleCreateTerminal,
    handleCreateBrowser
  } = controller
  const connected = connState === 'connected' && client !== null

  const bindings = useMemo<readonly WheelBinding[]>(() => {
    const isAgent =
      activeSessionTab !== null &&
      (activeSessionTab.type === 'agent-session' ||
        (activeSessionTab.type === 'terminal' &&
          resolveMobileTerminalTabAgentId(activeSessionTab) !== null))
    const availability = connected ? ('available' as const) : ('unavailable' as const)

    return [
      {
        id: AGENT_WHEEL_ACTION_IDS.close,
        label: 'Close agent',
        availability: isAgent && connected ? 'available' : 'unavailable',
        run: () => {
          if (activeSessionTab !== null) {
            void handleCloseSessionTab(activeSessionTab)
          }
        }
      },
      {
        id: AGENT_WHEEL_ACTION_IDS.launch,
        label: 'Launch agent',
        availability,
        menu: async () => {
          if (client === null) {
            return []
          }
          const options = await loadMobileNewTabAgentOptions({ client, worktreeId })
          return agentMenuEntries(options, (agent) => void handleCreateTerminal(agent))
        }
      },
      {
        id: AGENT_WHEEL_ACTION_IDS.web,
        label: 'Open web page',
        availability,
        menu: async () => {
          const open = (url: string): void => void handleCreateBrowser(url)
          if (client === null) {
            return webMenuEntries([], open)
          }
          const reply = await workspacePortsScanRead.request(client, {
            repoId: getRepoIdFromMobileWorktreeId(worktreeId)
          })
          const verdict = workspacePortsScanRead.interpret(reply)
          // A scan that fails still leaves a way to type an address.
          return webMenuEntries(
            verdict.accepted ? worktreePorts(verdict.value, worktreeId) : [],
            open
          )
        }
      }
    ]
  }, [
    client,
    worktreeId,
    connected,
    activeSessionTab,
    handleCloseSessionTab,
    handleCreateTerminal,
    handleCreateBrowser
  ])

  useWheelActions(bindings)
}
