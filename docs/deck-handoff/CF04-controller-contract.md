# CF04 — Deck controller contract

**Goal:** One chord table drives deck bindings, hints and Help; every controller invariant has a test; Orca components get pad-focus wrappers.

|                          |                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| Dispatch when            | CF02 merged, decision D2 recorded (owner)                                                  |
| Branch                   | `deck/cf04-controller-contract` from `main`                                                |
| PR                       | `Theodagan/orcapad` `main`, title `deck(CF04): Deck controller contract`                   |
| Tasks                    | T66, T25, T26, T27, T28, T29, T30, T31, T32, T33, T34, T35, T36, T37, T105 (in this order) |
| Owner checks after merge | none                                                                                       |

Read [`README.md`](./README.md) first: it holds the rules every cloud worker follows.

## Feature done when

- Every task below meets its _Done when_ (cloud bar), with an entry in `mobile/src/deck/HANDOFF-LOG.md`.
- `pnpm typecheck`, `pnpm test`, `pnpm lint` in `mobile/` add no failures to the recorded baseline; `deck-boundary.test.ts` passes once it exists.
- The PR description lists: tasks done, tasks skipped and why, files touched outside `mobile/src/deck/` and `mobile/app/deck/` (also in `UPSTREAM-TOUCHES.md`), and the owner checks to run.

## Requirements cited

From the PRD (not in the repo). Rule IDs such as `PAD-6` are in `Theodagan/Pocketdeck` `docs/ux/ux-rules.md`.

- **DECK-R13** Every timed or chorded input has a visible touch alternative (PAD-8).

## Tasks

### T66 — Split keys setting

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/settings/deck-settings-store.ts` (create, + test)
- **Change:** Deck settings store (split vs bottom keys, focus tick, haptics, sounds, prototype notes); used by T36, T65, T88.
- **Depends on:** T5
- **Done when:** tests for defaults and persistence.

### T25 — Deck chord table

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/controller/chord-table.ts` (create, + test)
- **Change:** One table: control/chord → intent → label → screen scope, per PAD-1…13, NAV-*, IH-6. Single source for bindings, hints (T33) and Help (T35).
- **Depends on:** T6
- **Done when:** test asserts no duplicate chord per scope and every intent has a label.

### T26 — Deck binding layer over the existing input runtime

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/controller/use-deck-bindings.ts` (create), `mobile/src/gamepad/bindings/surface-binding.ts` (edit only if a hook point is missing; log it)
- **Change:** While the deck is mounted, deck intents from the chord table take the controller via `controller-input/controller-runtime.ts` and `bindings/use-surface-binding.ts`; Orca-screen bindings stay inactive.
- **Depends on:** T25
- **Done when:** a composed-screen test (spec 005 standard) shows a deck intent fires and no Orca-screen binding fires.

### T27 — Contract: A / X / B, and B never switches destination

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/controller/contract-face-buttons.test.tsx` (create), `use-deck-bindings.ts` (edit)
- **Change:** PAD-1, PAD-11 (Y+B is the only back).
- **Depends on:** T26
- **Done when:** test: B dismisses an open layer and does nothing else at root; Y+B pops history.

### T28 — Contract: L1/R1 and Y + L1/R1 tap / long-press

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/controller/contract-shoulders.test.tsx` (create), `use-deck-bindings.ts` (edit)
- **Change:** PAD-2; PAD-6 with 450 ms long-press via `controller-input/tap-tracker.ts`, haptic on toggle.
- **Depends on:** T26
- **Done when:** test with fake timers: tap moves panel focus, 450 ms hold toggles panel and fires haptic once.

### T29 — Contract: L2/R2 analog scroll everywhere

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/controller/use-deck-scroll.ts` (create, + test)
- **Change:** PAD-3, SCR-11; reuse `bindings/controller-scroll-rate.ts` and `controller-scroll-tracker.ts`.
- **Depends on:** T26
- **Done when:** test: trigger value maps to scroll rate monotonically; no other trigger meaning outside a wheel or Y chord.

### T30 — Contract: Y is a modifier only

- **Scope:** cloud: code and tests.
- **Decision:** use the value given in this feature's dispatch prompt; if none is given, skip this task and report it.
- **Files:** `mobile/src/deck/controller/contract-modifier.test.tsx` (create), `use-deck-bindings.ts` (edit)
- **Change:** PAD-9 per D2; reuse `controller-input/use-modifier-held.ts`.
- **Depends on:** T26
- **Done when:** test: Y press/release alone fires no intent; Y held switches the active scope to the Y layer.

### T31 — Contract: arrows bound to the focused pane, one focus, stable restore

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/focus/deck-focus.ts` (create, + test)
- **Change:** NAV-6/7/11/12 on `gamepad/focus/focus-registry.ts` and `zones/zone-grid.ts`; focus keys are stable ids.
- **Depends on:** T26
- **Done when:** test: arrows never leave the focused pane; exactly one focused element; re-render keeps focus on the same key.

### T32 — Contract: Start, hold-Start dictation, L3/R3

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/controller/contract-start-sticks.test.tsx` (create), `use-deck-bindings.ts` (edit)
- **Change:** PAD-7 (650 ms hold toggles dictation via `bindings/active-dictation.ts`); PAD-5 (L3/R3 alone inert; L3+R3 opens TUI wheels, wired in T81).
- **Depends on:** T26
- **Done when:** fake-timer test for 650 ms threshold; L3 alone fires nothing.

### T33 — Hint strip with Y layer

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/hints/DeckHintStrip.tsx` (create, + render test)
- **Change:** Reads the chord table for the current scope; shows the Y layer while Y is held (PAD-13, IH-6); never overflows (VIS-6, SD-2): drops lowest-priority hints.
- **Depends on:** T25, T30, T10
- **Done when:** render test at 640 px width shows no overflow; holding Y swaps content.

### T34 — Hints on elements

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/hints/Hintify.tsx` (create, + test)
- **Change:** HINT-2/6: focused element shows its button glyph; falls back to the strip when it would break layout (HINT-8).
- **Depends on:** T33
- **Done when:** test: focused hintified element renders glyph; constrained layout routes it to the strip.

### T35 — Help diagram from live bindings

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/hints/DeckHelp.tsx` (create, + test)
- **Change:** SD-10: controller drawing labelled from the chord table for the current screen.
- **Depends on:** T25
- **Done when:** test: changing a binding in the table changes the diagram label.

### T36 — Focus tick

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/feedback/focus-tick.ts` (create, + test)
- **Change:** SD-9: light click + `expo-haptics` on controller focus moves only, not taps; switch stored in deck settings.
- **Depends on:** T31, T66
- **Done when:** test: pad focus move triggers once, touch focus does not, switch off silences.

### T37 — Touch alternative registry

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/controller/touch-alternatives.test.ts` (create)
- **Change:** DECK-R13/PAD-8: every timed or chorded intent in the chord table names its touch control.
- **Depends on:** T25
- **Done when:** test fails when a chorded intent lacks a touch alternative.

### T105 — Pad-focus wrappers for Orca components

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/focus/focusable-orca.tsx` (create, + test)
- **Change:** Small wrappers that put Orca components (rows, segmented control, switch, sheet primary button) in a `gamepad/zones/ZoneItem` with `ControllerFocusRing`, so pad focus is drawn without restyling the component and touch looks unchanged.
- **Depends on:** T31, T104
- **Done when:** render test: a wrapped `WorktreeListRow` shows the focus ring only when focused and calls the same handler on A as on tap.
