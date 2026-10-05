import { bindDeferredRpcOperation, defineRpcOperation } from '../transport/rpc-operation'
import type { RpcCompatibleReader } from '../transport/rpc-operation-contract'

/**
 * What the host's port scan says, read down to the few fields the right wheel offers. The scan is
 * the host's own (`workspacePorts.scan`); nothing here probes a port or a process.
 */
export type WheelPort = {
  readonly port: number
  readonly connectHost: string
  readonly protocol: 'http' | 'https' | 'unknown'
  readonly processName: string | null
  /** The origin the port's own terminal printed, when it said. */
  readonly advertisedUrl: string | null
  /** The worktree the host attributes the listener to; null for a port nothing owns. */
  readonly worktreeId: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readPort(candidate: unknown): WheelPort | null {
  if (!isRecord(candidate)) {
    return null
  }
  const { port, connectHost, protocol, processName, advertisedUrl, owner, kind } = candidate
  if (typeof port !== 'number' || !Number.isInteger(port) || typeof connectHost !== 'string') {
    return null
  }
  return {
    port,
    connectHost,
    protocol: protocol === 'http' || protocol === 'https' ? protocol : 'unknown',
    processName: typeof processName === 'string' ? processName : null,
    advertisedUrl: typeof advertisedUrl === 'string' ? advertisedUrl : null,
    worktreeId:
      kind === 'workspace' && isRecord(owner) && typeof owner.worktreeId === 'string'
        ? owner.worktreeId
        : null
  }
}

const portsReader: RpcCompatibleReader<unknown, 'workspace-ports', WheelPort[]> = (raw) => {
  const listed: unknown[] = isRecord(raw) && Array.isArray(raw.ports) ? raw.ports : []
  const ports: WheelPort[] = []
  const droppedPaths: string[] = []
  listed.forEach((candidate, index) => {
    const port = readPort(candidate)
    if (port === null) {
      droppedPaths.push(`ports[${index}]`)
    } else {
      ports.push(port)
    }
  })
  return {
    compatible: true,
    variant: 'workspace-ports',
    value: ports,
    salvage: { droppedPaths, droppedCount: droppedPaths.length }
  }
}

export const workspacePortsScanRead = bindDeferredRpcOperation(
  defineRpcOperation({
    name: 'workspace-ports.scan-or-skip',
    method: 'workspacePorts.scan',
    acceptance: 'success-result-or-skip',
    barrier: 'after-caller-barrier',
    read: portsReader
  })
)
