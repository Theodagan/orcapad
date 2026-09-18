# 002 — Projects & Workspaces — Tasks

- [ ] **PROJ-T1 — Ports**

  `project-catalog-port.ts` and `workspace-port.ts` under
  `mobile/src/gamepad/application/ports/`.

  **Verify:** `pnpm typecheck`; layering test green.

- [ ] **PROJ-T2 — Project mapping and adapter**

  `src/gamepad/adapters/orca/rpc/repo-operations.ts` (`repo.list`, `repo.show`) and
  `src/gamepad/adapters/orca/mapping/project-mapping.ts`.

  **Verify:** `pnpm test src/gamepad/adapters/orca/mapping/project-mapping.test.ts`

- [ ] **PROJ-T3 — Workspace mapping**

  `src/gamepad/adapters/orca/mapping/workspace-mapping.ts` implementing `tech.md` §2.1,
  with the adapter-side extras (`path`, `terminalPlatform`, `orderHint`) held in
  a separate record, not on the domain type.

  **Verify:** `pnpm test src/gamepad/adapters/orca/mapping/workspace-mapping.test.ts`

- [ ] **PROJ-T4 — Attention projection**

  `src/gamepad/adapters/orca/mapping/workspace-attention-projection.ts` per §2.2, plus a
  test asserting no feature file re-derives attention (extend the layering test's
  forbidden-vocabulary list with `RuntimeWorktreeAgentRow`).

  **Verify:** `pnpm test src/gamepad/adapters/orca/mapping/workspace-attention-projection.test.ts`

- [ ] **PROJ-T5 — Review link projection**

  `src/gamepad/adapters/orca/mapping/review-link-projection.ts` per §2.3. Provider-neutral
  naming; no `github` identifier in the domain or the component names.

  **Verify:** `pnpm test src/gamepad/adapters/orca/mapping/review-link-projection.test.ts`

- [ ] **PROJ-T6 — Conditional-refresh workspace adapter**

  `src/gamepad/adapters/orca/rpc/worktree-operations.ts` (`worktree.ps`, `worktree.show`,
  `worktree.activate`) and `src/gamepad/adapters/orca/workspace-adapter.ts` implementing
  `WorkspacePort` with the `unchanged` path.

  **Verify:** `pnpm test src/gamepad/adapters/orca/workspace-adapter.test.ts` (PROJ-AC5)

- [ ] **PROJ-T7 — Cross-host list use case**

  `src/gamepad/application/use-cases/list-controller-workspaces.ts` — merge per
  connection, stamp the connection, never deduplicate.

  **Verify:** `pnpm test src/gamepad/application/use-cases` (PROJ-AC7)

- [ ] **PROJ-T8 — Filters and ordering state**

  Move and adapt `mobile/src/worktree/workspace-list-ordering.ts`,
  `workspace-list-sections.ts`, `use-workspace-sections.ts` into
  `src/gamepad/features/projects/state/`. Persist filters through the existing
  preferences store.

  **Verify:** `pnpm test src/gamepad/features/projects/state` (PROJ-AC3, AC6)

- [ ] **PROJ-T9 — Workspace list screen**

  `WorkspaceListScreen`, `WorkspaceRow`, `WorkspaceAttentionBadge`,
  `ReviewLinkChip`, `ProjectFilterSheet`, `WorkspaceSortControl`. Virtualized
  list with stable composite keys. Truncation affordance (PROJ-AC2). Stale
  marker (PROJ-AC8).

  **Verify:** `pnpm run check:code-quality:changed`; `pnpm lint`;
  `pnpm test src/gamepad/features/projects`

- [ ] **PROJ-T10 — Workspace detail screen**

  `WorkspaceDetailScreen` with lineage trail, review chip, activation action, and
  entry points to `003`, `005`, `007`.

  **Verify:** `pnpm test src/gamepad/features/projects/screens`

- [ ] **PROJ-T11 — Folder-workspace rendering**

  Component test over a `workspaceKind: 'folder-workspace'` fixture asserting no
  branch element is rendered at all.

  **Verify:** `pnpm test …/folder-workspace-rendering.test.ts` (PROJ-AC4)

- [ ] **PROJ-T12 — Performance pass**

  250-workspace fixture; confirm `getItemLayout`, memoized comparator, and
  adapter-side projection. Record the measurement.

  **Verify:** the repo's existing perf repro script pattern
  (`mobile/scripts/repro-workspace-picker-lag.ts`) (PROJ-AC9)
