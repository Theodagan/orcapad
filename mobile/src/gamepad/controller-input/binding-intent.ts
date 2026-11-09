import type { ButtonBinding } from './controller-bindings'
import type { ControllerIntent } from './controller-intent'

/** The intent a button row stands for. Null for a row missing its direction or action id. */
export function buttonIntent(binding: ButtonBinding): ControllerIntent | null {
  if (binding.intent === 'run-action') {
    return binding.actionId === undefined
      ? null
      : { kind: 'run-action', actionId: binding.actionId }
  }
  if (binding.intent === 'cycle-tab' || binding.intent === 'cycle-workspace') {
    return binding.direction === null
      ? null
      : { kind: binding.intent, direction: binding.direction }
  }
  return { kind: binding.intent }
}
