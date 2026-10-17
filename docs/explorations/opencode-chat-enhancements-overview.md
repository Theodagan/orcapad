# OpenCode chat enhancements — exploration overview

Status: exploration only, no product code changed yet.
Branch: `feat/opencode-chat-mode-selection-forms` (created off fork `main`, then merged `upstream/main` into it on 2026-10-17).

## Goal

Two features, explored for this fork **and** for an upstream PR against `stablyai/orca`:

1. **Agent/mode selection in the chat view** — per-CLI mode selectors in the chat composer, with opencode's agent picker (build/plan/general + custom subagents) as the main gap; Claude Code and Codex already have permission-mode pickers on the structured lane.
2. **OpenCode TUI forms and modals as native chat form components** — question-tool forms rendered as native cards (already exists on the opencode2 TUI lane), plus native opencode settings instead of TUI-only modals.

Reports:

- [`opencode-chat-agent-mode-selection.md`](./opencode-chat-agent-mode-selection.md) — requirements + feasibility for feature 1
- [`opencode-chat-tui-forms-rendering.md`](./opencode-chat-tui-forms-rendering.md) — requirements + feasibility for feature 2

## Branch and merge state

Fork `main` was 99 commits ahead (mobile gamepad "pad" work) and 556 commits behind `upstream/main` at branch time. The merge brought the branch to upstream-latest and produced **9 conflicts, all under `mobile/src/`**, resolved as: upstream's mobile-chat behavior wins, the fork's gamepad hooks are re-applied on top.

| File | Resolution |
| --- | --- |
| `use-mobile-native-chat-tail-follow.ts` | Both: fork's `scrollBy`/controller tracking + upstream's scope-reset `useLayoutEffect`; fork's `pageContentHeightRef` superseded by upstream's live `getScrollableNode()` read |
| `MobileNativeChatView.test.ts` | Upstream's deletion accepted — test was split upstream; fork's one-line `onLayout` fix already present in the split `tail-follow` test |
| `MobileNativeChatView.tsx` | Fork's `props` destructure (gamepad binding needs it) + caret props; upstream's `receipts`/`actionablePromptIds`/`stop` |
| `MobileNativeChatComposer.tsx` | Upstream's collapsed/expanded layout + external styles; fork's `DraftCaretField` caret mode, bindings, attachments component; fork's hook replaces upstream's inline `pendingSelection` state |
| `MobileNativeChatOverlay.tsx` | Upstream's `RowOverlaysHost`/`ReplyRevealsContext` wrappers + fork's three composer-caret props |
| `MobileSessionActiveContent.tsx` | Union of imports (both used) |
| `WorktreeListRow.tsx` | Fork's `useNativeFocus` + upstream's repo-chip/host-glyph logic |
| `host-screen-header.tsx` | Upstream's single Workspace-options chip inside fork's `HostHeaderControl` pad wrapper; fork's separate Sort/Group chips dropped (upstream folded them into the sheet) |
| `host-workspace-list.tsx` | Fork's list-zone skeleton (`listScroll`, `reveal`, `ZoneFrame`, focus ring) + upstream's new row props (`cardDetails`, `agentActivityDisplayMode`, `statusLive`, `onAgentPress`) |

Verification: `tsc --noEmit` in `mobile/` passes (4 pre-existing errors in `test-support/webview-document-census.ts` about a missing optional `oxc-parser` install — unrelated to the merge). Not verified on a device; a manual pad regression pass is still owed. Fork `main` itself was not touched.

## Strategy

- Implement both features on this branch; the ACP-lane work is upstream-appropriate as-is.
- Fork-only mobile/pad code stays out of the upstream PR.
- Upstream PR mechanics (from `stablyai/orca` CONTRIBUTING.md): link an issue, ELI5 opening, before/after screenshots for UI, tests, AI-review summary covering cross-platform/SSH/agent-compat, X handle in the Author section. Open the PR as a cross-fork PR (`gh pr create --repo stablyai/orca --base main --head Theodagan:<branch>`).
- Before building: file an upstream issue proposing opencode agent/mode selection over ACP and native question-forms, to catch design disagreements early.
