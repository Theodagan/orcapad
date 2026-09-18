import { describe, expect, it } from 'vitest'
import { connectionId } from './connection'
import { projectId } from './project'
import { checkWorkspaceRules, workspaceId, type Workspace } from './workspace'

function workspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: workspaceId('w-1'),
    projectId: projectId('p-1'),
    connectionId: connectionId('c-1'),
    kind: 'git-worktree',
    name: 'feature-branch',
    branch: 'feature',
    attention: 'idle',
    isArchived: false,
    isPinned: false,
    unread: false,
    lastActivityAt: null,
    preview: '',
    parentId: null,
    childIds: [],
    review: null,
    ...overrides
  }
}

describe('checkWorkspaceRules', () => {
  it('accepts a git worktree with a branch', () => {
    expect(checkWorkspaceRules(workspace())).toEqual([])
  })

  it('accepts a folder workspace with no branch', () => {
    expect(checkWorkspaceRules(workspace({ kind: 'folder', branch: null }))).toEqual([])
  })

  it('rejects a folder workspace carrying a branch', () => {
    const violations = checkWorkspaceRules(workspace({ kind: 'folder', branch: 'main' }))

    expect(violations.map((violation) => violation.rule)).toEqual([
      'folder-workspace-has-no-branch'
    ])
  })

  it('accepts a git worktree with a null branch, which a detached head reports', () => {
    expect(checkWorkspaceRules(workspace({ branch: null }))).toEqual([])
  })

  it('rejects a workspace that is its own parent', () => {
    const violations = checkWorkspaceRules(workspace({ parentId: workspaceId('w-1') }))

    expect(violations.map((violation) => violation.rule)).toEqual(['workspace-lineage-is-acyclic'])
  })

  it('rejects a workspace that lists itself as a child', () => {
    const violations = checkWorkspaceRules(workspace({ childIds: [workspaceId('w-1')] }))

    expect(violations.map((violation) => violation.rule)).toEqual(['workspace-lineage-is-acyclic'])
  })

  it('reports every violation on one workspace', () => {
    const violations = checkWorkspaceRules(
      workspace({ kind: 'folder', branch: 'main', parentId: workspaceId('w-1') })
    )

    expect(violations.map((violation) => violation.rule)).toEqual([
      'folder-workspace-has-no-branch',
      'workspace-lineage-is-acyclic'
    ])
  })
})
