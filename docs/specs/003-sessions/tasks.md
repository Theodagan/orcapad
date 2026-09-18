# 003 — Sessions — Tasks

- [ ] **SESS-T1 — Port**

  `session-port.ts` per `tech.md` §1.

  **Verify:** `pnpm typecheck`

- [ ] **SESS-T2 — Tab mapping**

  `src/gamepad/adapters/orca/mapping/session-tab-mapping.ts` — all five Orca tab types,
  browser filtered out, adapter-side extras held in a side record keyed by
  session id.

  **Verify:** `pnpm test src/gamepad/adapters/orca/mapping/session-tab-mapping.test.ts`

- [ ] **SESS-T3 — Execution-state projection**

  `src/gamepad/adapters/orca/mapping/session-execution-state.ts` implementing §2.2,
  including the reconnect-disappearance rule.

  **Verify:** `pnpm test …/session-execution-state.test.ts` (SESS-AC4)

- [ ] **SESS-T4 — Tab operations**

  `src/gamepad/adapters/orca/rpc/session-tab-operations.ts` covering `list`, `listAll`,
  `subscribe`, `subscribeAll`, `unsubscribe`, `unsubscribeAll`, `activate`,
  `createTerminal`, `close`, `closeLifecycle`.

  **Verify:** `pnpm test src/gamepad/adapters/orca/rpc/session-tab-operations.test.ts`

- [ ] **SESS-T5 — Agent status feed**

  `src/gamepad/adapters/orca/rpc/agent-status-feed-operation.ts` and
  `src/gamepad/adapters/orca/mapping/agent-status-summary-mapping.ts`, feeding the shared
  reconciliation from `000-foundation`.

  **Verify:** `pnpm test …/agent-status-feed-mapping.test.ts` (SESS-AC3)

- [ ] **SESS-T6 — Session adapter**

  `src/gamepad/adapters/orca/session-adapter.ts` implementing `SessionPort`, with the
  subscription sharing rule from `tech.md` §4.

  **Verify:** `pnpm test src/gamepad/adapters/orca/session-adapter.test.ts`

- [ ] **SESS-T7 — Subscription lifecycle**

  `src/gamepad/application/use-cases/observe-workspace-sessions.ts` owning focus,
  blur, background, and reconnect transitions.

  **Verify:** `pnpm test …/session-subscription-lifecycle.test.ts` (SESS-AC1, AC2)

- [ ] **SESS-T8 — Workspace sessions screen**

  `WorkspaceSessionsScreen`, `SessionRow`, `SessionSurfaceIcon`,
  `ExecutionStateBadge`. Pending-handle rendering per SESS-AC5.

  **Verify:** `pnpm run check:code-quality:changed`;
  `pnpm test src/gamepad/features/sessions`

- [ ] **SESS-T9 — Cross-workspace sessions screen**

  `AllSessionsScreen` plus the new route
  `mobile/app/h/[hostId]/sessions.tsx`, with the degradation path for
  SESS-AC6.

  **Verify:** `pnpm test src/gamepad/features/sessions/screens`

- [ ] **SESS-T10 — Create and close**

  `CreateTerminalSheet`, close confirmation, and the "created, not yet visible"
  timeout from `tech.md` §6.

  **Verify:** `pnpm test …/create-terminal-session.test.ts` (SESS-AC7)

- [ ] **SESS-T11 — Navigation**

  Synthetic-stack construction for deep links; preserve selection and scroll
  across background.

  **Verify:** `pnpm test …/session-navigation-stack.test.ts` (SESS-AC8, AC10)
