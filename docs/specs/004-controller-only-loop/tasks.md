# 004 - The Controller-Only Loop - Tasks

- [x] **LOOP-T1 - Reachability audit**

  Encode the loop from `product.md` as data and assert each step against the
  real bindings. The audit lands first so every later task is measured by it
  rather than by assertion.

  **Needs:** BIND-T9

  **Verify:** `pnpm --dir mobile test src/gamepad/loop`

- [x] **LOOP-T2 - Selection movement as contract**

  Split `dpadNavigation` from `experimentalDpad` and default it on. Record the
  PRD position change as a decision, gated the way WHEEL-T9 gates a promotion.

  **Needs:** LOOP-T1

  **Verify:** `pnpm --dir mobile test src/gamepad/controller-input/controller-resolver.test.ts src/gamepad/loop`

- [x] **LOOP-T3 - Answering an agent**

  Give the ask and question cards their own focus targets: `move-selection`
  changes the highlighted option, `confirm` submits it through the existing
  callback. Do not invent a default.

  **Needs:** LOOP-T2

  **Verify:** `pnpm --dir mobile test src/gamepad/bindings/agent-prompt-selection.test.ts src/session/MobileNativeChatQuestion.test.tsx`

- [x] **LOOP-T4 - Text without a keyboard**

  Register canned replies as non-contractual wheel actions on the agent view,
  sending through the existing send callback.

  **Needs:** LOOP-T3, WHEEL-T7

  **Verify:** `pnpm --dir mobile test src/gamepad/wheel/experiments`

- [ ] **LOOP-T5 - Action hints**

  Derive the current surface's available actions from the focus registry and the
  PRD binding table, and render them. No hand-written hint table.

  **Needs:** LOOP-T1

  **Verify:** `pnpm --dir mobile test src/gamepad/controller-input/action-hints.test.ts`

- [x] **LOOP-T6 - Close the audit**

  Every step in `LOOP-T1` reachable, with the audit a gate rather than a report.

  **Needs:** LOOP-T2, LOOP-T3, LOOP-T4

  **Verify:** `pnpm --dir mobile test src/gamepad/loop`

- [ ] **LOOP-T7 - Controller-only device run**

  Complete one real task end to end — prompt an agent, answer its question,
  approve a tool call, read the diff — without touching the screen. Record it
  against the BIND-T10 schema with a `touch: 'not used'` column.

  **Needs:** LOOP-T6, BIND-T10

  **Verify:** `pnpm --dir mobile test src/gamepad/bindings/controller-binding-evidence.test.ts`
