import type { InterventionSurface } from '../gamepad/bindings/agent-intervention'

export type PromptToggleSurface = Pick<InterventionSurface, 'ask' | 'permission' | 'question'> & {
  readonly onCollapseAsk?: () => void
  readonly onCollapsePrompt?: () => void
  readonly collapsedPrompt?: { title: string; expand: () => void } | null
}

/** The prompt card's own collapse or expand, whichever it would offer a tap now. */
export function promptToggleFor(surface: PromptToggleSurface): (() => void) | undefined {
  const { ask, permission, question, onCollapseAsk, onCollapsePrompt, collapsedPrompt } = surface
  if (collapsedPrompt != null) {
    return collapsedPrompt.expand
  }
  if (ask != null) {
    return onCollapseAsk
  }
  return (permission ?? question) != null ? onCollapsePrompt : undefined
}
