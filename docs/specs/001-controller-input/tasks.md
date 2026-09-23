# 001 - Controller Input - Tasks

Android only. iOS and iPadOS are deferred until the Retroid device trials
conclude; a task marked `[~]` is parked, not scheduled, and nothing may depend
on one.

- [~] **CTRL-T1 - Retroid input spike — SUPERSEDED by CTRL-T4**

  Not built. The task assumed a per-device translation table was needed, and the
  research says the opposite: Android's guidance is to key off `KEYCODE_*` and
  `AXIS_*` rather than a device name or vendor id, because those stay constant
  across physical layouts. A table recorded from one handheld is the thing that
  would stop other pads working.

  The variation that does exist is documented and bounded — a trigger arrives as
  `AXIS_LTRIGGER`, as the racing-wheel alias `AXIS_BRAKE`, or as a digital
  `KEYCODE_BUTTON_L2`; a D-pad arrives as a hat axis or as key codes — and
  CTRL-T4 handles all of it. Dead zones come from each device's declared
  `MotionRange.flat` rather than a recorded constant.

  What did survive is the one question no documentation answers: whether a
  focused terminal WebView consumes controller events first. CTRL-T4 answers it
  at runtime on every sample instead of in a one-off record.

- [~] **CTRL-T2 - iOS input spike — DEFERRED**

  Out of scope until the Retroid device trials conclude. Kept so the work can
  resume without rediscovery: use Apple's GameController framework in a
  development build to record a Bluetooth controller's profile, values,
  connect/disconnect behavior, and trigger ranges, and store scrubbed results
  beside the Retroid record. Nothing downstream may depend on it.

  **Needs:** FND-T1

  **Verify:** `ORCA_BACKGROUND_LAUNCH=1 pnpm --dir mobile ios`

- [x] **CTRL-T3 - Controller domain and resolver**

  Implement normalized samples, `PRD_CONTROLLER_BINDINGS`, the separate
  `EXPERIMENTAL_DPAD_BINDINGS`, intents, dead-zone handling, trigger velocity,
  and the `Y` chord under `mobile/src/gamepad/`.

  **Needs:** CTRL-T4

  **Verify:** `pnpm --dir mobile test src/gamepad/controller-input`; `pnpm --dir mobile typecheck`

- [ ] **CTRL-T4 - Local Expo module**

  Implement `mobile/modules/orca-gamepad/` for Android against Android's
  documented input contract: both trigger spellings plus the digital fallback,
  both D-pad forms, right stick on either axis pair, and dead zones read from
  each device's `MotionRange.flat`. Publish whether the focused view consumed
  the event, which is the WebView checkpoint in `tech.md` §6. Provide an absent
  reader for unsupported environments, which is what iOS and every
  non-controller build get while iOS is deferred.

  **Needs:** FND-T5

  **Verify:** `ORCA_BACKGROUND_LAUNCH=1 pnpm --dir mobile android`

- [x] **CTRL-T5 - Focus registry and shell lifecycle**

  Mount one reader/provider at the existing mobile shell, register mounted
  existing surfaces, dispatch intents to one active target, and keep route state
  authoritative.

  **Needs:** FND-T5, CTRL-T3, CTRL-T4

  **Verify:** `pnpm --dir mobile test src/gamepad/focus`; `pnpm --dir mobile typecheck`

- [x] **CTRL-T6 - Controller connection notice**

  Add a non-blocking notice for an active controller disconnect. Release held
  state, preserve touch, and dismiss the notice on reconnect.

  **Needs:** CTRL-T5

  **Verify:** `pnpm --dir mobile test src/gamepad/controller-connection`

- [x] **CTRL-T7 - Raw-input and experiment ratchets**

  Extend `mobile/src/gamepad/gamepad-boundary.test.ts` so existing surfaces do
  not name raw controls and accepted PRD mapping tests cannot import provisional
  D-pad bindings.

  **Needs:** CTRL-T3, FND-T3

  **Verify:** `pnpm --dir mobile test src/gamepad/gamepad-boundary.test.ts`

- [ ] **CTRL-T8 - Device performance record**

  Measure dead-zone-to-wheel-frame p95 and disconnect-notice timing on Retroid.
  Record tool, build, sample count, raw results, and conclusion. Add a
  schema test that fails when either required record is absent or incomplete.

  **Needs:** CTRL-T4, CTRL-T5, WHEEL-T5 — blocked: WHEEL-T5 is in `002`, so the
  wheel-frame measurement has nothing to measure yet.

  **Verify:** `pnpm --dir mobile test src/gamepad/controller-input/controller-evidence.test.ts`
