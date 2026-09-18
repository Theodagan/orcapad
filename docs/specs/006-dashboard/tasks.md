# 006 — Dashboard — Tasks

- [ ] **DASH-T1 — Notification port**

  `notification-port.ts` per `tech.md` §1.

  **Verify:** `pnpm typecheck`

- [ ] **DASH-T2 — Registration adapter**

  `src/adapters/orca/rpc/notification-operations.ts` and
  `src/adapters/orca/notification-adapter.ts`, with the iOS-environment
  precondition and the refusal-reason mapping.

  **Verify:** `pnpm test …/push-registration-params.test.ts`,
  `…/push-registration-retry.test.ts` (DASH-AC4, AC8)

- [ ] **DASH-T3 — Watermark store**

  `src/features/dashboard/state/notification-watermark.ts` — `{ seq, epoch }` per
  connection, persisted, with the epoch-mismatch reset.

  **Verify:** `pnpm test …/notification-catch-up.test.ts` (DASH-AC5, AC6)

- [ ] **DASH-T4 — Catch-up on reconnect**

  Wire `catchUp` into the connection-restored transition from `001`, including
  `deliveredPushes` (most recent 256).

  **Verify:** `pnpm test src/core/application/use-cases/catch-up-notifications.test.ts`

- [ ] **DASH-T5 — Attention queue use case**

  `src/core/application/use-cases/build-attention-queue.ts` per §3.

  **Verify:** `pnpm test …/attention-queue-ordering.test.ts`,
  `…/attention-queue-dedup.test.ts`, `…/attention-queue-unknown.test.ts`

- [ ] **DASH-T6 — Dashboard screen**

  `DashboardScreen`, `AttentionQueueList`, `AttentionItemRow`,
  `WorkingSummaryStrip`, `ConnectionStrip`, `RecentsRow`. Migrate list mechanics
  from `mobile/src/home/`.

  **Verify:** `pnpm run check:code-quality:changed`; `pnpm lint`;
  `pnpm test src/features/dashboard`

- [ ] **DASH-T7 — Inline intervention**

  Answering an approval directly from the queue, through `AgentControlPort`, with
  optimistic removal reconciled against the host's reply.

  **Verify:** `pnpm test …/attention-inline-respond.test.ts` (DASH-AC2)

- [ ] **DASH-T8 — Recents**

  `recents-store.ts` with dedup, cap, persistence, and eviction on unpair.

  **Verify:** `pnpm test …/recents-store.test.ts` (DASH-AC9)

- [ ] **DASH-T9 — Deep links**

  Cold- and warm-start handling, synthetic back stack, missing-workspace path.

  **Verify:** `pnpm test …/notification-deep-link.test.ts` (DASH-AC7)

- [ ] **DASH-T10 — Route**

  Repoint `mobile/app/index.tsx` at `DashboardScreen`, keeping the existing
  onboarding and unpaired-state routing intact.

  **Verify:** `pnpm test src/expo-route-module-boundary.test.ts`

- [ ] **DASH-T11 — Device checks**

    1. Cold-start notification tap on iOS and Android (DASH-AC7).
    2. Permission denied path.
    3. Host restart then reconnect (DASH-AC6).
    4. Five connections, 50 attention items (DASH-AC10).
