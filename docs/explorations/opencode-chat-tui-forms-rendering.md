# OpenCode chat — TUI forms/modals as native components: requirements + feasibility

Exploration, 2026-10-17. Companion to [`opencode-chat-enhancements-overview.md`](./opencode-chat-enhancements-overview.md). Claims verified against code on `feat/opencode-chat-mode-selection-forms` unless marked "verify".

## Problem

When opencode (running as a TUI in a terminal pane, with Orca rendering a bridged native chat beside it) needs input — the question tool's forms, permission prompts, or its settings/model modals — the person must switch to the TUI. Goal: render these as native chat form components so opencode settings "and stuff like that" are usable from the chat view.

## Current state (verified)

**How opencode integrates**: two lanes.
- **Structured (ACP)**: chat view only, no TUI. `opencode acp` spawned by `OPENCODE_LAUNCH_SPEC` with `OPENCODE_ENABLE_QUESTION_TOOL: 'false'` — the comment is explicit: "no question tool, which ACP cannot answer (it would wait forever)" (`acp-launch-specs.ts:169-171`). Only approvals surface (`NativeChatApprovalCard`).
- **Terminal TUI (+ opencode2)**: TUI in a PTY; Orca injects a hook plugin via an overlay config dir (`hook-service.ts:64-324`); plugin POSTs `SessionStart/Busy/Idle/PermissionRequest/AskUserQuestion/MessagePart` (+ opencode2 `session.next.*`, `permission.v2.*`, `question.v2.*`) to Orca's agent-hooks server over loopback HTTP. Native chat reads the transcript from opencode's SQLite (v1/v2 tables, 1s polling, `transcript-opencode-subscribe.ts:17`).

**What already works natively**:
- **Forms**: the opencode2 TUI plugin translates `form.created` → `question.asked` with `questions[]` (`header`, `question`, `options[{label, description}]`, `multiple: field.type === 'multiselect'`), and `form.replied/cancelled` → receipts (`src/main/opencode2/status-plugin-setup-source.ts:40-63`). These render as native question cards today.
- **Permissions**: `PermissionRequest`/`permission.asked` → interactive prompt card; answers are PTY keystrokes (accept = `\r` for opencode, `native-chat-agent-support.ts:57-58`; deny = ESC; ESC-ESC interrupts).

**What is not reachable**:
- No way to **open** a TUI modal (settings, model picker, theme) programmatically — no keystroke-modal API. The only TUI-write APIs the plugin has are `editor.insertText` and `ctx.keymap.dispatch("prompt.submit")` (startup prompt, `opencode-startup-prompt-source.ts:38-145`).
- ACP lane has no question path at all (flag disabled; no ACP method to reply).

**What opencode's server API offers** (deepwiki on sst/opencode, "verify" against a live `opencode serve`): `GET/PATCH /config`, `GET /config/providers`, `GET /provider`, `GET /agent`, and the question tool's `question.v2.asked` event with a `POST /session/{id}/question/{requestID}/reply` answers channel. OpenAPI spec at `/doc`.

## Refined requirements

1. **R1 — forms (TUI lane), complete coverage**: keep the existing `form.created` bridge; close gaps — custom free-text answers (`custom` flag in `question.v2`), multi-select replies, and receipts parity with upstream's "answered prompts are receipts" work (#28906).
2. **R2 — forms (ACP lane)**: only viable with an upstream change (opencode surfaces questions as an ACP request, or Orca gains an answers channel to the serve child, whose HTTP port is not exposed — stdio only). Keep the tool disabled; log the upstream discussion as the outcome of this exploration.
3. **R3 — native opencode settings sheet**: a native panel (from the chat view's overflow/composer) that reads/writes opencode config through the **server API**, not by replicating TUI modals:
   - read: `GET /config`, `GET /agent`, `GET /config/providers`
   - write: `PATCH /config` (scoped, reviewed fields only — provider/model defaults, permissions; not arbitrary schema dumps)
4. **R4 — server-access channel**: the missing link. Options, in order of promise:
   - **TUI lane**: the plugin runs inside opencode and can reach the SDK/server context — have it report the server URL/port in a `SessionStart` payload extension, then Orca calls the config API directly ("verify" the plugin API can read the server URL; opencode 1.x `opencode attach <url>` implies the TUI knows it).
   - **ACP lane**: no port exposure → fall back to editing `opencode.json` (Orca mirrors it as a symlink today and deliberately never writes it — `hook-service.ts:237-294`), pending a check that opencode hot-reloads config file changes ("verify").
5. **R5 — don't replicate TUI modals**: theme picker/keystroke modals stay TUI-owned; the native chat offers native equivalents only where a protocol surface exists.

## Feasibility summary

| Piece | Feasibility | Why |
| --- | --- | --- |
| Question forms, TUI lane | **High** (exists) | Plugin bridge + question cards already shipped; remaining work is answer-type coverage |
| Question forms, ACP lane | Low without upstream | ACP cannot answer; serve child exposes no HTTP port |
| Native settings sheet, TUI lane | Medium | Needs a verified server-URL report from the plugin; API itself is adequate |
| Native settings sheet, ACP lane | Medium | Config-file write route needs hot-reload verification |
| Replicating TUI modals verbatim | Low | No programmatic modal API; poor value |

## Risks

- Version sensitivity: plugin API `v1`/`v2` split and the 2.0.12/2.0.16 prefill gates (`opencode-cli-version.ts:18-33`) — any form coverage change must be version-gated like the existing ones.
- SSH/WSL: plugin install and overlay config flow through the relay (`opencode-tui-plugin-install.ts` mentions SSH relay installers); a settings channel must work through the same path (relay-compatible URL reporting).
- Security: the plugin reporting a server URL + Orca calling `PATCH /config` widens what a hook payload can cause; the agent-hooks endpoint is token-gated (`X-Orca-Agent-Hook-Token`) — keep config writes behind an explicit, user-initiated request, never hook-driven.
- Cross-platform: config paths differ (XDG on Linux, `%USERPROFILE%` on Windows) — use `opencode-config-directory.ts`, never hardcode.

## Open questions (verify before implementation)

1. Can the opencode TUI plugin read its server URL/port (2.x `ctx` API surface)? Probe with a minimal plugin build.
2. Does opencode hot-reload `opencode.json`/`tui.json` file edits mid-session?
3. `question.v2` reply endpoint shape vs the `question.asked` v1 shape the plugin currently translates — align on v2.
4. Where the settings sheet lives in the chat UI (composer overflow vs session header) per the style guide.

## Upstream notes

- R1/R4 are mostly Orca-side; R2 is the piece that needs an opencode-side decision (feature-request issue: "answer the question tool from IDE/ACP clients").
- No fork-specific code involved; safe for the upstream PR with screenshots per CONTRIBUTING.
