# 003 - Existing Surface Bindings - Technical Specification

## 1. Binding shape

A surface adapter stays next to controller integration code but delegates to
existing callback props, controllers, and route actions:

```ts
type SurfaceBinding = {
  readonly focusTarget: FocusTarget
  readonly wheelActions: readonly WheelActionBinding[]
}

type WheelActionBinding = {
  readonly id: string
  readonly label: string
  readonly availability: 'available' | 'unavailable' | 'unknown'
  readonly run: () => void | Promise<void>
}
```

`WheelActionBinding` supplies no position or wheel assignment. Experiment
presets in `002` own layout.

## 2. Authoritative binding matrix

| Surface | Existing owner | Controller intents | Binding rule |
| --- | --- | --- | --- |
| Pair scan and confirmation | `mobile/app/pair-scan.tsx`, `mobile/app/pair-confirm.tsx` | confirm, back, provisional selection | Invoke existing route actions; do not parse or pair again. |
| Home and host catalog | `mobile/src/home/MobileHomeScreen.tsx`, `mobile/src/home/MobileHomeHostList.tsx` | confirm, back, scroll, provisional selection | Use existing open, reconnect, disconnect, and removal actions. |
| Workspace list/detail | `mobile/src/host-screen/`, `mobile/app/h/[hostId]/index.tsx` | confirm, back, scroll, cycle-workspace, provisional selection | Derive order and active item from the existing controller. |
| Session route | `mobile/src/session/use-mobile-session-controller.ts`, `mobile/src/session/MobileSessionSurface.tsx` | cycle-tab, back, scroll | Activate existing tabs; register the active session identity for `X`. |
| Agent view | `mobile/src/session/MobileNativeChatView.tsx` and related native-chat modules | confirm, back, stop, scroll, toggle-dictation | Delegate to existing intervention, stop, send, paging, and composer callbacks. |
| Dictation | `mobile/src/hooks/use-mobile-dictation.ts`, `mobile/src/dictation/mobile-dictation-setup.ts` | toggle-dictation | Invoke existing start/stop and expose existing status. |
| Terminal | `mobile/src/session/TerminalPaneView.tsx`, `mobile/src/terminal/` | scroll, confirm/back where applicable, text target | Feed existing WebView and terminal callbacks; do not decode transport. |
| File explorer/preview | `mobile/src/files/MobileFileExplorerPanel.tsx`, `mobile/src/files/MobileFilePreviewScreen.tsx` | confirm, back, scroll, provisional selection/hierarchy | Invoke existing open, expand, preview, save, and route behavior. |
| Notifications | `mobile/src/notifications/` | navigation result only | Keep registration, catch-up, dismissal, and deep-link ownership upstream. |

## 3. Pairing

The pairing binding must preserve the current flow:

```text
expo-camera result or pasted code
  -> existing decode/parse
  -> existing confirmation route
  -> startPreProfilePairing
  -> existing credential and host stores
```

Controller code may move selection and invoke existing handlers. It must not add
a parser, pairing port, pairing RPC descriptors, relay provisioning, credential
storage, or replacement route.

Expo Camera's QR support is documented at
<https://docs.expo.dev/versions/v55.0.0/sdk/camera/>.

## 4. Workspaces and sessions

The active host/workspace/session remains whatever the current host and session
controllers report. Cycling computes previous/next from their rendered order and
invokes their activation action. A folder workspace remains whatever the
existing workspace model reports; the controller layer does not infer Git state.

## 5. Agents

`MobileNativeChatView` already accepts callbacks for stop, send, dictation,
questions, permissions, paging, options, and file opening. Bind focus and
selection around those callbacks instead of implementing journal, mutation, or
RPC behavior.

Priority while an intervention is focused:

1. `A` accepts the currently selected/default answer through the existing
   intervention callback;
2. `B` rejects or dismisses through the existing callback;
3. neither input also commits a wheel action;
4. `X` invokes the existing turn-stop callback for the focused session.

## 6. Dictation

The existing `useMobileDictation` hook owns microphone permission,
initialization, audio events, chunk budget, host start/finish/cancel, keep-awake,
and error state. A binding supplies its existing `onTranscript` destination from
the focused text target.

No controller file creates `speech.dictation.*` descriptors or imports
`@orca/expo-two-way-audio` directly. Voice setup continues through the existing
setup and voice-settings surfaces.

## 7. Terminal

`TerminalPaneView` and `TerminalWebView` own rendering and input callbacks.
Controller bindings may:

- invoke the existing scroll interface;
- send existing accessory/control-key actions;
- focus the existing live text/dictation target;
- invoke existing quick commands;
- use the existing file-path callback.

They may not decode `TerminalStreamOpcode`, assemble snapshots, implement
backpressure, claim viewports, or add capabilities. In particular,
`TerminalSubscribe` currently has no `outputPause` field, so the controller spec
must not rely on it.

## 8. Files and diffs

The existing explorer owns directory loading, caches, reconnect behavior, and
the fallback from `files.readDir` to capped `files.list`. Existing preview routes
own content classification, markdown, images, editing, line/column navigation,
and save behavior.

Provisional D-pad behavior may move selection and expand/collapse. Confirm and
back invoke the same open/route actions as touch. No controller-owned file RPC
layer or navigation history is added.

## 9. Home and notifications

The current home screen remains the root information surface. Existing push
modules own token acquisition, APNs environment, registration, catch-up,
dismissal reconciliation, and deep links.

Expo documents token acquisition and notification-response navigation at
<https://docs.expo.dev/versions/v55.0.0/sdk/notifications/>. Remote notifications
require an appropriate development or release build; controller work does not
alter that setup.

## 10. Tests

For every binding, test:

- controller input invokes the authoritative action once;
- touch still invokes that same action;
- unavailable focus or action causes no destructive effect;
- unmount removes focus and wheel registrations;
- no low-level implementation is imported into the binding.
