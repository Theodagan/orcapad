import { createContext, useContext, type ReactNode } from 'react'

/**
 * Whether the screen a binding lives on is the one being looked at. The controller provider sits
 * above the navigator, so a screen retained underneath another keeps its bindings mounted, and
 * with fall-through dispatch an intent nothing on top accepts would reach it: `A` on a session
 * would open whatever the retained workspace list had highlighted.
 *
 * The navigator-facing half lives in `src/navigation/`; this file only carries the answer, so
 * the controller layer stays free of any router (FND-R3).
 */
const ScreenActiveContext = createContext(true)

export function ControllerScreenGate({
  active,
  children
}: {
  readonly active: boolean
  readonly children?: ReactNode
}): ReactNode {
  return <ScreenActiveContext.Provider value={active}>{children}</ScreenActiveContext.Provider>
}

/** True wherever no gate is above, which is every test and every screen outside a navigator. */
export function useControllerScreenActive(): boolean {
  return useContext(ScreenActiveContext)
}
