# CF08 — Update install flow and UI

**Goal:** Update state machine, unknown-sources guidance and the deck update panel, on the installer proven by the owner's T18 spike.

| | |
| --- | --- |
| Dispatch when | CF03 merged, CF02 merged, owner step L03 done |
| Branch | `deck/cf08-updates-install` from `main` |
| PR | `Theodagan/orcapad` `main`, title `deck(CF08): Update install flow and UI` |
| Tasks | T20, T21, T23 (in this order) |
| Owner checks after merge | none |

Read [`README.md`](./README.md) first: it holds the rules every cloud worker follows.

## Feature done when

- Every task below meets its *Done when* (cloud bar), with an entry in `mobile/src/deck/HANDOFF-LOG.md`.
- `pnpm typecheck`, `pnpm test`, `pnpm lint` in `mobile/` add no failures to the recorded baseline; `deck-boundary.test.ts` passes once it exists.
- The PR description lists: tasks done, tasks skipped and why, files touched outside `mobile/src/deck/` and `mobile/app/deck/` (also in `UPSTREAM-TOUCHES.md`), and the owner checks to run.

## Requirements cited

From the PRD (not in the repo). Rule IDs such as `PAD-6` are in `Theodagan/Pocketdeck` `docs/ux/ux-rules.md`.

- **DECK-R47** The update check reads only the fork's releases. Settings shows the installed and
  latest versions and an **Update** button; a new version is also announced (non-blocking) on
  launch.
- **DECK-R49** Every update control is reachable by pad and by touch (NAV-1, NAV-9), and failures
  (no network, rate limit, bad download, install refused) are shown as they are (DECK-R39).
- *Later, optional:* code-only updates through `expo-updates` with a self-hosted manifest (no install
  dialog). Needs runtime-version discipline so code never runs on a binary without its native
  modules. Not in this PRD's milestones.

## Tasks

### T20 — Update state store
- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/updates/deck-update-store.ts` (create, + test)
- **Change:** States `idle → checking → available → downloading(progress) → ready → installing | error(reason)`; check on launch (non-blocking) and on demand; composes T17, T19, T18.
- **Depends on:** T18, T19
- **Done when:** state-machine tests cover every transition and every error reason (DECK-R49).

### T21 — Unknown-sources guidance
- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/updates/install-permission-explainer.tsx` (create, + render test)
- **Change:** Before the first install, explain Android's "install unknown apps" permission and open that setting via `IntentLauncher` (`MANAGE_UNKNOWN_APP_SOURCES` with package URI).
- **Depends on:** T18
- **Done when:** render test shows the explainer once (persisted flag) and its button calls the intent.

### T23 — Deck update UI
- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/updates/DeckUpdatePanel.tsx` (create), `mobile/src/deck/updates/DeckUpdateNotice.tsx` (create), render tests
- **Change:** Reuse `home/AppUpdateCard` and `settings/settings-app-update-section` presentation where they fit, fed by the deck store. Panel: installed/latest versions, Check, Update, progress, errors as they are. Notice: non-blocking toast on launch when a version is available. Reachable by pad and touch (DECK-R47, R49). Placed in Settings in T92.
- **Depends on:** T20, T21, T10
- **Done when:** render tests for each store state; pad focus reaches every control.
