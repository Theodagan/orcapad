# CF07 — Session loop

**Goal:** Session screen with chat and TUI, composer, Agent panel, inline approvals with confirmation, split keys, dictation notch and notifications.

|                          |                                                                            |
| ------------------------ | -------------------------------------------------------------------------- |
| Dispatch when            | CF06 merged                                                                |
| Branch                   | `deck/cf07-session-loop` from `main`                                       |
| PR                       | `Theodagan/orcapad` `main`, title `deck(CF07): Session loop`               |
| Tasks                    | T55, T56, T57, T58, T59, T60, T61, T62, T65, T67, T68, T69 (in this order) |
| Owner checks after merge | L-V07                                                                      |

Read [`README.md`](./README.md) first: it holds the rules every cloud worker follows.

## Feature done when

- Every task below meets its _Done when_ (cloud bar), with an entry in `mobile/src/deck/HANDOFF-LOG.md`.
- `pnpm typecheck`, `pnpm test`, `pnpm lint` in `mobile/` add no failures to the recorded baseline; `deck-boundary.test.ts` passes once it exists.
- The PR description lists: tasks done, tasks skipped and why, files touched outside `mobile/src/deck/` and `mobile/app/deck/` (also in `UPSTREAM-TOUCHES.md`), and the owner checks to run.

## Requirements cited

From the PRD (not in the repo). Rule IDs such as `PAD-6` are in `Theodagan/Pocketdeck` `docs/ux/ux-rules.md`.

- **DECK-R25** No decision from a single trigger or wheel pick: a confirmation shows the exact
  request, operation and effect, and is bound to that request (SAFE-1, SAFE-2).

## Tasks

### T55 — Session screen frame

- **Scope:** cloud: code and tests.
- **Owner check (not yours):** the device part of _Done when_ is verified locally by the owner (L-V07). Your bar: the tests in _Done when_; where it names only a device check, a hook or render test proving the same behaviour on fixture data; plus the flow exercised against `pnpm mock-server` when it serves the data.
- **Files:** `mobile/app/deck/s/[hostId]/[worktreeId].tsx` (create), `mobile/src/deck/session/DeckSession.tsx` (create, + test)
- **Change:** Session screen inside the workspace header; Chat UI / TUI switch (SES-1).
- **Depends on:** T51
- **Done when:** opening a session from Sessions or a workspace lands here on device.

### T56 — Chat transcript on the native chat controller

- **Scope:** cloud: code and tests.
- **Owner check (not yours):** the device part of _Done when_ is verified locally by the owner (L-V07). Your bar: the tests in _Done when_; where it names only a device check, a hook or render test proving the same behaviour on fixture data; plus the flow exercised against `pnpm mock-server` when it serves the data.
- **Files:** `mobile/src/deck/session/DeckTranscript.tsx` (create, + test)
- **Change:** Data from `session/native-chat/use-mobile-native-chat-controller.ts`; message bodies through `MobileMarkdown`; reuse native-chat row components (tool runs, reasoning, notices) where their layout fits a column; deck layout and focus.
- **Depends on:** T55, T31
- **Done when:** on device, a live Claude Code session streams into the transcript; L2/R2 scroll works.

### T57 — TUI view

- **Scope:** cloud: code and tests.
- **Owner check (not yours):** the device part of _Done when_ is verified locally by the owner (L-V07). Your bar: the tests in _Done when_; where it names only a device check, a hook or render test proving the same behaviour on fixture data; plus the flow exercised against `pnpm mock-server` when it serves the data.
- **Files:** `mobile/src/deck/session/DeckTerminal.tsx` (create, + test)
- **Change:** Wrap `session/TerminalPaneView.tsx`; SCR-11 scroll; IME suppressed.
- **Depends on:** T55
- **Done when:** on device, switching to TUI shows the agent terminal and accepts keys.

### T58 — Composer

- **Scope:** cloud: code and tests.
- **Owner check (not yours):** the device part of _Done when_ is verified locally by the owner (L-V07). Your bar: the tests in _Done when_; where it names only a device check, a hook or render test proving the same behaviour on fixture data; plus the flow exercised against `pnpm mock-server` when it serves the data.
- **Files:** `mobile/src/deck/session/DeckComposer.tsx` (create, + test)
- **Change:** SES-9: one composer under the conversation; send via the native chat controller; `showSoftInputOnFocus={false}` (KEY-9).
- **Depends on:** T56
- **Done when:** on device, a typed (split keys stub) message is sent and appears.

### T59 — Mode · model indicator and Agent panel

