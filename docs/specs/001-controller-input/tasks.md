# 001 - Controller Input - Tasks

Android only. iOS and iPadOS are deferred until the Retroid device trials
conclude; a task marked `[~]` is parked, not scheduled, and nothing may depend
on one.

- [ ] **CTRL-T1 - Retroid input spike**

  Build the smallest temporary Android native probe needed to record the Retroid
  Pocket Flip's device sources, axes, key codes, trigger form, disconnect events,
  and focused-terminal WebView behavior. Store scrubbed results under
  `docs/evidence/controller-input/`.

  **Needs:** FND-T1

  **Verify:** `ORCA_BACKGROUND_LAUNCH=1 pnpm --dir mobile android`

- [~] **CTRL-T2 - iOS input spike — DEFERRED**

  Out of scope until the Retroid device trials conclude. Kept so the work can
  resume without rediscovery: use Apple's GameController framework in a
  development build to record a Bluetooth controller's profile, values,
  connect/disconnect behavior, and trigger ranges, and store scrubbed results
  beside the Retroid record. Nothing downstream may depend on it.

  **Needs:** FND-T1

  **Verify:** `ORCA_BACKGROUND_LAUNCH=1 pnpm --dir mobile ios`

- [ ] **CTRL-T3 - Controller domain and resolver**

  Implement normalized samples, `PRD_CONTROLLER_BINDINGS`, the separate
  `EXPERIMENTAL_DPAD_BINDINGS`, intents, dead-zone handling, trigger velocity,
  and the `Y` chord under `mobile/src/gamepad/`.

  **Needs:** CTRL-T1

  **Verify:** `pnpm --dir mobile test src/gamepad/controller-input`; `pnpm --dir mobile typecheck`

- [ ] **CTRL-T4 - Local Expo module**

  Implement `mobile/modules/orca-gamepad/` for Android using the mechanisms
  validated by CTRL-T1. Provide an absent reader for unsupported environments,
  which is what iOS and every non-controller build get while iOS is deferred.
  Delete the CTRL-T1 probe module, screen and route in the same change.

  **Needs:** CTRL-T1, CTRL-T3

  **Verify:** `ORCA_BACKGROUND_LAUNCH=1 pnpm --dir mobile android`

- [ ] **CTRL-T5 - Focus registry and shell lifecycle**

  Mount one reader/provider at the existing mobile shell, register mounted
  existing surfaces, dispatch intents to one active target, and keep route state
  authoritative.

  **Needs:** FND-T5, CTRL-T3, CTRL-T4

  **Verify:** `pnpm --dir mobile test src/gamepad/focus`; `pnpm --dir mobile typecheck`

- [ ] **CTRL-T6 - Controller connection notice**

  Add a non-blocking notice for an active controller disconnect. Release held
  state, preserve touch, and dismiss the notice on reconnect.

  **Needs:** CTRL-T5

  **Verify:** `pnpm --dir mobile test src/gamepad/controller-connection`

- [ ] **CTRL-T7 - Raw-input and experiment ratchets**

  Extend `mobile/src/gamepad/gamepad-boundary.test.ts` so existing surfaces do
  not name raw controls and accepted PRD mapping tests cannot import provisional
  D-pad bindings.

  **Needs:** CTRL-T3, FND-T3

  **Verify:** `pnpm --dir mobile test src/gamepad/gamepad-boundary.test.ts`

- [ ] **CTRL-T8 - Device performance record**

  Measure dead-zone-to-wheel-frame p95 and disconnect-notice timing on Retroid.
  Record tool, build, sample count, raw results, and conclusion. Add a
  schema test that fails when either required record is absent or incomplete.

  **Needs:** CTRL-T4, CTRL-T5, WHEEL-T5

  **Verify:** `pnpm --dir mobile test src/gamepad/controller-input/controller-evidence.test.ts`
