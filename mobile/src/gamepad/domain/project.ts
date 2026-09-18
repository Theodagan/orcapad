import { brandId, type BrandedId } from './branded-id'
import type { ConnectionId } from './connection'

export type ProjectId = BrandedId<'ProjectId'>

export function projectId(value: string): ProjectId {
  return brandId(value)
}

export type Project = {
  readonly id: ProjectId
  readonly connectionId: ConnectionId
  readonly name: string
  readonly accentColor: string | null
  readonly workspaceCount: number
}
