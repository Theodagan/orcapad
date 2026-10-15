import type { WheelMenuEntry } from '../gamepad/wheel/wheel-registry'
import { TERMINAL_ACCESSORY_KEY_DEFINITIONS } from '../terminal/terminal-key-definitions'
import type { MobileNewTabAgentOption } from './mobile-new-tab-agent-options'

/**
 * The lists DO's submenus open (`012`). Plain data in, wheel entries out, so what a wheel offers
 * can be tested without a session.
 */

/** The agents Launch agent ▸ can start. */

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

/** Keys ▸, in the order a stuck terminal usually needs them. */
const TERMINAL_MENU_KEY_IDS = ['ctrlC', 'escape', 'tab', 'shiftTab', 'enter', 'ctrlD', 'ctrlL']

/** The shortcut row's own keys, sent through the same path; Paste only when the clipboard has text. */
export function terminalKeyMenuEntries(
  send: (bytes: string) => void,
  paste: (() => void) | null
): readonly WheelMenuEntry[] {
  const keys = TERMINAL_MENU_KEY_IDS.flatMap((id) => {
    const key = TERMINAL_ACCESSORY_KEY_DEFINITIONS.find((candidate) => candidate.id === id)
    return key === undefined
      ? []
      : [
          {
            id: `key:${key.id}`,
            label: key.label,
            availability: 'available' as const,
            run: () => send(key.bytes)
          }
        ]
  })
  return paste === null
    ? keys
    : [...keys, { id: 'key:paste', label: 'Paste', availability: 'available', run: paste }]
}
