# 002 — Projects & Workspaces — Technical Specification

## 1. Ports

`mobile/src/gamepad/application/ports/project-catalog-port.ts`:

```ts
export type ProjectCatalogPort = {
  readonly listProjects: (id: ConnectionId) => Promise<PortResult<readonly Project[]>>
  readonly getProject: (id: ConnectionId, projectId: ProjectId) => Promise<PortResult<Project>>
}
```

`workspace-port.ts`:

```ts
export type WorkspacePage = {
  readonly workspaces: readonly Workspace[]
  readonly totalCount: number
  readonly truncated: boolean
  /** Opaque to core; the adapter round-trips it for conditional refresh. */
  readonly revision: string | null
}

export type WorkspaceQuery = {
  readonly projectId?: ProjectId
  readonly limit?: number
  readonly sinceRevision?: string | null
}

export type WorkspaceRefresh =
  | { readonly kind: 'changed'; readonly page: WorkspacePage }
  | { readonly kind: 'unchanged'; readonly revision: string }

export type WorkspacePort = {
  readonly listWorkspaces: (id: ConnectionId, query: WorkspaceQuery)
    => Promise<PortResult<WorkspaceRefresh>>
  readonly getWorkspace: (id: ConnectionId, workspaceId: WorkspaceId)
    => Promise<PortResult<Workspace>>
  readonly activateWorkspace: (id: ConnectionId, workspaceId: WorkspaceId)
    => Promise<PortResult<void>>
}
```

`revision` is the `snapshotId`. Core never learns that.

## 2. Orca mapping

| Port method         | Orca RPC            | Params                                                     | Result |
| ------------------- | ------------------- | ---------------------------------------------------------- | ------ |
| `listProjects`      | `repo.list`         | `{}`                                                        | `RuntimeRepoList { repos: Repo[] }` |
| `getProject`        | `repo.show`         | `{ repo }`                                                  | repo record |
| `listWorkspaces`    | `worktree.ps`       | `{ limit?, afterSnapshotId?, supportsWorktreeVisibilitySourceDefaults: true }` | `RuntimeWorktreePsConditionalResult` |
| `getWorkspace`      | `worktree.show`     | `{ worktree }`                                              | `RuntimeWorktreeRecord` |
| `activateWorkspace` | `worktree.activate` | `{ worktree, notifyClients?, navigation? }`                 | activation result |

`worktree.list` is available for full records but is **not** used for the list
screen: `worktree.ps` already carries agents, review links, preview text, and
the conditional snapshot, and costs one round trip
(`src/shared/runtime-worktree-contracts.ts`).

### 2.1 `worktree.ps` → `Workspace`

Source type `RuntimeWorktreePsSummary`.

| Domain field        | Source                                                             |
| ------------------- | ------------------------------------------------------------------ |
| `id`                | `worktreeId`                                                        |
| `projectId`         | `repoId`                                                            |
| `kind`              | `workspaceKind === 'folder-workspace' ? 'folder' : 'git-worktree'`; **absent field means `git-worktree`** (older hosts predate it) |
| `name`              | `displayName`                                                       |
| `branch`            | `kind === 'folder' ? null : branch`                                 |
| `attention`         | projection of `status` + `agents` — see §2.2                        |
| `isArchived`        | `isArchived`                                                        |
| `isPinned`          | `isPinned`                                                          |
| `unread`            | `unread`                                                            |
| `lastActivityAt`    | `lastActivityAt ?? lastOutputAt`                                    |
| `preview`           | `preview`                                                           |
| `parentId`          | `parentWorktreeId`                                                  |
| `childIds`          | `childWorktreeIds`                                                  |
| `review`            | first present of `linkedPR`, `linkedGitLabMR`, `linkedIssue`, `linkedLinearIssue`, `linkedGitLabIssue` — see §2.3 |

Fields intentionally dropped from the domain: `path`, `hostId`,
`terminalPlatform`, `worktreeInstanceId`, `lineageWorktreeInstanceId`,
`creatorProvenance`, `sortOrder`, `manualOrder`, `liveTerminalCount`,
`hasAttachedPty`, `hasHostSidebarActivity`, `comment`, `isActive`,
`isMainWorktree`, `workspaceStatus`.

Of those, three are kept **adapter-side** (not in the domain) because other
features need them and the adapter is their only legitimate holder:

- `path` → `007-files` root resolution;
- `terminalPlatform` → `005-terminal` key labelling;
- `sortOrder` / `manualOrder` → `WorkspacePort` ordering metadata, exposed to
  core as an opaque `orderHint: number` rather than two Orca fields.

### 2.2 Attention projection

`RuntimeWorktreeStatus` is `active | working | permission | done | inactive`.
`RuntimeWorktreeAgentRow.state` is `working | blocked | waiting | done`.

```text
any agent row blocked|waiting        → 'needs-input'
else status === 'permission'         → 'needs-input'
else any agent row working
     or status === 'working'         → 'working'
else status === 'done'               → 'done'
else status === 'active'|'inactive'  → 'idle'
connection not connected             → 'unknown'
```

`workingMode: 'monitoring'` is a working sub-state; MVP renders it as `working`
and keeps the discriminator adapter-side for a later UX pass.

