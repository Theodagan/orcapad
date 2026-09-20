# 003 — Dictation — Tasks

Each task is independently shippable and leaves `pnpm typecheck`, `pnpm test`,
and `oxlint` green in `mobile/`.

- [ ] **DICT-T1 — Domain and port** → needs: —

  `src/gamepad/domain/dictation.ts` and
  `src/gamepad/application/ports/dictation-port.ts` per `tech.md` §3 and §4.
  `setup-required` is a state beside `listening`, not an error.

  **Verify:** `pnpm typecheck`

- [ ] **DICT-T2 — Boundary allowance** → needs: —

  Add `mobile/src/dictation` to `ADAPTER_UPSTREAM_REACH` in
  `gamepad-boundary.test.ts`, with a comment naming why: the setup-error mapping
  in `mobile-dictation-setup.ts` is reused rather than re-derived.

  This is its own task because widening the boundary is the kind of edit that
  should be visible in a diff on its own, not buried in a feature commit.

  **Verify:** `pnpm test src/gamepad/gamepad-boundary.test.ts`

- [ ] **DICT-T3 — RPC descriptors** → needs: 1

  `src/gamepad/adapters/orca/rpc/dictation-operations.ts` covering
  `speech.dictation.setup`, `.start`, `.chunk`, `.finish`, `.cancel` and
  `speech.models.list`, each through `defineRpcOperation`. `speech.models.list`
  uses the capability-probe acceptance so a `method_not_found` is a verdict, not
  a throw.

  **Verify:** `pnpm test src/gamepad/adapters/orca/rpc/dictation-operations.test.ts`

- [ ] **DICT-T4 — Dictation adapter** → needs: 2, 3

  `src/gamepad/adapters/orca/dictation-adapter.ts` implementing `DictationPort`
  over those descriptors and `@orca/expo-two-way-audio`, reusing
  `mobile-dictation-setup.ts` for the setup-error mapping.

  Tests: host with dictation ready; host reporting `voice_dictation_disabled`;
  host reporting `voice_model_not_selected`; host answering `method_not_found`;
  disconnect mid-session.

  **Verify:** `pnpm test src/gamepad/adapters/orca/dictation-adapter.test.ts`

- [ ] **DICT-T5 — Toggle use case** → needs: 1

  `src/gamepad/application/use-cases/toggle-dictation.ts` implementing `tech.md`
  §5's table against `001`'s focus model, including the no-target notice.

  **Verify:** `pnpm test src/gamepad/application/use-cases/toggle-dictation.test.ts`

- [ ] **DICT-T6 — Text targets** → needs: 5

  Let a pane declare that it accepts text, and resolve the target from focus.
  Wire the terminal target through the existing
  `terminal-live-dictation-routing.ts` shape.

  **Verify:** `pnpm test src/gamepad/application/use-cases/toggle-dictation.test.ts`

- [ ] **DICT-T7 — Listening indicator** → needs: 4, 5

  `features/dictation/components/ListeningIndicator.tsx`, visible from every pane
  while active — including with a wheel open (DICT-AC6) — and clearing within a
  second of a disconnect.

  **Verify:** `pnpm test src/gamepad/features/dictation`

- [ ] **DICT-T8 — Bind R3** → needs: 5, 7

  Route `001`'s `toggle-dictation` intent into the use case. Answer `tech.md`
  open question 2 — whether `R3` may start dictation while a wheel is open, or
  only stop it — and record the decision.

  **Verify:** `pnpm test src/gamepad/features/dictation`

- [ ] **DICT-T9 — Vocabulary containment** → needs: 4

  Extend `gamepad-boundary.test.ts` so `speech.` method literals and the setup
  error codes may not appear outside `adapters/orca/` (DICT-AC1).

  **Verify:** `pnpm test src/gamepad/gamepad-boundary.test.ts`
