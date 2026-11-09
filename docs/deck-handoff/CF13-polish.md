# CF13 — Polish and gaps

**Goal:** Settings complete, wheel forms, every host gap disabled with reason, ported maquette checks, reachability gate, upstream candidates.

|                          |                                                                           |
| ------------------------ | ------------------------------------------------------------------------- |
| Dispatch when            | CF08 merged, CF10 merged, CF11 merged, CF12 merged, owner step L-V11 done |
| Branch                   | `deck/cf13-polish` from `main`                                            |
| PR                       | `Theodagan/orcapad` `main`, title `deck(CF13): Polish and gaps`           |
| Tasks                    | T92, T93, T94, T95, T96, T97 (in this order)                              |
| Owner checks after merge | L-V13                                                                     |

Read [`README.md`](./README.md) first: it holds the rules every cloud worker follows.

## Feature done when

- Every task below meets its _Done when_ (cloud bar), with an entry in `mobile/src/deck/HANDOFF-LOG.md`.
- `pnpm typecheck`, `pnpm test`, `pnpm lint` in `mobile/` add no failures to the recorded baseline; `deck-boundary.test.ts` passes once it exists.
- The PR description lists: tasks done, tasks skipped and why, files touched outside `mobile/src/deck/` and `mobile/app/deck/` (also in `UPSTREAM-TOUCHES.md`), and the owner checks to run.

## Tasks

### T92 — Settings destination complete

- **Scope:** cloud: code and tests.
- **Owner check (not yours):** the device part of _Done when_ is verified locally by the owner (L-V13). Your bar: the tests in _Done when_; where it names only a device check, a hook or render test proving the same behaviour on fixture data; plus the flow exercised against `pnpm mock-server` when it serves the data.
- **Files:** `mobile/app/deck/(dest)/settings.tsx` (edit), `mobile/src/deck/settings/*.tsx` (create, + tests)
- **Change:** SET-1…3 General, Controls, Themes (Orca's `mobile-appearance.ts` preference); rows with `MobileSwitch`; embed `voice-settings-screen` and `notification-settings-screen`; Hosts reusing pair-scan / confirm flows (SET-6/7); Updates panel from T23; Interface switch.
- **Depends on:** T66, T23
- **Done when:** every control reachable by pad and touch; pairing a new desktop works from deck Settings.

### T93 — Wheel forms

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/wheels/forms/*.tsx` (create, + tests)
- **Change:** DIAL-29/32/34/35 per maquette `wheel-forms.js`.
- **Depends on:** T84
- **Done when:** render and gesture tests per form.

### T94 — Every H row shown disabled with reason

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/COVERAGE.md` (edit), affected deck components (edit)
- **Change:** Walk all H rows; each has a placed, disabled control with reason or is explicitly omitted.
- **Depends on:** T53, T64, T89
- **Done when:** a test enumerates H rows from a typed copy of the ledger and finds a component or an omission note for each.

### T95 — Port maquette checks

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/maquette-checks/*.test.ts(x)` (create)
- **Change:** One test per applicable `Pocketdeck/explorations/maquette-v3/checks.js` check, rule ID in the name; skipped ones listed with reason in `COVERAGE.md`.
- **Depends on:** T92, T93
- **Done when:** `pnpm test src/deck/maquette-checks` passes; skip list complete.

### T96 — Reachability gate

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/reachability.test.tsx` (create)
- **Change:** NAV-1 and NAV-9: every visible control reachable by pad and by tap at its centre, landscape and portrait, panels open and closed.
- **Depends on:** T92
- **Done when:** test passes for every deck screen state.

### T97 — Upstream candidates list

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/UPSTREAM-CANDIDATES.md` (create)
- **Change:** H rows worth proposing to Orca (Revert, CPU/RAM, capability declarations, stable RPCs the deck uses), ranked (PRD Q4).
- **Depends on:** T94
- **Done when:** each candidate names the RPC or capability it needs.
