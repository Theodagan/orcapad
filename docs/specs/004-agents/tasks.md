# 004 — Agents — Tasks

- [ ] **AG-T1 — Port**

  `agent-control-port.ts` per `tech.md` §1, plus `TaskRevisionRegistry` in
  `src/core/application/`.

  **Verify:** `pnpm typecheck`; layering test green.

- [ ] **AG-T2 — Journal item mapping**

  `src/adapters/orca/mapping/journal-item-mapping.ts` covering `message`,
  `toolCall`, `diff`, `approval`, `question`, and the `turn` / `status`
  diversions.

  **Verify:** `pnpm test src/adapters/orca/mapping/journal-item-mapping.test.ts`

- [ ] **AG-T3 — Mutation envelope**

  `src/adapters/orca/rpc/agent-mutation-envelope.ts` — fingerprinting with
  `@noble/hashes`, fence handling, conflict classification.

  **Verify:** `pnpm test …/mutation-envelope.test.ts`

- [ ] **AG-T4 — History operation and paging**

  `src/adapters/orca/rpc/agent-history-operation.ts` with direction translation
  and the `ok:false` reset path.

  **Verify:** `pnpm test …/history-paging.test.ts`

- [ ] **AG-T5 — Subscribe operation and fence gate**

  `src/adapters/orca/rpc/agent-subscribe-operation.ts` mapping the four wire
  events and dropping stale-fence batches.

  **Verify:** `pnpm test …/subscribe-fence.test.ts`

- [ ] **AG-T6 — Mutating operations**

  `send`, `cancel`, `respondToApproval`, `respondToQuestion`, `setOption` —
  descriptors plus schema-constraint enforcement (`tech.md` §2.4).

  **Verify:** `pnpm test src/adapters/orca/rpc/agent-mutation-operations.test.ts`

- [ ] **AG-T7 — Transcript reducer**

  `src/features/agents/state/transcript-reducer.ts` with the five invariants.

  **Verify:** `pnpm test src/features/agents/state/transcript-reducer.test.ts`

- [ ] **AG-T8 — Pending-mutation registry**

  `src/features/agents/state/pending-mutation-registry.ts` over
  `mobile/src/transport/rpc-delivery-ambiguity.ts`, persisted with local UI state.

  **Verify:** `pnpm test …/send-ambiguity.test.ts` (AG-AC6)

- [ ] **AG-T9 — Intervention surface**

  `InterventionCard`, `use-intervention-queue.ts`, compare-and-set answering with
  the stale path.

  **Verify:** `pnpm test …/respond-compare-and-set.test.ts` (AG-AC4, AC5)

- [ ] **AG-T10 — Transcript rendering**

  `TranscriptList`, `MessageBubble`, `ToolCallRow`, `DiffSummaryRow`, with
  virtualization, backwards paging, and byte-bounded tool input disclosure.

  **Verify:** `pnpm run check:code-quality:changed`;
  `pnpm test src/features/agents` (AG-AC1)

- [ ] **AG-T11 — Turn activity**

  `TurnActivityBar`, `use-turn-activity.ts`, host-clock-anchored elapsed time.

  **Verify:** `pnpm test …/use-turn-activity.test.ts` (AG-R2)

- [ ] **AG-T12 — Composer**

  `AgentComposer` migrating the existing `mobile/src/session/mobile-native-chat-*`
  draft modules, with client-side limit enforcement and draft persistence.

  **Verify:** `pnpm test …/composer-limits.test.ts`,
  `…/composer-draft-persistence.test.ts` (AG-AC9, AC10)

- [ ] **AG-T13 — Background tasks and options**

  `BackgroundTaskList`, `SessionOptionsSheet`, per-task cancel, capability-gated
  commands.

  **Verify:** `pnpm test …/cancel-scope.test.ts` (AG-AC8, AC12)

- [ ] **AG-T14 — Offline behaviour**

  Disabled composer with reason, readable transcript, turn state unknown.

  **Verify:** `pnpm test …/agent-screen-offline.test.ts` (AG-AC11)

- [ ] **AG-T15 — Screen assembly**

  `AgentSessionScreen` composing intervention → turn activity → transcript →
  composer, and repointing the existing agent route.

  **Verify:** `pnpm test src/features/agents/screens`; CDP screenshot check per
  `AGENTS.md` (hidden renderer, `ORCA_BACKGROUND_LAUNCH=1`)
