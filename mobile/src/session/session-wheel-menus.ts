import type { WheelMenuEntry } from '../gamepad/wheel/wheel-registry'
import type { MobileNewTabAgentOption } from './mobile-new-tab-agent-options'
import type { WheelPort } from './workspace-ports-operations'

/**
 * The lists the right wheel's two doors open (`005` USE-R10): the agents that can be launched, and
 * the ports the project has open. Plain data in, wheel entries out, so what a wheel offers can be
 * tested without a session.
 */

export function agentMenuEntries(
  options: readonly MobileNewTabAgentOption[],
  launch: (agent: MobileNewTabAgentOption['agent']) => void
): readonly WheelMenuEntry[] {
  return options.map((option) => ({
    id: `launch:${option.agent}`,
    label: option.label,
    availability: 'available' as const,
    run: () => launch(option.agent)
  }))
}

/** Where a port should be opened: what its own terminal printed if it said, else its address. */
export function portUrl(port: WheelPort): string {
  if (port.advertisedUrl !== null) {
    return port.advertisedUrl
  }
  const scheme = port.protocol === 'https' ? 'https' : 'http'
  return `${scheme}://${port.connectHost}:${port.port}`
}

function portLabel(port: WheelPort): string {
  const name = port.processName?.trim()
  return name === undefined || name === '' ? `:${port.port}` : `:${port.port} ${name}`
}

/** The ports this worktree owns. A port nothing attributes to it is not "on the project". */
export function worktreePorts(
  ports: readonly WheelPort[],
  worktreeId: string
): readonly WheelPort[] {
  return ports.filter((port) => port.worktreeId === worktreeId)
}

export const ENTER_URL_ENTRY_ID = 'enter-url'

/** The ports, then a way to type an address, which is what is left when none of them is it. */
export function webMenuEntries(
  ports: readonly WheelPort[],
  open: (url: string) => void
): readonly WheelMenuEntry[] {
  return [
    ...ports.map((port) => ({
      id: `port:${port.port}`,
      label: portLabel(port),
      availability: 'available' as const,
      run: () => open(portUrl(port))
    })),
    {
      id: ENTER_URL_ENTRY_ID,
      label: 'Enter URL…',
      availability: 'available' as const,
      run: () => open('about:blank')
    }
  ]
}
