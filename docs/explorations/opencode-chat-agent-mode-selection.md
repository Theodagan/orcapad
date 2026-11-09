# OpenCode chat — agent/mode selection: requirements + feasibility

Exploration, 2026-10-17. Companion to [`opencode-chat-enhancements-overview.md`](./opencode-chat-enhancements-overview.md). All claims verified against code on `feat/opencode-chat-mode-selection-forms` unless marked "verify".

## Problem

The desktop opencode chat view offers a model picker but no way to pick the **agent** (opencode's build/plan/general + custom subagents). Claude Code and Codex chats already have mode selection (permission modes) on the structured lane — the equivalent surface is missing for opencode.

## Current state (verified)

- **opencode structured lane (ACP)**: `OPENCODE_LAUNCH_SPEC` (`src/main/acp/acp-launch-specs.ts:170-217`) spawns `opencode acp` for 1.18.31+/2.0.14+. Model picker works from `opencode models --verbose` listing; permission picker (`ask`/`full-access`) comes from `agent-chat-permission-mode.ts:50-54`.
- **The protocol already supports modes**: generated `SessionModeStateSchema` (`currentModeId` + `availableModes`, `src/main/acp/generated/acp-protocol.generated.ts:642-647`), `modes` on session/new/prompt responses (`:715,731,747`), `setMode` implemented on the runtime (`acp-session-runtime.ts:204-207`).
- **But it is dropped**: `AcpStructuredOptions.adoptSession` reads only `configOptions`/`models` (`acp-structured-options.ts:69-79`); `AcpStructuredOptions.write` handles only `model`/`effort` (`:253,299`); accepted keys hard-coded to `{model, effort}` (`acp-structured-agent-definitions.ts:13-18`). `setMode` has zero callers.
- **PTY/TUI lane**: `agent-session-option-catalog-opencode.ts` is launch-only (`--model`, 14 lines) and deliberately excluded from `CATALOGS` (`agent-session-option-catalog.ts:35-45`) — no terminal-chat picker for opencode. opencode's own TUI owns agent switching there.
- **No "agent/mode" concept exists in the option system**: `CatalogOption.kind` is only `select|boolean`, categories are `model|thought_level|model_config|mode` — a fastMode boolean uses category `mode`, but no agent-mode select option exists in any catalog.
- **Mobile** already renders structured session-option pickers (`mobile/src/session/MobileNativeChatSessionOptionPickers.tsx`) — parity rides the same `agentSession.options`/`setOption` RPC.

## Refined requirements

1. **R1 — opencode agent picker (structured lane)**: an agent/mode selector in the chat composer, showing opencode's available agents from the ACP `session/new`/`session/prompt` `modes` state, with the current one marked.
2. **R2 — mid-session switching**: selecting an agent issues ACP `session/set_mode` on the live session.
3. **R3 — launch-time selection**: a new chat/worktree can start with a chosen agent via `--agent <id>` on the launch command (opencode supports the flag — see `opencode-model-startup-plan.test.ts:138`).
4. **R4 — Claude/Codex parity check**: structured Claude/Codex already have permission-mode pickers (`NativeChatPermissionModePicker.tsx:118-156`); no new work needed beyond making sure the picker reads the snapshot that now also carries modes. PTY-lane Claude/Codex mode selection stays terminal-owned (unchanged).
5. **R5 — follow status changes**: mode switches made inside opencode's own TUI (TUI lane) or by the agent must reflect back — verify opencode sends a mode `sessionUpdate`; if not, seed state from responses only.

Out of scope: switching the CLI (claude→codex) mid-chat; that stays a worktree-level choice (QuickLaunch menu).

## Feasibility: HIGH on the structured lane

All protocol pieces exist in-tree; the work is plumbing + UI:

1. Capture `modes` in `adoptSession` (add `modes?: SessionModeState | null`).
2. Add a structured descriptor for the agent/mode option (new `SessionOptionDescriptor` or a permission-picker-style sibling keyed off `modes` state) — rendered from `NativeChatComposerActions.tsx` next to `NativeChatComposerPermissionPicker` (`:130-134`).
3. Accept `'mode'` in `ACP_OPTION_KEYS` and route writes to `connection.setMode(...)` in `AcpStructuredOptions.write`.
4. Launch flags: add an `agent`-carrying `CatalogOption` to `OPENCODE_LAUNCH_OPTION_CATALOG` (`launchArgs: ['--agent', id]`), mirroring the `--model` handling and the same guardrails (`agent-launch-model-preferences.ts:24-92` refuses model prefs on worktree creation — extend policy consistently).
5. Tests: fixture-based (acp/fixtures has recorded session/new payloads — check one contains `modes`), plus mobile allowlist coverage (`runtime-rpc-mobile-agent-session-methods.ts`).

## Open questions (verify before implementation)

- Does opencode's `session/new` actually include `modes` for both supported release lines? (Probe or fixture check; deepwiki says modes come from a directory snapshot of agents.)
- Do custom markdown agents appear in `availableModes`? (Determines whether the picker lists only build/plan/general.)
- Is there a `sessionUpdate` on mode change (TUI-side switch reflected natively), or response-only?
- Mobile `agentSession.setOption` allowlist includes the new key without a separate mobile review.
- Style-guide/design: where the pill sits (left cluster beside permission picker vs right cluster) — the style guide's "Chat type scale"/focus rules apply if `components/native-chat/`.

## Upstream notes

- Pure ACP usage — no fork-specific code involved; safe for the upstream PR.
- CONTRIBUTING requires a linked issue; propose this as "surface ACP session modes (agents) in the chat composer" with the opencode agent list as the concrete use case.
