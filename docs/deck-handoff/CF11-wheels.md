# CF11 — Wheels

**Goal:** Reanimated wheel engine, hold gesture, left and right wheels, sub-wheel rim, summoned wheels, TUI key wheels, edit with Undo.

|                          |                                                                  |
| ------------------------ | ---------------------------------------------------------------- |
| Dispatch when            | CF07 merged, owner step L06 done                                 |
| Branch                   | `deck/cf11-wheels` from `main`                                   |
| PR                       | `Theodagan/orcapad` `main`, title `deck(CF11): Wheels`           |
| Tasks                    | T74, T75, T76, T77, T78, T79, T80, T81, T82, T83 (in this order) |
| Owner checks after merge | L-V11                                                            |

Read [`README.md`](./README.md) first: it holds the rules every cloud worker follows.

## Feature done when

- Every task below meets its _Done when_ (cloud bar), with an entry in `mobile/src/deck/HANDOFF-LOG.md`.
- `pnpm typecheck`, `pnpm test`, `pnpm lint` in `mobile/` add no failures to the recorded baseline; `deck-boundary.test.ts` passes once it exists.
- The PR description lists: tasks done, tasks skipped and why, files touched outside `mobile/src/deck/` and `mobile/app/deck/` (also in `UPSTREAM-TOUCHES.md`), and the owner checks to run.

## Requirements cited

From the PRD (not in the repo). Rule IDs such as `PAD-6` are in `Theodagan/Pocketdeck` `docs/ux/ux-rules.md`.

- **DECK-R17** A wheel is a hold gesture on its stick: past the dead zone opens that side's wheel,
  rotating turns it, the **opposite trigger validates**, the **same-side trigger dismisses / steps
  back**, return to centre closes (DIAL-0, DIAL-25, DIAL-33, DIAL-31).
- **DECK-R18** Feel: click-wheel ring under a fixed selector, rate curve and S-curve gain, 1/8-turn
  distance guard, no snap animation, loop only above six entries (DIAL-21, 24, 26, 27, 30). Draw on
  the UI thread (Reanimated worklets); a dropped frame during a turn is a bug. Today's wheels
  (`gamepad/wheel`) do not use Reanimated, so this is a rewrite of the wheel's rendering.
  Note: stick samples reach JS as events from the native module (`OrcaGamepadModule.kt`, `sendEvent`),
  so input still waits on the JS thread even when drawing does not. M4 measures turn latency on device
  while a chat streams; if it fails, the native module writes stick values straight into a
  UI-thread shared value (small native change, logged in `UPSTREAM-TOUCHES.md` only if it touches an
  Orca file).
- **DECK-R20** Items are kind-coded with colour **and** shape and label (DIAL-2, VIS-2); counts as
  badges (DIAL-16); no duplicate entries (DIAL-22); a readout card previews the selected item
  (DIAL-9, DIAL-18, IH-13).

## Tasks

### T74 — Wheel engine on Reanimated

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/wheels/wheel-engine.ts` (create, + test)
- **Change:** DECK-R18: click-wheel ring under a fixed selector, rate curve and S-curve gain, 1/8-turn distance guard, no snap, loop above six entries. Reuse `gamepad/wheel/wheel-geometry.ts` math.
- **Depends on:** T72 (and T73 if required)
- **Done when:** unit tests for gain curve, distance guard and looping rule; no JS-thread `setState` per frame.

### T75 — Hold gesture model

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/wheels/wheel-gesture.ts` (create, + test)
- **Change:** DECK-R17: past dead zone opens the side's wheel; opposite trigger validates; same-side trigger steps back; centre closes (DIAL-0, 25, 31, 33).
- **Depends on:** T74
- **Done when:** sample-sequence tests for each path.

### T76 — Wheel view and readout card

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/wheels/DeckWheel.tsx`, `WheelReadout.tsx` (create, + tests)
- **Change:** DECK-R20: kind coded by colour, shape and label; badges; readout previews selection (DIAL-2, 9, 16, 18, 22).
- **Depends on:** T74, T10
- **Done when:** render tests; duplicate entries rejected.

### T77 — Left wheel content

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/wheels/left-wheel.ts` (create, + test)
- **Change:** DIAL-14, DIAL-19: destinations, Needs you, open sessions in the workspace.
- **Depends on:** T76, T38
- **Done when:** test: entries follow destinations registry and live counts.

### T78 — Right wheel and Launch agent rim

- **Scope:** cloud: code and tests.
- **Owner check (not yours):** the device part of _Done when_ is verified locally by the owner (L-V11). Your bar: the tests in _Done when_; where it names only a device check, a hook or render test proving the same behaviour on fixture data; plus the flow exercised against `pnpm mock-server` when it serves the data.
- **Files:** `mobile/src/deck/wheels/right-wheel.ts`, `SubWheelRim.tsx` (create, + tests)
- **Change:** IH-12 session actions; DIAL-17/28 Launch agent as sub-wheel rim using `session/mobile-agent-launch-availability.ts`.
- **Depends on:** T76, T40
- **Done when:** on device, launching an agent from the rim starts it.

### T79 — Summoned wheels by edge swipe

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/wheels/SummonedWheel.tsx` (create, + test)
- **Change:** DIAL-13 with gesture-handler; DIAL-20 purpose-summoned style.
- **Depends on:** T76
- **Done when:** touch-only test opens and turns the wheel.

### T80 — Open/close animation and reduce motion

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/wheels/wheel-motion.ts` (create, + test)
- **Change:** DIAL-8, DIAL-23; reduce motion skips.
- **Depends on:** T76
- **Done when:** test: reduce motion → zero-duration transitions.

### T81 — TUI key wheels

- **Scope:** cloud: code and tests.
- **Owner check (not yours):** the device part of _Done when_ is verified locally by the owner (L-V11). Your bar: the tests in _Done when_; where it names only a device check, a hook or render test proving the same behaviour on fixture data; plus the flow exercised against `pnpm mock-server` when it serves the data.
- **Files:** `mobile/src/deck/wheels/tui-key-wheels.ts` (create, + test)
- **Change:** DIAL-6: literal key bytes through Orca's terminal input; opened by L3+R3 (T32).
- **Depends on:** T76, T57
- **Done when:** on device, Esc / Ctrl-C / arrows reach the TUI.

### T82 — Wheel edit mode with Undo

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/wheels/wheel-edit.ts`, `mobile/src/deck/feedback/undo-toast.tsx` (create, wraps `TransientToast`, + tests)
- **Change:** DIAL-11, SAFE-6: edit from the wheel, saved per wheel, Undo toast built on `TransientToast`.
- **Depends on:** T77, T78
- **Done when:** tests: edit persists across restart; Undo restores.

### T83 — Retire the old wheel overlay inside the deck

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/controller/use-deck-bindings.ts` (edit)
- **Change:** Deck screens never mount `gamepad/wheel/WheelOverlay.tsx`; Orca screens keep it until Slice 10.
- **Depends on:** T77
- **Done when:** composed test: stick hold on a deck screen opens only the deck wheel.
