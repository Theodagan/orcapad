# OpenCode chat on mobile — synthesis: agent selection + TUI menus as chatview components

Synthesis, 2026-10-18. Branch: `feat/opencode-chat-mode-selection-forms`.
Supersedes nothing; consolidates the three 2026-10-17 reports with the corrected scope:

- [`opencode-chat-enhancements-overview.md`](./opencode-chat-enhancements-overview.md) — branch/merge state, strategy
- [`opencode-chat-agent-mode-selection.md`](./opencode-chat-agent-mode-selection.md) — desktop-oriented agent/mode findings
- [`opencode-chat-tui-forms-rendering.md`](./opencode-chat-tui-forms-rendering.md) — TUI forms/settings findings

**Scope correction (user-directed): chatview = the Orca mobile chatview** (`mobile/src/session/`), not desktop renderer chat. Everything below is scoped to mobile unless marked "desktop".

## 1. What `/agents` actually opens (opencode side, web evidence)

Orca does not vendor opencode, so these are `sst/opencode` source facts (dev/v2, Oct 2026), corroborated by the absence of any match in Orca (grep for `Select agent` / `agent_list` / `agent.cycle` → no matches; the only `/agents` hits are Antigravity fixtures, a different CLI):

- `/agents` registers command `agent.list` ("Switch agent"); its `run` is `dialog.replace(() => <DialogAgent />)` (`packages/tui/src/app.tsx`; v1: `packages/opencode/src/cli/cmd/tui/app.tsx`, same slash alias + `agent_list` keybind; docs: Ctrl+X then A, or `/agents`, Shift+Tab cycles — https://opencode.ai/v2/docs/cli/tui/).
- The modal is `DialogAgent` over shared `DialogSelect` (`packages/tui/src/component/dialog-agent.tsx`): list from `local.agent.list()`, current from `local.agent.current()?.id`, select via `local.agent.set(id)` + `dialog.clear()`.
- List source is the cached location snapshot filtered to selectable agents — `(list ?? []).filter(a => a.mode !== "subagent" && !a.hidden)` (`packages/tui/src/context/local.tsx`); server side that list is `GET /agent`.
- The dialog stack is **TUI-local Solid state** (`packages/tui/src/ui/dialog.tsx`: `createStore({ stack: [] })`, `replace()` mutates the store + pushes keymap `modal` mode). The TUI bus carries only externally-driven `tui.*` types — dialog open/close publishes nothing observable.
- Pick is local; commit happens later via the prompt / `switchAgent` path, publishing `session.agent.selected` (v2 also `session.next.agent.switched`) with an `agent-switched` timeline message. Pick-vs-commit timing has conflicting secondary sources; code reads as local-pick + commit-on-submit (unresolved — see §5 Q1).
- Plugin API (`@opencode-ai/plugin/tui`) exposes `ui.dialog` state (`open`/`depth`, reactive read only), `keymap.dispatchCommand`, `client.tui.executeCommand` (`POST /tui/execute-command` → server emits `tui.command.execute` → TUI runs it). There is **no** `/tui/open-agents` route, no "dialog opened" event, no `dialog.agent` slot. A plugin can *trigger* `agent.list` but cannot *observe or re-render* the modal.

**Consequence: "parsing the open modal" is not a viable integration.** There is no modal event to parse. The native equivalent must be fed by the same data (`GET /agent`, ACP `modes`) and commit through the same path (`switchAgent` / prompt submit / ACP `session/set_mode`), without ever opening the TUI modal.

## 2. Mobile chatview today (verified by direct read on this branch)

- Single pending-prompt slot above the composer: structured Ask wins, then heuristic permission, then heuristic question (`mobile/src/session/MobileNativeChatPromptCard.tsx:10-13`, switch at `:45`). The controller owns dismissal so it survives unmounts.
- Lane selection is explicit: structured card actions win when present, else terminal presentation (`mobile/src/session/use-mobile-native-chat-prompt-cards.ts:42-53`).
- Composer pickers are exactly two pills — permission-mode + model/session-option — sharing one bottom drawer; the component returns null when neither descriptor exists (`mobile/src/session/MobileNativeChatSessionOptionPickers.tsx:67-75`).
- Seams for a custom agents component:
  - prompt slot: `MobileNativeChatPromptCard.tsx` (modal-equivalent placement without leaving chat);
  - rows: `use-mobile-native-chat-row-renderer.tsx` (sole transcript-row constructor);
  - sheets: `MobileNativeChatRowOverlaysHost.tsx:15,36-43` (today only image viewer + message actions; mounted in `MobileNativeChatOverlay.tsx:102`);
  - answered state: `MobileNativeChatResolutionReceipt`.
- **No in-chat agent selector exists on mobile.** The only agent-picker-shaped UI is `QuickCommandAgentPicker` in the Quick Commands sheet (launch surface, not chat) and the `agent-picker` session-option action that bounces to the terminal TUI.
- Option-system gaps (from the 10-17 reports, still current on this branch): opencode's catalog is launch-only (`--model`, `models: []`, `src/shared/agent-session-option-catalog-opencode.ts:6-13`); ACP accepts only `model`/`effort` (`src/main/acp/acp-structured-agent-definitions.ts:13-18`); `setMode` exists on the runtime (`acp-session-runtime.ts:204-207`) with zero callers; `adoptSession` drops `modes` (`acp-structured-options.ts:69-79`); permission modes for opencode are `ask`/`full-access` (`src/shared/agent-chat-permission-mode.ts:40-54`).

## 3. What already bridges (TUI lane) vs what is missing

Already native: `form.created` → `question.asked` with `questions[{header, question, options[{label, description}], multiple}]` and `form.replied/cancelled` → receipts (`src/main/opencode2/status-plugin-setup-source.ts:40-63`); `PermissionRequest` → approval card answered by PTY keystrokes (`\r` accept for opencode). ACP lane: approvals only; question tool disabled (`OPENCODE_ENABLE_QUESTION_TOOL: 'false'`, `acp-launch-specs.ts:169-171`) — no ACP answer channel.

Missing for an agents-in-chatview feature: (a) a native agents list component (no modal to reuse); (b) a data feed (`GET /agent` or ACP `modes` — both exist upstream, neither is consumed by mobile today); (c) a commit path from mobile (`switchAgent` equivalent on the TUI lane, `session/set_mode` on ACP); (d) the subagent/hidden filter replicated natively.

## 4. Direction (ideas, not decisions)

- **D1 (recommended): native "Select agent" sheet in the mobile prompt-card/overlay slot**, fed by the agent list, committing via the session path — parity with `/agents` without driving the TUI modal. TUI lane and ACP lane share the sheet; only the commit call differs.
- **D2 (rejected for this goal): triggering the TUI modal remotely** (`dispatchCommand("agent.list")` / `/tui/execute-command`). Keeps the person in the terminal; does not produce a chatview component.
- **D3 (out of scope): replicating theme/keystroke modals.** Only agent/model/settings-shaped surfaces have server data behind them.

## 5. Open questions (verify before implementation)

1. Q1: pick-vs-commit timing of `local.agent.set` vs `session.agent.selected` on the pinned opencode release lines — read `Session.switchAgent` emitter + V2 prompt-submit payload.
2. Q2: does `session/new` carry `modes` on both supported release lines, and do custom markdown agents appear in `availableModes`?
3. Q3: is there a `sessionUpdate` on mode change (TUI-side switch reflected natively), or response-only state?
4. Q4: can the TUI plugin read its server URL/port (2.x `ctx`) to feed a future settings sheet; does opencode hot-reload `opencode.json` edits?
5. Q5: mobile `agentSession.setOption` allowlist + bottom-drawer UX review for a third pill/sheet (gamepad `editSuspended` interplay — a prompt-owned sheet must hold the D-pad like permission/question cards do).

## 6. Handoff

- This document is the synthesis; the three 10-17 reports remain the detailed evidence base.
- Suggested next step for Plan: ticket manifest for D1 scoped to mobile (data feed → sheet → per-lane commit → receipts), with Q1–Q3 as acceptance probes and Q4 deferred to the settings-sheet follow-up.
- Upstream-safe: no fork gamepad code involved; CONTRIBUTING still requires a linked issue + screenshots when this moves to a cross-fork PR.
