# CF10 — Approvals inbox

**Goal:** Choose the cross-session pending-prompt source from the code, then build the app-wide approvals inbox on it.

|               |                                                                 |
| ------------- | --------------------------------------------------------------- |
| Dispatch when | CF07 merged                                                     |
| Branch        | `deck/cf10-approvals-inbox` from `main`                         |
| PR            | `Theodagan/orcapad` `main`, title `deck(CF10): Approvals inbox` |
| Tasks         | T63, T64 (in this order)                                        |

Read [`README.md`](./README.md) first: it holds the rules every cloud worker follows.

## Feature done when

- Every task below meets its _Done when_ (cloud bar), with an entry in `mobile/src/deck/HANDOFF-LOG.md`.
- `pnpm typecheck`, `pnpm test`, `pnpm lint` in `mobile/` add no failures to the recorded baseline; `deck-boundary.test.ts` passes once it exists.
- The PR description lists: tasks done, tasks skipped and why, files touched outside `mobile/src/deck/` and `mobile/app/deck/` (also in `UPSTREAM-TOUCHES.md`), and what the owner should try on the device.

## Tasks

### T63 — Choose the app-wide pending prompts source

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/approvals/inbox-source.md` (create)
- **Change:** From the code (subscriptions in `transport/`, native-chat prompt hooks, mock server): can existing subscriptions list pending prompts across sessions, or is a per-session subscription needed? Pick the cheapest correct source and record it as D5.
- **Depends on:** T60
- **Done when:** the note names the source, its cost and why; T64 builds on it.

### T64 — Approvals inbox

- **Scope:** cloud: code and tests.
- **Device part:** the owner tests it locally after delivery; it does not block you. Your bar: the tests in _Done when_; where it names only a device check, a hook or render test proving the same behaviour on fixture data; plus the flow exercised against `pnpm mock-server` when it serves the data.
- **Files:** `mobile/app/deck/(dest)/approvals.tsx` (edit), `mobile/src/deck/approvals/use-deck-approvals.ts` (create, + test)
- **Change:** SAFE-5 from T63's source; decisions reuse T61; documentation fields Orca lacks shown as H.
- **Depends on:** T63, T61
- **Done when:** on device, prompts from two sessions appear and can be decided from the inbox.