- **Scope:** cloud: code and tests.
- **Owner check (not yours):** the device part of _Done when_ is verified locally by the owner (L-V07). Your bar: the tests in _Done when_; where it names only a device check, a hook or render test proving the same behaviour on fixture data; plus the flow exercised against `pnpm mock-server` when it serves the data.
- **Files:** `mobile/src/deck/session/AgentPanel.tsx` (create, + test)
- **Change:** SES-7 on `use-mobile-native-chat-session-option-controller.ts`; options gated by T11.
- **Depends on:** T58, T42
- **Done when:** on device, changing model takes effect on the next turn.

### T60 — Inline prompt strip and hero band

- **Scope:** cloud: code and tests.
- **Owner check (not yours):** the device part of _Done when_ is verified locally by the owner (L-V07). Your bar: the tests in _Done when_; where it names only a device check, a hook or render test proving the same behaviour on fixture data; plus the flow exercised against `pnpm mock-server` when it serves the data.
- **Files:** `mobile/src/deck/approvals/PromptStrip.tsx`, `HeroBand.tsx` (create, + tests)
- **Change:** SAFE-2, HINT-3, SD-7, REQ-INLINE from `use-mobile-native-chat-prompts.ts` / `prompt-cards`.
- **Depends on:** T56
- **Done when:** on device, a permission request shows inline with the exact request.

### T61 — Decision confirmation

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/approvals/DecisionConfirm.tsx` (create, + test)
- **Change:** Frame from `ConfirmModal` (content is the deck's). SAFE-1/DECK-R25: confirmation shows request, operation, effect; bound to the request id; sends via `mobile-native-chat-permission-send.ts`.
- **Depends on:** T60
- **Done when:** test: a stale request id cannot be confirmed; a trigger alone never decides.

### T62 — Deny with feedback

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/approvals/DenyWithFeedback.tsx` (create, + test)
- **Change:** SAFE-7: offered only when the prompt accepts free text; otherwise absent.
- **Depends on:** T61
- **Done when:** tests for both prompt kinds.

### T65 — Split keys keyboard

- **Scope:** cloud: code and tests.
- **Owner check (not yours):** the device part of _Done when_ is verified locally by the owner (L-V07). Your bar: the tests in _Done when_; where it names only a device check, a hook or render test proving the same behaviour on fixture data; plus the flow exercised against `pnpm mock-server` when it serves the data.
- **Files:** `mobile/src/deck/keys/SplitKeys.tsx`, `split-keys-layout.ts` (create, + tests)
- **Change:** KEY-2/3/4/10, IH-14: halves in side-panel slots (landscape), bottom keys (portrait), dual cursors per maquette `keyboard.js`; landscape slot geometry from `layout/side-rail-strip.ts` (`getSideRailStrip`, keyboard occlusion).
- **Depends on:** T42, T66
- **Done when:** render tests for both orientations; pad types into a field on device.

### T67 — No Android IME on deck fields

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/keys/deck-text-field.tsx` (create), `mobile/src/deck/keys/ime-guard.test.ts` (create)
- **Change:** One deck text field wrapper with `showSoftInputOnFocus={false}`; test scans `src/deck/**` for raw `TextInput`.
- **Depends on:** T65
- **Done when:** guard test fails on a raw `TextInput` probe.

### T68 — Dictation notch

- **Scope:** cloud: code and tests.
- **Split:** Cloud part: the notch, the lifecycle and its tests with a mocked dictation hook. Dictating by voice on the device is the owner's (L-V07).
- **Files:** `mobile/src/deck/dictation/DictationNotch.tsx` (create, + test)
- **Change:** MIC-1…4 on `hooks/use-mobile-dictation.ts`; inserts only recognised text (SAFE-4).
- **Depends on:** T32, T58
- **Done when:** on device, hold Start dictates into the composer.

### T69 — Notifications panel, toasts, Needs you

- **Scope:** cloud: code and tests.
- **Owner check (not yours):** the device part of _Done when_ is verified locally by the owner (L-V07). Your bar: the tests in _Done when_; where it names only a device check, a hook or render test proving the same behaviour on fixture data; plus the flow exercised against `pnpm mock-server` when it serves the data.
- **Files:** `mobile/src/deck/notifications/*.tsx` (create, + tests)
- **Change:** Toasts with `TransientToast`. SD-8, SD-4, DIAL-14 data from `notifications/desktop-notification-events.ts`.
- **Depends on:** T42, T53
- **Done when:** on device, an agent needing input raises a toast and appears in Needs you.
