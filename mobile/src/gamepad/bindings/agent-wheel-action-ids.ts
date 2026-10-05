/**
 * Binding ids for what the right wheel can do to the agent in front of you (`005` USE-R10).
 * Names only: a surface that can do the thing registers an action under the id, and a preset
 * decides where it sits, so neither has to know about the other.
 */
export const AGENT_WHEEL_ACTION_IDS = {
  close: 'agent.close',
  stop: 'agent.stop',
  handoff: 'agent.handoff',
  launch: 'agent.launch',
  toggleView: 'agent.toggle-view',
  toggleInput: 'agent.toggle-input'
} as const