A row whose only evidence is `restoredUnconfirmed` contributes nothing to the
projection — it cannot raise a workspace to `working`.

This projection lives in
`src/gamepad/adapters/orca/mapping/workspace-attention-projection.ts` and is the only
place it exists. Features must not re-derive attention from agent rows
([`../../reference/agent-status-store.md`](../../reference/agent-status-store.md)).

### 2.3 Review link

```text
linkedPR           → { kind: 'pull-request', reference: `#${number}`, state }
linkedGitLabMR     → { kind: 'merge-request', reference: `!${number}`, state: 'unknown' }
linkedIssue        → { kind: 'issue', reference: `#${number}`, state: 'unknown' }
linkedGitLabIssue  → { kind: 'issue', reference: `#${number}`, state: 'unknown' }
linkedLinearIssue  → { kind: 'issue', reference: <identifier>, state: 'unknown' }
```

Provider-neutral by construction: no GitHub-only naming reaches the domain
(`AGENTS.md`, Git Provider Compatibility). Precedence when several are present:
PR, then MR, then issue links in the order above.

## 3. Conditional refresh

```text
first load     → worktree.ps { limit }                      → snapshot + snapshotId
refresh        → worktree.ps { afterSnapshotId: <last> }
                    ├─ { unchanged: true, snapshotId }       → keep list, update revision
                    └─ RuntimeWorktreePsSnapshotResult       → replace list
```

Rules:

- A snapshot **replaces**; it is never merged. The host decides membership.
- Refresh cadence: 5 s while the workspace list is foreground and focused,
  30 s while foreground but on another screen, paused in background. Resume
  triggers an immediate refresh.
- `truncated: true` with `totalCount` drives PROJ-AC2. The client's `limit`
  defaults to 200.
- `hostScope` absent means "unverifiable scope" — the list is labelled as
  possibly partial rather than assumed complete.

## 4. Feature structure

```text
mobile/src/gamepad/features/projects/
├── screens/
│   ├── WorkspaceListScreen.tsx
│   └── WorkspaceDetailScreen.tsx
├── components/
│   ├── WorkspaceRow.tsx
│   ├── WorkspaceAttentionBadge.tsx
│   ├── WorkspaceLineageTrail.tsx
│   ├── ReviewLinkChip.tsx
│   ├── ProjectFilterSheet.tsx
│   └── WorkspaceSortControl.tsx
├── hooks/
│   ├── use-workspace-list.ts
│   └── use-workspace-detail.ts
└── state/
    ├── workspace-list-filters.ts
    └── workspace-list-ordering.ts
```

Existing modules to reuse rather than reimplement:
`mobile/src/worktree/workspace-list-ordering.ts`,
`workspace-list-sections.ts`, `use-workspace-sections.ts`,
`repo-color.ts`, `mobile-workspace-lineage.ts`. Move them under the feature as
they are migrated; do not fork them.

## 5. State

| Store       | Contents |
| ----------- | -------- |
| Remote      | `Project[]` and `WorkspacePage` per connection, plus the current `revision` |
| Local UI    | filters, sort mode, expanded lineage nodes, selected workspace, list scroll offset |
| Connection  | drives staleness labelling |

Cross-host list assembly happens in a use case
(`gamepad/application/use-cases/list-controller-workspaces.ts`) that merges per-
connection pages and stamps each row with its connection. Merging never
deduplicates across connections (PROJ-AC7).

## 6. Performance

- `FlatList` with `getItemLayout` and stable keys `${connectionId}:${workspaceId}`.
- Attention projection runs in the adapter on the payload, once per snapshot —
  not per render.
- Sorting runs on the projected list and is memoized on
  `(revision, sortMode, filterSignature)`.
- `Hermes` array-sort compatibility already has a guard
  (`mobile/src/hermes-array-sorting-compat.test.ts`); reuse it for any new
  comparator.

## 7. Failure modes

| Condition | Behaviour |
| --------- | --------- |
| `repo.list` unsupported | project grouping collapses to a flat workspace list; no error |
| `worktree.ps` unsupported (very old host) | fall back to `worktree.list`, mark attention `unknown` for every row |
| `afterSnapshotId` rejected | discard the revision and do a full load |
| Connection down | stale marker + timestamp; execution-derived state `unverifiable` |
| `worktree.activate` refused | surface host reason; selection unchanged |

## 8. Testing

| Test | Proves |
| ---- | ------ |
| `workspace-ps-mapping.test.ts` | §2.1 field-by-field, including absent `workspaceKind` |
| `workspace-attention-projection.test.ts` | §2.2 table incl. `restoredUnconfirmed` |
| `review-link-projection.test.ts` | §2.3 precedence and provider neutrality |
| `workspace-conditional-refresh.test.ts` | PROJ-AC5 |
| `workspace-list-ordering.test.ts` | PROJ-AC3 |
| `folder-workspace-rendering.test.ts` | PROJ-AC4 |
| `cross-host-workspace-merge.test.ts` | PROJ-AC7 |
| `workspace-filter-persistence.test.ts` | PROJ-AC6 |
