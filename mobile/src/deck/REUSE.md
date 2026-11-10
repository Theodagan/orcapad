# What the deck reuses

DECK-R50: the deck composes Orca's components and only writes a new one for a structure Orca has no
equivalent for. Every path below exists in this checkout (`rg --files` checked at T104); the verdict
says how the deck mounts it.

`ZoneItem` is the wrapper that makes any of these reachable by pad without restyling it: the child
draws the focus ring, so a touch user's screen is unchanged (`focus/focusable-orca.tsx`).

| Deck element                      | Orca piece                                                                                                             | Verdict                                                             |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Agent rows, status dots, marks    | `src/components/WorktreeAgentRow.tsx`, `AgentStateDot.tsx`, `StatusDot.tsx`, `MobileAgentIcon.tsx`, `AgentSpinner.tsx` | reuse as-is, wrapped in `ZoneItem`                                  |
| Workspace / project rows          | `src/components/WorktreeListRow.tsx`, `WorktreeMetaGlyphs.tsx`, `MobileRepoIcon.tsx`                                   | reuse as-is, wrapped in `ZoneItem`                                  |
| Chat UI / TUI switch, layout tabs | `src/components/MobileSegmentedControl.tsx`                                                                            | reuse as-is                                                         |
| Empty / loading / error states    | `src/components/MobileStateView.tsx`, `HostOfflineBanner.tsx`, `AuthFailedBanner.tsx`                                  | reuse as-is                                                         |
| Toasts and Undo (SAFE-6)          | `src/components/TransientToast.tsx`                                                                                    | reuse as-is                                                         |
| Confirmation frame (SAFE-1)       | `src/components/ConfirmModal.tsx`, `ActionSheetModal.tsx`                                                              | reuse the frame; content is the deck's                              |
| Message bodies, code, mermaid     | `src/components/MobileMarkdown.tsx`                                                                                    | reuse as-is                                                         |
| Diff view in a file item          | `src/components/MobileDiffReviewScreenView.tsx`, `MobileDiffReviewBody.tsx`                                            | reuse as-is                                                         |
| File view                         | `src/files/MobileFilePreviewBody.tsx`                                                                                  | reuse as-is                                                         |
| File tree                         | `src/files/MobileFileExplorerPanel.tsx`                                                                                | reuse; its one router reference is lifted into the deck's file item |
| Source control panel              | `src/source-control/MobileSourceControlContent.tsx`, `MobileSourceControlFileRows.tsx`                                 | reuse as-is                                                         |
| Browser tab item                  | `src/browser/MobileBrowserPaneView.tsx`                                                                                | reuse as-is                                                         |
| Create workspace                  | `src/components/NewWorktreeFormSheet.tsx` + `src/new-workspace/use-new-workspace-*`                                    | reuse as-is                                                         |
| Settings rows and screens         | `src/components/MobileSwitch.tsx`, `src/settings/`                                                                     | reuse as-is                                                         |
| Account usage                     | `src/components/AccountUsage.tsx`                                                                                      | reuse as-is                                                         |
| App update rows                   | `src/home/AppUpdateCard.tsx`                                                                                           | reuse presentation, fed by the deck store                           |
| Split-key slot geometry           | `src/layout/side-rail-strip.ts`                                                                                        | reuse the geometry, not the component                               |
| Motion                            | `src/theme/mobile-theme.ts` roles via `deck/theme/deck-theme.ts`                                                       | reuse the tokens                                                    |

## Written by the deck, and why

| Deck component                  | Why Orca has no equivalent                                                                                                   |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `wheels/DeckWheel.tsx`          | Orca's wheel is a preset overlay driven by React state; the deck's is a Reanimated ring under a fixed selector (DECK-R18)    |
| `panels/PanelColumns.tsx`       | Orca's wide layout is a sidebar plus detail; the deck's panels are columns that split the width and never overlay (DECK-R3)  |
| `keys/SplitKeys.tsx`            | Orca has no pad keyboard: halves in the side-panel slots with two cursors (KEY-2…4, IH-14)                                   |
| `hints/DeckHintStrip.tsx`       | Orca's `ActionHintBar` is a fixed strip; the deck's swaps to the Y layer and drops hints that would overflow (PAD-13, VIS-6) |
| `collections/CarouselShell.tsx` | Orca's lists scroll; the deck's items move under L1/R1 with layout tabs (SD-6, SD-11)                                        |
| `approvals/DecisionConfirm.tsx` | Orca confirms an action; the deck binds a confirmation to one request id (SAFE-1, DECK-R25)                                  |
