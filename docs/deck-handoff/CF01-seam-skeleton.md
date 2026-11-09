# CF01 — Seam and shell skeleton

**Goal:** Mount an empty deck shell beside Orca's screens behind one setting, guard the seam, and add the host feature gate and lenient parsing every later feature builds on.

|               |                                                                         |
| ------------- | ----------------------------------------------------------------------- |
| Dispatch when | baseline on `main`                                                      |
| Branch        | `deck/cf01-seam-skeleton` from `main`                                   |
| PR            | `Theodagan/orcapad` `main`, title `deck(CF01): Seam and shell skeleton` |
| Tasks         | T4, T3, T5, T6, T7, T8, T9, T11, T12 (in this order)                    |

Read [`README.md`](./README.md) first: it holds the rules every cloud worker follows.

## Feature done when

- Every task below meets its _Done when_ (cloud bar), with an entry in `mobile/src/deck/HANDOFF-LOG.md`.
- `pnpm typecheck`, `pnpm test`, `pnpm lint` in `mobile/` add no failures to the recorded baseline; `deck-boundary.test.ts` passes once it exists.
- The PR description lists: tasks done, tasks skipped and why, files touched outside `mobile/src/deck/` and `mobile/app/deck/` (also in `UPSTREAM-TOUCHES.md`), and what the owner should try on the device.

## Requirements cited

From the PRD (not in the repo). Rule IDs such as `PAD-6` are in `Theodagan/Pocketdeck` `docs/ux/ux-rules.md`.

- **DECK-R37** Capabilities come from what Orca declares; nothing is inferred (SAFE-3). A missing
  one shows disabled with its reason, never a working-looking control that does nothing.
- **DECK-R40** `deck/` depends only on the data API and the engine modules. It never loads the
  page, uses the bridge, or calls the bundle methods.
- Decided 2026-11-09: Orca's own screens follow upstream (the downloaded page) from the first
  baseline. The fork carries only the pad plumbing, the deck and its own app identity. Until the deck
  covers the agent loop (M3), daily pad use stays on the previous fork build, installed under the old
  package id beside the new app.
- The deck gets no screen updates from the desktop. New screens reach users only through a new APK,
  hence §7.10.
- If upstream moves logic into the page (computed in browser code instead of exposed as an RPC), that
  feature becomes an H row (§6): rebuild it in `deck/` from data the API does expose, or show it as
  unavailable.
- **DECK-R41** Every host feature the deck uses is gated on the desktop's declared feature list,
  never on a version number or on what the engine code knows. A missing feature is shown disabled
  with its reason (DECK-R37). This also covers a newer fork build against an older desktop.
- **DECK-R42** Data from the host is parsed leniently in `deck/`: unknown fields pass, unknown status
  or kind values fall back to a neutral state. A schema addition upstream must never blank a screen.
  M0 audits the engine parsers the deck reads and lists strict ones in `COVERAGE.md`.

## Tasks

