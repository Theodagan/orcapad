# Orca Controller - Software Architecture

## 1. Purpose

Orca Controller is a controller-first fork of Orca Mobile. The MVP validates a
controller-native interaction model, especially the Context Wheel. It does not
replace Orca Mobile's application, transport, runtime, or existing screens.

The architecture follows one rule:

> Add controller mechanics around existing Orca Mobile capabilities. Do not
> create a parallel implementation of a capability Orca Mobile already owns.

This applies to pairing, transport, projects, workspaces, sessions, agents,
dictation, terminal rendering, files, notifications, navigation, and storage.

## 2. Runtime shape

```text
physical controller
        |
native input capture
        |
binding and intent resolver
        +------------------+
        |                  |
focused Orca surface   Context Wheel
        |                  |
        +--------+---------+
                 |
     existing Orca Mobile action
```

Existing touch behavior remains active. Controller input is another way to
invoke the same actions, not a second application state or navigation model.

## 3. Controller-owned code

Controller-specific code may live under `mobile/src/gamepad/` when it owns one
of these concerns:

- normalized physical-controller samples;
- the PRD controller binding and intent resolver;
- focus registration for existing Orca surfaces;
- Context Wheel geometry, state, rendering, registry, and experiment presets;
- thin bindings from controller intents to existing Orca Mobile callbacks;
- controller-specific notices and experiment measurements.

The subtree is an organizational boundary, not an extraction guarantee. A
controller binding may import and compose an existing Orca Mobile controller,
hook, route contract, or component when that is the smallest way to reuse the
authoritative behavior.

## 4. Existing Orca Mobile remains authoritative

The following capabilities remain where they are today:

| Capability | Authoritative implementation |
| --- | --- |
| QR and manual pairing | `mobile/app/pair-scan.tsx`, `mobile/app/pair-confirm.tsx`, `mobile/src/transport/pre-profile-pairing-coordinator.ts` |
| Transport and reconnect | `mobile/src/transport/` |
| Home and host navigation | `mobile/src/home/`, `mobile/app/h/[hostId]/index.tsx` |
| Session state and navigation | `mobile/src/session/use-mobile-session-controller.ts`, `mobile/src/session/MobileSessionSurface.tsx` |
| Agent conversation and interventions | `mobile/src/session/MobileNativeChatView.tsx` and related `mobile-native-chat-*` modules |
| Dictation | `mobile/src/hooks/use-mobile-dictation.ts`, `mobile/src/dictation/mobile-dictation-setup.ts` |
| Terminal | `mobile/src/session/TerminalPaneView.tsx`, `mobile/src/terminal/` |
| Files and previews | `mobile/src/files/MobileFileExplorerPanel.tsx`, `mobile/src/files/MobileFilePreviewScreen.tsx` |
| Notifications | `mobile/src/notifications/` |
| Preferences and credentials | `mobile/src/storage/`, existing transport credential stores |

Controller work may expose an existing action through a new input. It must not
copy the action's orchestration, remote state, persistence, or protocol mapping.

## 5. Reuse decision rule

Before adding a domain projection, port, store, RPC descriptor, route, screen,
or transport operation:

1. Search Orca Mobile for the capability and its tests.
2. Identify the existing callback, controller, hook, or component that owns it.
3. Bind controller intent to that owner.
4. Add a new abstraction only when no existing interface can provide the
   controller behavior.
5. Record the evidence and the missing interface in the relevant spec.

Moving existing code into `mobile/src/gamepad/` is not reuse. A move or copy is
allowed only when the original implementation is retired in the same change and
the move is independently justified.

## 6. Dependency rules

```text
native input adapter -> controller sample
controller sample -> pure intent resolver
intent resolver -> focus registry / wheel state
focus registry -> existing Orca Mobile surface action
wheel preset -> existing Orca Mobile surface action
```

Hard rules:

- Existing surfaces never read raw controller buttons or axes.
- Raw button and axis vocabulary stays in controller input modules.
- Wheel mechanics never name an Orca action.
- Experiment presets may bind actions, but remain replaceable data.
- Controller bindings do not open sockets, schedule reconnects, parse pairing
  payloads, register push tokens, stream microphone audio, decode terminal
  protocols, or issue low-level RPC calls when existing code already does so.
- Existing surface state remains the single source of truth.

## 7. Focus and intents

An existing surface registers a focus target with:

- a stable target id;
- the session or workspace identity already owned by that surface, when any;
- the intents it accepts;
- handlers that invoke its existing actions;
- an optional text target for existing dictation.

Focus registration follows mounted routes and panes. It does not reproduce the
navigation stack or session tree. Destructive intents with no valid target are
no-ops.

## 8. Context Wheel experiments

Wheel mechanics and wheel contents are separate:

- mechanics implement the six PRD rules;
- presets are mutable experiment data;
- Wheel 1, Wheel 2, segment count, placement, and actions remain unsettled;
- every preset carries trial metadata and is explicitly non-contractual;
- no preset becomes a product default without a recorded device trial and a
  human decision.

## 9. Platform boundary

Controller capture is platform-specific:

- Android uses native input-device, motion, and key events;
- iOS/iPadOS would use Apple's GameController framework, and is deferred: no
  iOS controller capture is built until Android device evidence exists;
- Expo exposes the native implementations through a local module;
- a stub reader keeps non-controller and unsupported environments operational.

Android event delivery on the Retroid Pocket Flip, vendor key mapping, trigger
behavior, and terminal WebView interception are hardware gates. They are not
assumed from documentation.

## 10. Compatibility

The controller fork inherits Orca Mobile's compatibility behavior. A binding
must reuse existing mixed-version fallbacks rather than create a second
capability map or protocol gate.

Changes to shared RPC parameters, stream frames, or host-published content must
follow `docs/reference/remote-wire-compatibility.md`. The controller MVP adds no
new terminal stream opcode or backend requirement.

## 11. Extraction

The PRD asks for the maximum practical portion to be extractable after the UX
matures. The MVP therefore keeps controller mechanics clean, but does not force
existing Orca Mobile presentation and application behavior behind duplicate
ports today.

After interaction trials, extraction is evaluated module by module:

1. identify mechanics proven independent in practice;
2. identify bindings that remain Orca-specific;
3. extract only the stable product concepts;
4. replace Orca bindings if a standalone backend is actually built.

Extraction readiness is evidence, not a requirement to rebuild Orca Mobile.

## 12. Validation

Architecture changes are accepted only when:

- each controller action invokes an existing authoritative action where one
  exists;
- no new screen replaces an existing screen solely for architectural purity;
- no second transport, pairing, notification, dictation, terminal, or file
  pipeline is introduced;
- touch behavior remains functional;
- controller and wheel mechanics are testable without a device;
- hardware-dependent claims have recorded device evidence.
