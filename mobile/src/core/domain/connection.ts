import { brandId, type BrandedId } from './branded-id'

export type ConnectionId = BrandedId<'ConnectionId'>

export function connectionId(value: string): ConnectionId {
  return brandId(value)
}

export const CONNECTION_REACHABILITIES = ['connected', 'connecting', 'unreachable'] as const
export type ConnectionReachability = (typeof CONNECTION_REACHABILITIES)[number]

/** How the phone reached the host. `unknown` covers a host that never reported a path. */
export const CONNECTION_PATHS = ['local', 'relay', 'unknown'] as const
export type ConnectionPath = (typeof CONNECTION_PATHS)[number]

export type Connection = {
  readonly id: ConnectionId
  readonly label: string
  readonly reachability: ConnectionReachability
  readonly path: ConnectionPath
  readonly hostVersion: string | null
  /** Null when the host never answered a version probe. */
  readonly protocolVersion: number | null
  readonly lastContactAt: number | null
}