### T4 — Start the touched-file ledger

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/UPSTREAM-TOUCHES.md` (create)
- **Change:** Header naming the baseline (upstream `c82839fb7b6` + pad plumbing, decided 2026-11-09) and the append-only line format `path — reason — task`.
- **Depends on:** T1
- **Done when:** the file exists with the baseline line and format.

### T3 — Add the upstream merge check script

- **Scope:** cloud: code and tests.
- **Files:** `mobile/scripts/deck-upstream-check.mjs` (create), `mobile/package.json` (edit: `deck:upstream-check` script)
- **Change:** Script for the PRD §5.3 checklist: (1) for each Orca module imported from `src/deck/**`, the native file (not only `.web.*`) exists; (2) each RPC method name the deck calls (collected from `src/deck/**` operation files) exists in `src/main/runtime/rpc/methods/`. Prints a pass/fail table.
- **Depends on:** T1
- **Done when:** `pnpm deck:upstream-check` exits 0 on the baseline and exits 1 when a probe import to a deleted file is added to a fixture directory used by its own test (`mobile/scripts/deck-upstream-check.test.ts`).

### T5 — Add the interface preference

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/storage/preferences.ts` (edit), `mobile/src/deck/entry/interface-preference.ts` (create), `mobile/src/deck/entry/interface-preference.test.ts` (create)
- **Change:** One stored value `interface: 'deck' | 'orca'`, default `'orca'` until M3, read through a deck-owned hook. Log the `preferences.ts` touch.
- **Depends on:** T4
- **Done when:** unit test covers default, write, read-after-restart (mocked storage).

### T6 — Mount the deck route group

- **Scope:** cloud: code and tests.
- **Device part:** the owner tests it locally after delivery; it does not block you. Your bar: the tests in _Done when_; where it names only a device check, a hook or render test proving the same behaviour on fixture data; plus the flow exercised against `pnpm mock-server` when it serves the data.
- **Files:** `mobile/app/deck/_layout.tsx` (create), `mobile/app/deck/index.tsx` (create), `mobile/src/deck/DeckShell.tsx` (create)
- **Change:** Expo Router group for the deck; `DeckShell` renders an empty frame with the deck background. Inherits `RpcClientProvider` and `ControllerShell` from `app/_layout.tsx`.
- **Depends on:** T5
- **Done when:** navigating to `/deck` on device shows the deck frame; Orca's routes still work.

### T7 — Route the app entry by the interface preference

- **Scope:** cloud: code and tests.
- **Split:** Your part: the redirect, the Settings row and the render test. The owner checks the relaunch on the device later.
- **Files:** `mobile/app/index.tsx` (edit), `mobile/src/settings/mobile-settings-menu-items.ts` (edit)
- **Change:** `app/index.tsx` redirects to `/deck` when the preference is `deck`; Orca Settings gets an "Interface" row to switch. Log both touches.
- **Depends on:** T6
- **Done when:** toggling the row and relaunching lands on the chosen shell (device check + a render test of `app/index.tsx`).

### T8 — Add the deck boundary test

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/deck-boundary.test.ts` (create)
- **Change:** Fails when any file outside `src/deck/` and `app/deck/` imports from them (DECK-R40 seam), and when `src/deck/**` imports `mobile-web-shell/**`, `modules/orca-mobile-web-shell/**` or `transport/mobile-web-bundle-*` (DECK-R40). Pattern from `gamepad-boundary.test.ts` (source scan with `typescript`).
- **Depends on:** T6
- **Done when:** test passes; adding a probe import in a fixture makes each rule fail (predicates unit-tested like the gamepad ratchets).

### T9 — Create and verify the coverage ledger

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/COVERAGE.md` (create)
- **Change:** One row per PRD §6 area: rule IDs → tier (R/N/H/P) → status → owning file. Verify each R row by naming the Orca hook or RPC that serves it (e.g. Sessions → `worktree/worktree-list-snapshot.ts`, prompts → `session/native-chat/use-mobile-native-chat-prompts.ts`); correct tiers that are wrong.
- **Depends on:** T2
- **Done when:** no row says "unverified"; every R row cites a file that exists (`pnpm deck:upstream-check` style spot check).

### T11 — Feature gate hook

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/host/use-host-feature.ts` (create), `mobile/src/deck/host/disabled-reason.ts` (create), tests (create)
- **Change:** `useHostFeature(capability)` returns `{ available: true } | { available: false, reason }` from the negotiated capabilities (`transport/mobile-runtime-capability-negotiation.ts`). DECK-R41, DECK-R37.
- **Depends on:** T6
- **Done when:** tests cover: capability present, absent (reason "This desktop doesn't provide …"), host not connected (reason distinct).

### T12 — Lenient host-data parsing and engine parser audit

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/host/lenient-host-data.ts` (create, + test), `mobile/src/deck/COVERAGE.md` (edit: "Strict parsers" section)
- **Change:** Helpers that wrap Orca reply schemas so unknown fields pass and unknown enum values map to a neutral `unknown` (DECK-R42). Audit the `*-reply-schema.ts` files the deck will read and list strict ones.
- **Depends on:** T9
- **Done when:** tests feed an unknown field and an unknown status value and get data + `unknown`; the audit lists every schema the ledger's R rows rely on.
