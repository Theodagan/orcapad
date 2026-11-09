# CF12 — Review: files, source control, browser, message actions

**Goal:** File items with diff and notes, browser items, notes in the next prompt, source control by chord, Quote/Fork, forks panel, session log.

|               |                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| Dispatch when | CF07 merged                                                                                             |
| Branch        | `deck/cf12-review` from `main`                                                                          |
| PR            | `Theodagan/orcapad` `main`, title `deck(CF12): Review: files, source control, browser, message actions` |
| Tasks         | T85, T86, T87, T88, T89, T90, T91 (in this order)                                                       |

Read [`README.md`](./README.md) first: it holds the rules every cloud worker follows.

## Feature done when

- Every task below meets its _Done when_ (cloud bar), with an entry in `mobile/src/deck/HANDOFF-LOG.md`.
- `pnpm typecheck`, `pnpm test`, `pnpm lint` in `mobile/` add no failures to the recorded baseline; `deck-boundary.test.ts` passes once it exists.
- The PR description lists: tasks done, tasks skipped and why, files touched outside `mobile/src/deck/` and `mobile/app/deck/` (also in `UPSTREAM-TOUCHES.md`), and what the owner should try on the device.

## Requirements cited

From the PRD (not in the repo). Rule IDs such as `PAD-6` are in `Theodagan/Pocketdeck` `docs/ux/ux-rules.md`.

- **DECK-R27** One composer under the conversation, with mode · model indicator opening the Agent
  panel (SES-9, SES-7). Notes attached from files appear as chips and travel with the next prompt
  (FILE-4).
- **DECK-R30** Source control panel per FILE-5 with Y + L2/R2 stage / unstage.

## Tasks

### T85 — File items with Diff / File views and line notes

- **Scope:** cloud: code and tests.
- **Device part:** the owner tests it locally after delivery; it does not block you. Your bar: the tests in _Done when_; where it names only a device check, a hook or render test proving the same behaviour on fixture data; plus the flow exercised against `pnpm mock-server` when it serves the data.
- **Files:** `mobile/src/deck/review/DeckFileItem.tsx` (create, + test)
- **Change:** Embed `MobileDiffReviewScreenView` / `MobileDiffReviewBody` and `files/MobileFilePreviewBody`. FILE-1…3 on `session/mobile-diff-*` and `files/mobile-file-preview-*`; notes = diff comments.
- **Depends on:** T51
- **Done when:** on device, open a changed file, switch Diff/File, add a note.

### T86 — Ports and browser tab items

- **Scope:** cloud: code and tests.
- **Device part:** the owner tests it locally after delivery; it does not block you. Your bar: the tests in _Done when_; where it names only a device check, a hook or render test proving the same behaviour on fixture data; plus the flow exercised against `pnpm mock-server` when it serves the data.
- **Files:** `mobile/src/deck/review/DeckBrowserItem.tsx` (create, + test)
- **Change:** WEB-1/2: a port opens as a browser item in its workspace on `browser/MobileBrowserPaneView.tsx`; full screen.
- **Depends on:** T54, T51
- **Done when:** on device, a dev server port opens as an item.

### T87 — Notes travel with the next prompt

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/session/DeckComposer.tsx` (edit), `mobile/src/deck/review/note-chips.tsx` (create, + test)
- **Change:** FILE-4, DECK-R27: note chips in the composer, sent with the next prompt, cleared after.
- **Depends on:** T85, T58
- **Done when:** test: chips included in the sent payload once.

### T88 — Source control panel with Y + L2/R2 stage / unstage

- **Scope:** cloud: code and tests.
- **Device part:** the owner tests it locally after delivery; it does not block you. Your bar: the tests in _Done when_; where it names only a device check, a hook or render test proving the same behaviour on fixture data; plus the flow exercised against `pnpm mock-server` when it serves the data.
- **Files:** `mobile/src/deck/review/DeckSourceControl.tsx` (create, + test)
- **Change:** Embed `source-control/MobileSourceControlContent` / `MobileSourceControlFileRows`. FILE-5, DECK-R30 on `source-control/mobile-git-*-operations.ts`; commit box per Orca support.
- **Depends on:** T42, T29
- **Done when:** on device, stage and unstage by chord; commit works.

### T89 — Message actions: Quote and Fork; Revert disabled

- **Scope:** cloud: code and tests.
- **Device part:** the owner tests it locally after delivery; it does not block you. Your bar: the tests in _Done when_; where it names only a device check, a hook or render test proving the same behaviour on fixture data; plus the flow exercised against `pnpm mock-server` when it serves the data.
- **Files:** `mobile/src/deck/session/MessageActions.tsx` (create, + test)
- **Change:** MSG-1/3 on `session/mobile-native-chat-cli-fork.ts` and fork feedback; MSG-2 disabled with reason.
- **Depends on:** T56, T11
- **Done when:** on device, fork creates a session; Revert shows its reason.

### T90 — Forks panel

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/session/ForksPanel.tsx` (create, + test)
- **Change:** SES-4: forks Orca knows; compare only when data exists.
- **Depends on:** T89, T42
- **Done when:** render test with and without compare data.

### T91 — Session log panel

- **Scope:** cloud: code and tests.
- **Device part:** the owner tests it locally after delivery; it does not block you. Your bar: the tests in _Done when_; where it names only a device check, a hook or render test proving the same behaviour on fixture data; plus the flow exercised against `pnpm mock-server` when it serves the data.
- **Files:** `mobile/src/deck/session/SessionLogPanel.tsx` (create, + test)
- **Change:** SES-3 from chat events / `agent-history/`; labels missing parts.
- **Depends on:** T56, T42
- **Done when:** on device, the log lists turns and tool runs.
