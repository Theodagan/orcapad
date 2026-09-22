# Orca Controller - Specification Index

These specifications derive from [`../PRD.md`](../PRD.md) and the reuse-first
architecture in [`../architecture.md`](../architecture.md).

The specification set defines controller mechanics and their bindings into the
existing Orca Mobile application. It does not respecify capabilities Orca
Mobile already implements.

## Specifications

| # | Specification | Depends on | PRD coverage |
| --- | --- | --- | --- |
| 000 | [Foundation and integration](./000-foundation-integration/) | - | Sections 6, 7, 9 |
| 001 | [Controller input](./001-controller-input/) | 000 | Sections 3, 4, 7 |
| 002 | [Context Wheel](./002-context-wheel/) | 000, 001 | Sections 2, 3, 7, 8 |
| 003 | [Existing surface bindings](./003-existing-surface-bindings/) | 000, 001, 002 | Sections 4, 5, 6 |

Build order:

```text
000-foundation-integration
          |
001-controller-input
          |
002 Context Wheel mechanics and smoke presets
          |
003 existing-surface bindings
          |
002 real-action presets, device trials, and decision gate
```

## Product decisions

- `docs/PRD.md` remains the product authority.
- Existing Orca Mobile routes, controllers, hooks, state, and components remain
  authoritative.
- D-pad behavior is experimental and is not part of the PRD controller
  contract.
- Wheel assignments are mutable experiment presets, not requirements.
- A standalone product is deferred until controller UX evidence exists.

## Reuse ledger

| Surface | Reuse |
| --- | --- |
| Pairing and QR | `mobile/app/pair-scan.tsx`, `mobile/app/pair-confirm.tsx`, `mobile/src/transport/pre-profile-pairing-coordinator.ts` |
| Hosts and workspaces | `mobile/src/home/`, `mobile/src/host-screen/`, `mobile/app/h/[hostId]/index.tsx` |
| Sessions | `mobile/src/session/use-mobile-session-controller.ts`, `mobile/src/session/MobileSessionSurface.tsx` |
| Agents | `mobile/src/session/MobileNativeChatView.tsx`, existing `mobile-native-chat-*` modules |
| Dictation | `mobile/src/hooks/use-mobile-dictation.ts`, `mobile/src/dictation/mobile-dictation-setup.ts` |
| Terminal | `mobile/src/session/TerminalPaneView.tsx`, `mobile/src/terminal/` |
| Files | `mobile/src/files/MobileFileExplorerPanel.tsx`, `mobile/src/files/MobileFilePreviewScreen.tsx` |
| Notifications | `mobile/src/notifications/` |

## PRD traceability

| PRD obligation | Replacement requirement | Task coverage |
| --- | --- | --- |
| Controller is primary; touch remains useful | CTRL-R1, BIND-R1 | CTRL-T5, BIND-T1 through BIND-T7 |
| Both sticks open contextual wheels | WHEEL-R1, WHEEL-R4 | WHEEL-T2, WHEEL-T5 |
| Motion never executes; A commits; invalid direction cancels | WHEEL-R1, WHEEL-R2 | WHEEL-T2, WHEEL-T3 |
| No summon delay | CTRL-R6, WHEEL-R5 | CTRL-T3, WHEEL-T5, WHEEL-T8 |
| L2/R2 scroll | CTRL-R1, BIND-R3 | CTRL-T3, BIND-T3 through BIND-T7 |
| LB/RB cycle tabs | CTRL-R1, BIND-R4 | CTRL-T3, BIND-T3 |
| Y+LB/RB cycle workspace/project | CTRL-R1, BIND-R4 | CTRL-T3, BIND-T2 |
| A confirm and B reject/back | CTRL-R1, BIND-R2 | CTRL-T3, BIND-T1 through BIND-T7 |
| X stops the focused agent turn/tool call | CTRL-R3, BIND-R5 | CTRL-T3, BIND-T4 |
| R3 toggles dictation | CTRL-R1, BIND-R6 | CTRL-T3, BIND-T5 |
| L3 remains unassigned | CTRL-R1 | CTRL-T3 |
| Project/worktree and tabs/session visibility | BIND-R1, BIND-R4 | BIND-T2, BIND-T3 |
| Files, code, and diffs remain visible | BIND-R1, BIND-R7 | BIND-T4, BIND-T7 |
| Agent transcript, prompts, responses, and activity remain visible | BIND-R1, BIND-R5 | BIND-T4 |
| Terminal/output remains visible where relevant | BIND-R1, BIND-R8 | BIND-T6 |
| Voice/dictation remains available | BIND-R6 | BIND-T5 |
| Reuse Orca Mobile and isolate Orca-specific bindings | FND-R1 through FND-R5 | FND-T1 through FND-T5 |
| Wheel remains easy to iterate | WHEEL-R3, WHEEL-R6 | WHEEL-T4, WHEEL-T6 through WHEEL-T9 |
| Avoid backend/runtime reimplementation | FND-R2, FND-R3 | FND-T1, FND-T3, FND-T4 |
| Preserve a practical extraction path | FND-R5 | FND-T5 |

## External evidence

- Expo local native modules:
  <https://docs.expo.dev/modules/get-started/>
- Expo Camera 55 QR support:
  <https://docs.expo.dev/versions/v55.0.0/sdk/camera/>
- Expo SecureStore 55:
  <https://docs.expo.dev/versions/v55.0.0/sdk/securestore/>
- Expo Notifications 55:
  <https://docs.expo.dev/versions/v55.0.0/sdk/notifications/>
- React Native Reanimated shared values and worklets:
  <https://docs.swmansion.com/react-native-reanimated/docs/guides/worklets>
- Android controller input:
  <https://developer.android.com/develop/ui/views/touch-and-input/game-controllers/controller-input>

Official documentation establishes API feasibility. Retroid Pocket Flip event
delivery, vendor mappings, trigger behavior, WebView interception, and latency
remain device-tested facts.

## Task rules

- Every task names exact files and executable commands.
- Every new abstraction cites the search that showed no existing implementation
  could serve the requirement.
- No task may create a replacement pairing, transport, notification, dictation,
  session, agent, terminal, file, or home screen.
- Tests separate PRD-contract mappings from experimental D-pad and wheel data.
- Task checkboxes begin unchecked until work is revalidated against these specs.
