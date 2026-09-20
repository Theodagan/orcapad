# 002 — Context Wheel — Tasks

Each task is independently shippable and leaves `pnpm typecheck`, `pnpm test`,
and `oxlint` green in `mobile/`.

- [ ] **WHEEL-T1 — Geometry** → needs: —

  `src/gamepad/domain/wheel.ts` per `tech.md` §2: `Wheel`, `WheelSegment`, and a
  total `selectSegment`. Covers wrap across 0°, dead arcs between segments, an
  empty wheel, and a null vector.

  **Verify:** `pnpm test src/gamepad/domain/wheel.test.ts`

- [ ] **WHEEL-T2 — State machine** → needs: 1

  `src/gamepad/application/use-cases/drive-wheel.ts` — the pure reducer and the
  full transition table from `tech.md` §3. One named test per PRD §3 rule, each
  citing its rule number (WHEEL-AC1), plus the fake-timer proof that nothing
  waits (WHEEL-AC7).

  **Verify:** `pnpm test src/gamepad/application/use-cases/drive-wheel.test.ts`

- [ ] **WHEEL-T3 — Zero-side-effect proof** → needs: 2

  A test that registers segments whose `run` records invocations, drives every
  cancel path — return to centre, dead arc, disconnect, unmount — and asserts
  every record is empty (WHEEL-AC2).

  This is a task rather than a line in T2 because it is the requirement most
  likely to rot: any future shortcut that runs an action on lock instead of
  commit fails here and nowhere else.

  **Verify:** `pnpm test src/gamepad/application/use-cases/drive-wheel.test.ts`

- [ ] **WHEEL-T4 — Registry** → needs: 1

  `src/gamepad/application/wheel-registry.ts` per `tech.md` §4, including
  unsubscribe on unmount, a throw on duplicate `WheelSegmentId`, and `run`
  reachable from exactly one call site.

  **Verify:** `pnpm test src/gamepad/application/wheel-registry.test.ts`

- [ ] **WHEEL-T5 — Overlay** → needs: 2, 4

  `features/wheel/components/WheelOverlay.tsx` and `WheelSegmentArc.tsx` with the
  state split from `tech.md` §5 — needle on a Reanimated shared value, locked
  segment in React state. `unavailable` renders disabled; `unknown` renders
  normally.

  **Verify:** `pnpm test src/gamepad/features/wheel`

- [ ] **WHEEL-T6 — Wire to controller intents** → needs: 2, 5

  `use-wheel.ts` subscribing to `001`'s `stick-motion` and `confirm` intents and
  driving the machine. The wheel never reads the port directly.

  **Verify:** `pnpm test src/gamepad/features/wheel`; `pnpm test src/gamepad/gamepad-boundary.test.ts`

- [ ] **WHEEL-T7 — Geometry containment rule** → needs: 5

  Extend `gamepad-boundary.test.ts` so arc widths and segment angles may not
  appear outside `domain/wheel.ts` (WHEEL-AC8), in the same shape as the existing
  vocabulary rule.

  **Verify:** `pnpm test src/gamepad/gamepad-boundary.test.ts`

- [ ] **WHEEL-T8 — On-device feel pass** → needs: 6

  Run both wheels on a Retroid Pocket Flip and on iPad with a Bluetooth pad.
  Record the `001` `tech.md` §6 on-device latency measurement, and answer open
  questions 1 and 2 — segment count, and whether the wheel re-opens while the
  stick is still deflected.

  This task produces findings, not code. Its output is edits to `tech.md` §8 and,
  if the feel demands it, one row of the §3 table.

  **Verify:** measurements recorded in `tech.md`; no CI gate.
