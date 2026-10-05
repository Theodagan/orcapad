import type { WheelMenuEntry } from '../gamepad/wheel/wheel-registry'
import type { MobileNewTabAgentOption } from './mobile-new-tab-agent-options'

/**
 * The list the right wheel's launch door opens (`005` USE-R10): the agents that can be launched.
 * Plain data in, wheel entries out, so what a wheel offers can be tested without a session.
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
