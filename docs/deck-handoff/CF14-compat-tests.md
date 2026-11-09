# CF14 — Newer-desktop compatibility tests

**Goal:** Tests that mount the deck against hosts missing features and hosts sending unknown data.

|               |                                                                                   |
| ------------- | --------------------------------------------------------------------------------- |
| Dispatch when | CF10 merged, CF12 merged                                                          |
| Branch        | `deck/cf14-compat-tests` from `main`                                              |
| PR            | `Theodagan/orcapad` `main`, title `deck(CF14): Newer-desktop compatibility tests` |
| Tasks         | T98, T99 (in this order)                                                          |

Read [`README.md`](./README.md) first: it holds the rules every cloud worker follows.

## Feature done when

- Every task below meets its _Done when_ (cloud bar), with an entry in `mobile/src/deck/HANDOFF-LOG.md`.
- `pnpm typecheck`, `pnpm test`, `pnpm lint` in `mobile/` add no failures to the recorded baseline; `deck-boundary.test.ts` passes once it exists.
- The PR description lists: tasks done, tasks skipped and why, files touched outside `mobile/src/deck/` and `mobile/app/deck/` (also in `UPSTREAM-TOUCHES.md`), and what the owner should try on the device.

## Requirements cited

From the PRD (not in the repo). Rule IDs such as `PAD-6` are in `Theodagan/Pocketdeck` `docs/ux/ux-rules.md`.

- **DECK-R41** Every host feature the deck uses is gated on the desktop's declared feature list,
  never on a version number or on what the engine code knows. A missing feature is shown disabled
  with its reason (DECK-R37). This also covers a newer fork build against an older desktop.
- **DECK-R42** Data from the host is parsed leniently in `deck/`: unknown fields pass, unknown status
  or kind values fall back to a neutral state. A schema addition upstream must never blank a screen.
  M0 audits the engine parsers the deck reads and lists strict ones in `COVERAGE.md`.

## Tasks

### T98 — Missing-feature host fixture tests

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/host/compat-missing-features.test.tsx` (create)
- **Change:** Mount key deck screens against a host that declares none of the optional capabilities; each gated control shows its reason (DECK-R41).
- **Depends on:** T11, T64, T89
- **Done when:** test passes; removing a gate makes it fail.

### T99 — Unknown-data host fixture tests

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/host/compat-unknown-data.test.tsx` (create)
- **Change:** Feed unknown fields and unknown status/kind values to Sessions, Overview, Approvals; screens render with neutral states (DECK-R42).
- **Depends on:** T12, T49, T53, T64
- **Done when:** test passes; switching a parser to strict makes it fail.
