# CF05 — Navigation shell

**Goal:** Destinations, context resolver, history, panel columns, header, grouping and the collections shell with its four layouts.

|                          |                                                                       |
| ------------------------ | --------------------------------------------------------------------- |
| Dispatch when            | CF04 merged                                                           |
| Branch                   | `deck/cf05-navigation-shell` from `main`                              |
| PR                       | `Theodagan/orcapad` `main`, title `deck(CF05): Navigation shell`      |
| Tasks                    | T38, T39, T40, T41, T42, T43, T44, T45, T46, T47, T48 (in this order) |
| Owner checks after merge | none                                                                  |

Read [`README.md`](./README.md) first: it holds the rules every cloud worker follows.

## Feature done when

- Every task below meets its _Done when_ (cloud bar), with an entry in `mobile/src/deck/HANDOFF-LOG.md`.
- `pnpm typecheck`, `pnpm test`, `pnpm lint` in `mobile/` add no failures to the recorded baseline; `deck-boundary.test.ts` passes once it exists.
- The PR description lists: tasks done, tasks skipped and why, files touched outside `mobile/src/deck/` and `mobile/app/deck/` (also in `UPSTREAM-TOUCHES.md`), and the owner checks to run.

## Requirements cited

From the PRD (not in the repo). Rule IDs such as `PAD-6` are in `Theodagan/Pocketdeck` `docs/ux/ux-rules.md`.

- **DECK-R3** Panels are columns that split the width, never overlays. Left: Quick menu, All open
  (PANEL-1). Right: per screen, from one registry that also returns the disabled reason (PNL-2).
- **DECK-R4** One context resolver answers which project / workspace / session / request is current
  (UXA-R23). Session actions appear only on session screens.
- **DECK-R38** No fixture, example or placeholder data in production builds. Empty states say what
  is empty and how to fill it.

## Tasks

### T38 — Destinations registry

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/navigation/destinations.ts` (create, + test)
- **Change:** UXA-R18: Overview (landing), Sessions, Projects, Approvals, Ports, Settings; one registry feeds nav, left wheel and previews.
- **Depends on:** T6
- **Done when:** test asserts order, landing, and unique ids.

### T39 — Deck routes per destination

- **Scope:** cloud: code and tests.
- **Files:** `mobile/app/deck/(dest)/overview.tsx`, `sessions.tsx`, `projects.tsx`, `approvals.tsx`, `ports.tsx`, `settings.tsx` (create, placeholders)
- **Change:** One route per destination, each rendering an empty state with `MobileStateView` that says what is empty (DECK-R38).
- **Depends on:** T38
- **Done when:** each route renders on device; render tests for empty states.

### T40 — Context resolver

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/context/deck-context.ts` (create, + test)
- **Change:** UXA-R23: current host / project / workspace / session / request from the route + stores; session actions only on session screens (DECK-R4).
- **Depends on:** T39
- **Done when:** table test over route shapes returns the right context and session-action visibility.

### T41 — Navigation history and Y + B

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/navigation/deck-history.ts` (create, + test)
- **Change:** History stack for Y+B (PAD-11); B never pops it.
- **Depends on:** T27, T39
- **Done when:** test: Overview → Projects → workspace, Y+B twice returns to Overview.

### T42 — Panel columns system

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/panels/PanelColumns.tsx` (create), `mobile/src/deck/panels/panel-registry.ts` (create), tests
- **Change:** DECK-R3/PANEL-1/PNL-2: left and right columns split width, never overlay; right panels per screen from a registry that returns disabled reasons.
- **Depends on:** T28, T10
- **Done when:** render test at landscape and portrait widths: content width shrinks, no overlap; disabled panel shows reason.

### T43 — Left panels: Quick menu and All open

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/panels/left/QuickMenu.tsx`, `AllOpen.tsx` (create, + tests)
- **Change:** PANEL-1 content from destinations and open items.
- **Depends on:** T42
- **Done when:** render tests; pad selection opens the target.

### T44 — Breadcrumb header

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/chrome/DeckHeader.tsx` (create, + test)
- **Change:** Chat UI / TUI switch with `MobileSegmentedControl`. NAV-13, IH-4, SD-5: one header row with breadcrumb, item tabs when several, Chat UI / TUI switch.
- **Depends on:** T40
- **Done when:** render tests for host, project, workspace and session contexts.

### T45 — Shared grouping

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/collections/grouping.ts` (create, + test)
- **Change:** SES-6, GROUP-1: one grouping used by every list.
- **Depends on:** T38
- **Done when:** test: same input → same groups for list and panel consumers.

### T46 — Collection model

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/collections/collection-model.ts` (create, + test)
- **Change:** COL-*: items, selection, layout kind; status buckets from agent status data (`components/WorktreeAgentSummary.tsx` source hooks, `session/mobile-terminal-tab-agent.ts`) parsed via T12.
- **Depends on:** T12, T45
- **Done when:** test maps fixture host data (test-only) to buckets including an unknown status → neutral.

### T47 — Carousel shell

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/collections/CarouselShell.tsx` (create, + test)
- **Change:** SD-6, SD-11: one shell, layout tabs, L1/R1 item moves, swipe parity (COL-6).
- **Depends on:** T46, T28
- **Done when:** render test: L1/R1 and swipe move selection identically.

### T48 — Sessions layouts: Cards, Kanban, List, Grid

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/collections/layouts/CardsLayout.tsx`, `KanbanLayout.tsx`, `ListLayout.tsx`, `GridLayout.tsx` (create, + tests)
- **Change:** SES-0, IH-10 per maquette `collections.js`; items built from `WorktreeAgentRow`, `AgentStateDot`, `StatusDot`, `MobileAgentIcon`, `AgentSpinner`; layout tabs with `MobileSegmentedControl`.
- **Depends on:** T47
- **Done when:** render test per layout; maquette side-by-side noted in `COVERAGE.md`.
