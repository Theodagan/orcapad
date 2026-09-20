# 001 — Controller input — Tasks

Each task is independently shippable and leaves `pnpm typecheck`, `pnpm test`,
and `oxlint` green in `mobile/`.

- [ ] **CTRL-T1 — Input domain** → needs: —

  `src/gamepad/domain/input-binding.ts`, `controller-intent.ts`, `pane.ts` per
  `tech.md` §2 and §3. The §4 mapping is a `as const` table; `ControllerIntent`
  is a discriminated union; `stop-session` carries a `SessionId` so it cannot be
  constructed without a target.

  **Verify:** `pnpm test src/gamepad/domain`

- [ ] **CTRL-T2 — Port and stub reader** → needs: 1

  `src/gamepad/application/ports/controller-input-port.ts` per `tech.md` §4, and
  `src/gamepad/adapters/device/controller-input-absent.ts` — a reader that never
  connects and reports `support(): 'unavailable'`. This is what proves CTRL-AC9
  before any native code exists.

  **Verify:** `pnpm typecheck:extraction`

- [ ] **CTRL-T3 — Native module, iOS** → needs: 2

  `mobile/modules/orca-gamepad/` with `expo-module.config.json`, the Swift module
  over `GCController` notifications and `GCExtendedGamepad.valueChangedHandler`,
  and axis normalisation to `tech.md` §5's ranges.

  **Verify:** builds in a dev client; connect a pad and observe samples. Record
  the §6 on-device measurement.

- [ ] **CTRL-T4 — Native module, Android** → needs: 3

  The Kotlin half: `InputManager.InputDeviceListener` for connect/disconnect, and
  decor-view `setOnGenericMotionListener` / `setOnKeyListener` for axes and
  buttons, re-attached on activity recreation.

  Answer open question 2 here — whether a focused terminal WebView consumes key
  events before the decor view sees them — and record the result in `tech.md`
  rather than working around it silently.

  **Verify:** builds in a dev client on a Retroid Pocket Flip; confirm the
  integrated controls' `KEYCODE_BUTTON_*` map and close open question 1.

- [ ] **CTRL-T5 — Adapter binding** → needs: 2

  `src/gamepad/adapters/device/controller-input.ts` implementing the port over
  the native module, including releasing held buttons on disconnect
  (`tech.md` §8).

  **Verify:** `pnpm test src/gamepad/adapters/device/controller-input.test.ts`

- [ ] **CTRL-T6 — Intent resolver** → needs: 1

  `src/gamepad/application/use-cases/resolve-controller-intent.ts` — a pure
  function from previous sample, next sample and focus to intents. Owns the dead
  zone, the `Y` chord, analog trigger velocity, and the silent no-op when the
  focused pane owns no session.

  Table-driven tests over every CTRL-R1 row, plus the 1 ms budget from
  `tech.md` §6.

  **Verify:** `pnpm test src/gamepad/application/use-cases/resolve-controller-intent.test.ts`

- [ ] **CTRL-T7 — Focus model** → needs: 1

  Focus state and its derivation from the existing shell per `tech.md` §7, keyed
  to `useResponsiveLayout().isWideLayout` without changing it. Focus is always
  resolvable, including before first paint and across a route transition.

  **Verify:** `pnpm test src/gamepad/domain/pane.test.ts`

- [ ] **CTRL-T8 — Shell wiring** → needs: 5, 6, 7

  Mount the reader once at the shell, publish intents, and route them to the
  focused pane. `app/h/_layout.tsx` gains focus ownership; no feature subscribes
  to the port directly.

  **Verify:** `pnpm test src/gamepad/gamepad-boundary.test.ts`; no feature file
  imports `controller-input-port`.

- [ ] **CTRL-T9 — Disconnection surface** → needs: 8

  A non-blocking notice when the controller disconnects, dismissed on reconnect.
  Touch stays live throughout — the notice explains, it does not gate.

  **Verify:** `pnpm test src/gamepad/features/controller`

- [ ] **CTRL-T10 — Boundary rule for raw input** → needs: 8

  Extend `gamepad-boundary.test.ts` so `ControllerButton` and `ControllerAxis`
  names may not appear outside `domain/input-binding.ts` and
  `adapters/device/` — the CTRL-AC1 check, in the same shape as the existing
  FND-AC6 vocabulary rule.

  **Verify:** `pnpm test src/gamepad/gamepad-boundary.test.ts`
