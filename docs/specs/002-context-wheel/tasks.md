# 002 - Context Wheel - Tasks

- [x] **WHEEL-T1 - Geometry**

  Implement total vector-to-segment selection under
  `mobile/src/gamepad/wheel/`, covering dead arcs, wraparound, empty presets,
  and null vectors.

  **Needs:** CTRL-T3

  **Verify:** `pnpm --dir mobile test src/gamepad/wheel/wheel-geometry.test.ts`

- [x] **WHEEL-T2 - Pure state machine**

  Implement the transition table in `tech.md` section 2 with one named test per
  PRD wheel rule.

  **Needs:** WHEEL-T1

  **Verify:** `pnpm --dir mobile test src/gamepad/wheel/wheel-state.test.ts`

- [x] **WHEEL-T3 - Zero-side-effect proof**

  Drive open, motion, invalid-direction, center, back, disconnect, unavailable,
  and unmount paths against recording actions. Assert only a commit outcome can
  produce an invocation.

  **Needs:** WHEEL-T2

  **Verify:** `pnpm --dir mobile test src/gamepad/wheel/wheel-side-effects.test.ts`

- [x] **WHEEL-T4 - Binding registry and preset schema**

  Implement action registration, lifecycle-based unregistration, immutable
  preset loading, and required non-contract/trial metadata.

  **Needs:** WHEEL-T2, FND-T5

  **Verify:** `pnpm --dir mobile test src/gamepad/wheel/wheel-registry.test.ts`; `pnpm --dir mobile test src/gamepad/wheel/wheel-preset.test.ts`

- [x] **WHEEL-T5 - Overlay and input wiring**

  Render the overlay above the existing focused surface, drive it from
  `wheel-motion` and `confirm` intents, and ensure rendering never blocks commit.

  **Needs:** CTRL-T5, WHEEL-T2, WHEEL-T4

  **Verify:** `pnpm --dir mobile test src/gamepad/wheel/WheelOverlay.test.tsx`; `pnpm --dir mobile typecheck`

- [x] **WHEEL-T6 - Harmless smoke presets**

  Add replaceable presets using local no-op/diagnostic bindings only. Include
  different segment counts without naming a product default.

  **Needs:** WHEEL-T4, WHEEL-T5

  Five presets in `mobile/src/gamepad/wheel/experiments/`, at three segment
  counts plus the empty case, bound only to local diagnostics that record a run
  and relabel their own segment — a commit and a cancel both close the wheel, so
  WHEEL-T8 needs something that tells them apart. `smoke-mixed` carries a
  refused, an unproven, and a never-registered binding, which is the only way a
  device trial sees those states. `active-smoke-trial.ts` is what the shell
  runs; it is experiment data, not a default (WHEEL-AC7).

  **Verify:** `pnpm --dir mobile test src/gamepad/wheel/experiments`

- [ ] **WHEEL-T7 - Existing-action experiment presets**

  After `003` bindings exist, add non-destructive real-action presets that
  reference binding ids. Do not include stop, close, forget, delete, or other
  destructive actions.

  **Needs:** WHEEL-T6, BIND-T7

  **Verify:** `pnpm --dir mobile test src/gamepad/wheel/experiments`

- [ ] **WHEEL-T8 - Device trials**

  Run smoke and existing-action presets on a controller-capable Android device
  with Bluetooth controller. Record the complete `WheelTrialRecord` fields under
  `docs/evidence/context-wheel/` and add a schema test for required devices and
  fields.

  **Needs:** WHEEL-T6, WHEEL-T7

  **Verify:** `pnpm --dir mobile test src/gamepad/wheel/wheel-trial-records.test.ts`

- [ ] **WHEEL-T9 - Human assignment gate**

  Present trial records and preset diffs for a product decision. A later change
  may promote a preset only after explicit approval; this MVP specification does
  not perform that promotion. Add a ratchet test requiring the linked decision
  record for any product-default preset.

  **Needs:** WHEEL-T8

  **Verify:** `pnpm --dir mobile test src/gamepad/wheel/wheel-product-default-gate.test.ts`
