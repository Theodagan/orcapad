# CF06 — Destinations on live data

**Goal:** Sessions, Projects, workspace, create workspace, Overview and Ports on real host data (developed against the mock server).

| | |
| --- | --- |
| Dispatch when | CF05 merged |
| Branch | `deck/cf06-destinations-live` from `main` |
| PR | `Theodagan/orcapad` `main`, title `deck(CF06): Destinations on live data` |
| Tasks | T49, T50, T51, T52, T53, T54 (in this order) |
| Owner checks after merge | L-V06 |

Read [`README.md`](./README.md) first: it holds the rules every cloud worker follows.

## Feature done when

- Every task below meets its *Done when* (cloud bar), with an entry in `mobile/src/deck/HANDOFF-LOG.md`.
- `pnpm typecheck`, `pnpm test`, `pnpm lint` in `mobile/` add no failures to the recorded baseline; `deck-boundary.test.ts` passes once it exists.
- The PR description lists: tasks done, tasks skipped and why, files touched outside `mobile/src/deck/` and `mobile/app/deck/` (also in `UPSTREAM-TOUCHES.md`), and the owner checks to run.

## Tasks

### T49 — Sessions destination on live data
- **Scope:** cloud: code and tests.
- **Owner check (not yours):** the device part of *Done when* is verified locally by the owner (L-V06). Your bar: the tests in *Done when*; where it names only a device check, a hook or render test proving the same behaviour on fixture data; plus the flow exercised against `pnpm mock-server` when it serves the data.
- **Files:** `mobile/app/deck/(dest)/sessions.tsx` (edit), `mobile/src/deck/sessions/use-deck-sessions.ts` (create, + test)
- **Change:** Sessions across hosts from `worktree/worktree-list-snapshot.ts`, `transport/use-all-host-clients.ts`, session tabs stream.
- **Depends on:** T48
- **Done when:** on device, sessions of a paired desktop appear with correct status buckets.

### T50 — Projects destination
- **Scope:** cloud: code and tests.
- **Owner check (not yours):** the device part of *Done when* is verified locally by the owner (L-V06). Your bar: the tests in *Done when*; where it names only a device check, a hook or render test proving the same behaviour on fixture data; plus the flow exercised against `pnpm mock-server` when it serves the data.
- **Files:** `mobile/app/deck/(dest)/projects.tsx` (edit), `mobile/src/deck/projects/use-deck-projects.ts` (create, + test)
- **Change:** Rows from `WorktreeListRow`, `WorktreeMetaGlyphs`, `MobileRepoIcon`. PRJ-*, SPACE-2: projects and worktrees from `worktree/use-workspace-sections.ts`, `server-repos.ts`.
- **Depends on:** T45, T39
- **Done when:** on device, projects list matches desktop; folder workspaces appear too.

### T51 — Workspace screen and item tabs
- **Scope:** cloud: code and tests.
- **Owner check (not yours):** the device part of *Done when* is verified locally by the owner (L-V06). Your bar: the tests in *Done when*; where it names only a device check, a hook or render test proving the same behaviour on fixture data; plus the flow exercised against `pnpm mock-server` when it serves the data.
- **Files:** `mobile/app/deck/w/[hostId]/[worktreeId].tsx` (create), `mobile/src/deck/workspace/DeckWorkspace.tsx` (create, + test)
- **Change:** SPACE-4, NAV-13: items = agents · browser tabs · files, each keeping its landing spot.
- **Depends on:** T44, T50
- **Done when:** entering a workspace from Projects shows its items; returning restores the last item.

### T52 — Create workspace
- **Scope:** cloud: code and tests.
- **Owner check (not yours):** the device part of *Done when* is verified locally by the owner (L-V06). Your bar: the tests in *Done when*; where it names only a device check, a hook or render test proving the same behaviour on fixture data; plus the flow exercised against `pnpm mock-server` when it serves the data.
- **Files:** `mobile/src/deck/projects/DeckCreateWorkspace.tsx` (create, + test)
- **Change:** Reuse `NewWorktreeFormSheet` and the `use-new-workspace-*` hooks (router-free), wrapped for pad focus; deck layout and split keys later (T67).
- **Depends on:** T50
- **Done when:** on device, a new worktree is created and entered.

### T53 — Overview screen
- **Scope:** cloud: code and tests.
- **Owner check (not yours):** the device part of *Done when* is verified locally by the owner (L-V06). Your bar: the tests in *Done when*; where it names only a device check, a hook or render test proving the same behaviour on fixture data; plus the flow exercised against `pnpm mock-server` when it serves the data.
- **Files:** `mobile/app/deck/(dest)/overview.tsx` (edit), `mobile/src/deck/overview/*.tsx` (create, + tests)
- **Change:** IH-9, OVR-1: agents by status, latest tool calls, Needs you, network and battery; host CPU/RAM/bandwidth shown unavailable (H). Account usage via `AccountUsage`; agents via `WorktreeAgentList`.
- **Depends on:** T46, T11
- **Done when:** on device Overview reflects live agents; H tiles show reasons.

### T54 — Ports destination (list only)
- **Scope:** cloud: code and tests.
- **Owner check (not yours):** the device part of *Done when* is verified locally by the owner (L-V06). Your bar: the tests in *Done when*; where it names only a device check, a hook or render test proving the same behaviour on fixture data; plus the flow exercised against `pnpm mock-server` when it serves the data.
- **Files:** `mobile/app/deck/(dest)/ports.tsx` (edit), `mobile/src/deck/ports/use-deck-ports.ts` (create, + test)
- **Change:** PRJ-4 from the workspace-ports RPC; opening is T86.
- **Depends on:** T39, T11
- **Done when:** ports of a running dev server appear on device.
