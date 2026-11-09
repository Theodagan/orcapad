# CF10 — Approvals inbox

**Goal:** App-wide approvals inbox on the data source chosen by the owner's T63 spike.

| | |
| --- | --- |
| Dispatch when | CF07 merged, owner step L04 done |
| Branch | `deck/cf10-approvals-inbox` from `main` |
| PR | `Theodagan/orcapad` `main`, title `deck(CF10): Approvals inbox` |
| Tasks | T64 (in this order) |
| Owner checks after merge | L-V10 |

Read [`README.md`](./README.md) first: it holds the rules every cloud worker follows.

## Feature done when

- Every task below meets its *Done when* (cloud bar), with an entry in `mobile/src/deck/HANDOFF-LOG.md`.
- `pnpm typecheck`, `pnpm test`, `pnpm lint` in `mobile/` add no failures to the recorded baseline; `deck-boundary.test.ts` passes once it exists.
- The PR description lists: tasks done, tasks skipped and why, files touched outside `mobile/src/deck/` and `mobile/app/deck/` (also in `UPSTREAM-TOUCHES.md`), and the owner checks to run.

## Tasks

### T64 — Approvals inbox
- **Scope:** cloud: code and tests.
- **Owner check (not yours):** the device part of *Done when* is verified locally by the owner (L-V10). Your bar: the tests in *Done when*; where it names only a device check, a hook or render test proving the same behaviour on fixture data; plus the flow exercised against `pnpm mock-server` when it serves the data.
- **Files:** `mobile/app/deck/(dest)/approvals.tsx` (edit), `mobile/src/deck/approvals/use-deck-approvals.ts` (create, + test)
- **Change:** SAFE-5 from T63's source; decisions reuse T61; documentation fields Orca lacks shown as H.
- **Depends on:** T63, T61
- **Done when:** on device, prompts from two sessions appear and can be decided from the inbox.
