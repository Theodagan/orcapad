# CF15 — Deck by default and retire the forked screens

**Goal:** After M3 acceptance: deck becomes the default; Orca's own screens follow upstream's page; native-only bindings go.

|                          |                                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| Dispatch when            | owner step L07 done                                                                           |
| Branch                   | `deck/cf15-post-m3` from `main`                                                               |
| PR                       | `Theodagan/orcapad` `main`, title `deck(CF15): Deck by default and retire the forked screens` |
| Tasks                    | T71, T101, T102, T103 (in this order)                                                         |
| Owner checks after merge | L09                                                                                           |

Read [`README.md`](./README.md) first: it holds the rules every cloud worker follows.

## Feature done when

- Every task below meets its _Done when_ (cloud bar), with an entry in `mobile/src/deck/HANDOFF-LOG.md`.
- `pnpm typecheck`, `pnpm test`, `pnpm lint` in `mobile/` add no failures to the recorded baseline; `deck-boundary.test.ts` passes once it exists.
- The PR description lists: tasks done, tasks skipped and why, files touched outside `mobile/src/deck/` and `mobile/app/deck/` (also in `UPSTREAM-TOUCHES.md`), and the owner checks to run.

## Tasks

### T71 — Make the deck the default interface

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/entry/interface-preference.ts` (edit)
- **Change:** Default `'deck'` once T70 passes; Orca remains selectable.
- **Depends on:** T70
- **Done when:** fresh install opens the deck.

### T101 — Restore upstream's host routes for Orca screens

- **Scope:** cloud: code and tests.
- **Split:** Cloud part: restoring upstream's route files and gate, plus tests. Loading the page on the device is the owner's (L09).
- **Files:** `mobile/app/h/[hostId]/**` (edit to upstream), `mobile/src/components/HostProtocolGate.tsx` (edit to upstream)
- **Change:** Already true from the T1 baseline (Orca's routes are upstream's). Only verify nothing in `mobile/app/h/**` diverged from upstream since.
- **Depends on:** T71
- **Done when:** `git diff upstream/main -- mobile/app/h` is empty.

### T102 — Remove gamepad bindings that only drove native Orca screens

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/gamepad/bindings/use-*-controller-binding.ts` (delete those with no remaining consumer), `mobile/src/gamepad/gamepad-boundary.test.ts` (edit)
- **Change:** Keep input plumbing the deck uses (controller-input, focus, zones); remove bindings for screens that no longer exist natively.
- **Depends on:** T101
- **Done when:** `pnpm typecheck && pnpm test && pnpm lint` pass; `rg` finds no imports of deleted files.

### T103 — Drop the revert check from the merge checklist

- **Scope:** cloud: code and tests.
- **Split:** Cloud part: the script change only. The fork memory note is updated locally by the owner (L09).
- **Files:** `mobile/scripts/deck-upstream-check.mjs` (edit), fork memory note `fork-keeps-native-screens` (edit)
- **Change:** Checklist item 3 is obsolete since the T1 baseline (no reverts to keep): remove it now rather than after M3; memory note already updated.
- **Depends on:** T101
- **Done when:** script no longer reports item 3; note updated.
