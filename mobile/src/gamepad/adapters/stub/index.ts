import type { GamepadAdapter } from '../../application/ports/gamepad-adapter'

/**
 * The extraction proof (FND-AC3). It implements every port with `unsupported()` and depends on
 * nothing — no transport, no storage, no device. `tsconfig.extraction.json` compiles
 * `src/gamepad/` with `adapters/orca/` excluded and this bound in its place; if that stays
 * green, the product layer owes Orca nothing.
 *
 * It is also the honest default for a host that has not been paired yet.
 */
export function createStubAdapter(): GamepadAdapter {
  return { kind: 'stub' }
}
