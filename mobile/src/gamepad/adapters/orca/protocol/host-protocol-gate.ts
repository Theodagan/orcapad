import {
  evaluateRuntimeCompat,
  type RuntimeCompatVerdict
} from '../../../../../../src/shared/protocol-compat'
import {
  MIN_COMPATIBLE_RUNTIME_SERVER_VERSION,
  RUNTIME_PROTOCOL_VERSION
} from '../../../../../../src/shared/protocol-version'
import { defineRpcOperation, runRpcOperation } from '../../../../transport/rpc-operation'
import type { RpcCompatibleReader } from '../../../../transport/rpc-operation-contract'

/**
 * `status.get` is the one call the adapter makes before it trusts anything else. It answers three
 * questions at once: can these two builds talk, what has this host been told it can do, and which
 * of that is simply absent because the host predates the field.
 *
 * The third is the whole point. An absent field means "this host predates it" and never "false"
 * (FND-R7). `null` and `unknown` are therefore load-bearing here — collapsing either into a
 * boolean is how a feature ends up hiding an affordance a capable host actually offers.
 */

/** What the reply carried, kept as a variant so a mixed-version answer is data rather than a decode failure. */
export type HostStatusVariant =
  /** Runtime-named fields — what a current host sends. */
  | 'runtime'
  /** Only the COMPAT aliases (`protocolVersion`, `minCompatibleMobileVersion`). */
  | 'legacy-alias'
  /** Neither. The host answered, but said nothing about protocol compatibility. */
  | 'silent'

export type HostCapabilities = {
  readonly protocolVersion: number | null
  readonly minCompatibleClientVersion: number | null
  readonly appVersion: string | null
  /** `null` means the host predates capability advertisement — not that it advertises none. */
  readonly advertised: ReadonlySet<string> | null
  readonly compat: RuntimeCompatVerdict
  readonly variant: HostStatusVariant
}

function finiteNumber(raw: Record<string, unknown>, key: string): number | null {
  const value = raw[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function nonEmptyString(raw: Record<string, unknown>, key: string): string | null {
  const value = raw[key]
  return typeof value === 'string' && value.length > 0 ? value : null
}

/** `null` when the key is absent; an empty set when the host sent an empty list, which are different facts. */
function advertisedCapabilities(raw: Record<string, unknown>): ReadonlySet<string> | null {
  const value = raw.capabilities
  if (!Array.isArray(value)) {
    return null
  }
  return new Set(value.filter((entry) => typeof entry === 'string'))
}

/**
 * Reads the runtime-named fields first and the COMPAT aliases second, the same order the desktop
 * runtime uses (`src/shared/execution-host-registry.ts`). Mobile's legacy gate reads only the
 * aliases, which works today because hosts still send both — but the aliases are the ones marked
 * for removal, so preferring them would age badly.
 */
export function projectHostCapabilities(raw: Record<string, unknown>): HostCapabilities {
  const runtimeProtocol = finiteNumber(raw, 'runtimeProtocolVersion')
  const runtimeMinClient = finiteNumber(raw, 'minCompatibleRuntimeClientVersion')
  const aliasProtocol = finiteNumber(raw, 'protocolVersion')
  const aliasMinClient = finiteNumber(raw, 'minCompatibleMobileVersion')

  const protocolVersion = runtimeProtocol ?? aliasProtocol
  const minCompatibleClientVersion = runtimeMinClient ?? aliasMinClient

  const variant: HostStatusVariant =
    runtimeProtocol !== null || runtimeMinClient !== null
      ? 'runtime'
      : aliasProtocol !== null || aliasMinClient !== null
        ? 'legacy-alias'
        : 'silent'

  return {
    protocolVersion,
    minCompatibleClientVersion,
    appVersion: nonEmptyString(raw, 'appVersion'),
    advertised: advertisedCapabilities(raw),
    compat: evaluateRuntimeCompat({
      clientProtocolVersion: RUNTIME_PROTOCOL_VERSION,
      minCompatibleServerProtocolVersion: MIN_COMPATIBLE_RUNTIME_SERVER_VERSION,
      serverProtocolVersion: protocolVersion ?? undefined,
      serverMinCompatibleClientProtocolVersion: minCompatibleClientVersion ?? undefined
    }),
    variant
  }
}

const readHostStatus: RpcCompatibleReader<
  Record<string, unknown>,
  HostStatusVariant,
  HostCapabilities
> = (raw) => {
  const value = projectHostCapabilities(raw)
  return {
    compatible: true,
    variant: value.variant,
    value,
    salvage: { droppedPaths: [], droppedCount: 0 }
  }
}

/**
 * `object-result-or-null`: a host that refuses the method answers `null` rather than throwing,
 * which is exactly the "host predates this" shape the caller needs. Every other acceptance would
 * turn a refusal into an error a feature has to catch.
 */
export const hostProtocolGateOperation = defineRpcOperation({
  name: 'gamepad.host-protocol-gate',
  method: 'status.get',
  acceptance: 'object-result-or-null',
  barrier: 'on-settle',
  read: readHostStatus
})

/**
 * Typed off `runRpcOperation` rather than by naming the raw request port: importing that module —
 * even `import type` — would add this file to `unvalidated-rpc-request-port-inventory.ts`, and
 * FND-AC4 says the adapter contributes nothing to that list.
 */
type RpcRequester = Parameters<typeof runRpcOperation>[0]

/** `null` when the host refused `status.get`; every capability is then `unknown`, never `unavailable`. */
export async function readHostProtocolGate(client: RpcRequester): Promise<HostCapabilities | null> {
  return runRpcOperation(client, hostProtocolGateOperation, undefined)
}
