import type { ButtonBinding } from './controller-bindings'
import type { ControllerIntent } from './controller-intent'

/** The intent a button row stands for. Null for a cycling row that names no direction. */
export function buttonIntent(binding: ButtonBinding): ControllerIntent | null {
  if (binding.intent === 'cycle-tab' || binding.intent === 'cycle-workspace') {
    return binding.direction === null
      ? null
      : { kind: binding.intent, direction: binding.direction }
  }
  return { kind: binding.intent }
}
