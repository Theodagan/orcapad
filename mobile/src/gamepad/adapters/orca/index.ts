import type { GamepadAdapter } from '../../application/ports/gamepad-adapter'

/**
 * The Orca runtime adapter: the only part of `src/gamepad/` allowed to name an Orca RPC
 * method, decode an Orca payload, or reach upstream `mobile/src/` (FND-R4).
 *
 * It takes no argument yet because it holds no port yet. FND-T6 introduces the client binding
 * — acquired from the existing `host-client-acquisition-registry` rather than a new socket —
 * and that becomes its first positional parameter.
 */
export function createOrcaAdapter(): GamepadAdapter {
  return { kind: 'orca' }
}
