/**
 * The bundle a runtime supplies to the application layer. One adapter implements all of it;
 * features never see which one (FND-R3).
 *
 * It carries no port yet. Each feature adds its own — `001-pairing` brings `connection` and
 * `pairing`, `002-projects` brings `projects` and `workspaces`, and so on — because a port's
 * signature is settled by the feature that uses it, not in advance (PRD §4).
 *
 * `kind` is what makes the extraction swap observable at runtime as well as at typecheck:
 * FND-AC3 replaces the Orca adapter with the stub, and a diagnostics surface should be able
 * to say which one answered.
 */

export const ADAPTER_KINDS = ['orca', 'stub'] as const

export type AdapterKind = (typeof ADAPTER_KINDS)[number]

export type GamepadAdapter = {
  readonly kind: AdapterKind
}
