import { brandId, type BrandedId } from './branded-id'
import type { ConnectionId } from './connection'
import type { DomainRuleViolation } from './domain-rule'
import type { ProjectId } from './project'

export type WorkspaceId = BrandedId<'WorkspaceId'>

export function workspaceId(value: string): WorkspaceId {
  return brandId(value)
}

/** A git worktree or a folder workspace. The controller must not assume git. */
export const WORKSPACE_KINDS = ['git-worktree', 'folder'] as const
export type WorkspaceKind = (typeof WORKSPACE_KINDS)[number]

export const WORKSPACE_ATTENTIONS = [
  /** nothing running, nothing waiting */
  'idle',
  /** an agent is mid-turn */
  'working',
  /** an agent is blocked on the user */
  'needs-input',
  /** a turn finished and has not been acknowledged */
  'done',
  'unknown'
] as const
export type WorkspaceAttention = (typeof WORKSPACE_ATTENTIONS)[number]

export const REVIEW_LINK_KINDS = ['pull-request', 'merge-request', 'issue'] as const
export type ReviewLinkKind = (typeof REVIEW_LINK_KINDS)[number]

export type WorkspaceReviewLink = {
  readonly kind: ReviewLinkKind
  readonly reference: string
  readonly state: string
}

export type Workspace = {
  readonly id: WorkspaceId
  readonly projectId: ProjectId
  readonly connectionId: ConnectionId
  readonly kind: WorkspaceKind
  readonly name: string
  /** Null for a folder workspace, which has no branch to report. */
  readonly branch: string | null
  readonly attention: WorkspaceAttention
  readonly isArchived: boolean
  readonly isPinned: boolean
  readonly unread: boolean
  readonly lastActivityAt: number | null
  readonly preview: string
  readonly parentId: WorkspaceId | null
  readonly childIds: readonly WorkspaceId[]
  readonly review: WorkspaceReviewLink | null
}

export function checkWorkspaceRules(workspace: Workspace): readonly DomainRuleViolation[] {
  const violations: DomainRuleViolation[] = []

  if (workspace.kind === 'folder' && workspace.branch !== null) {
    violations.push({
      rule: 'folder-workspace-has-no-branch',
      detail: `folder workspace ${workspace.id} carries branch ${workspace.branch}`
    })
  }

  if (workspace.parentId === workspace.id || workspace.childIds.includes(workspace.id)) {
    violations.push({
      rule: 'workspace-lineage-is-acyclic',
      detail: `workspace ${workspace.id} is its own parent or child`
    })
  }

  return violations
}
