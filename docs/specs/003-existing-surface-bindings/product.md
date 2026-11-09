# 003 - Existing Surface Bindings

## Purpose

Make Orca Mobile's existing information and action surfaces operable with the
controller. Preserve their routes, state, transport, compatibility behavior,
touch interaction, and visual implementation.

## Scope

In scope:

- focus registration for existing routes and components;
- intent handlers that invoke existing callbacks and controllers;
- text-target registration around existing dictation;
- non-destructive action bindings for Context Wheel experiments;
- controller regression and device validation.

Out of scope:

- replacement pairing, project, session, agent, terminal, dashboard, file, or
  notification features;
- duplicate stores, protocol adapters, RPC descriptors, or persistence;
- final wheel contents;
- redesigning an existing touch surface before controller trials show a need.

## Requirements

### BIND-R1 - Existing surfaces remain visible and authoritative

The controller experience uses Orca Mobile's actual host/workspace context,
sessions, files, agent transcript, prompts, responses, tool activity, terminal,
diffs, and dictation. No summarized controller copy becomes a second source of
truth.

### BIND-R2 - Confirm and back invoke existing actions

`A` and `B` map to the selected existing surface action. Pairing confirmation,
navigation back, agent approval/rejection, list selection, and file opening keep
their existing validation and error handling.

### BIND-R3 - Scrolling targets the focused existing surface

L2 and R2 produce analog scroll against the focused list, transcript, terminal
scrollback, file tree, preview, diff, or connection log. Controller scroll does
not replace native touch scrolling.

### BIND-R4 - Workspace and tab cycling reuse existing ordering

LB/RB activates previous or next existing session tab. `Y+LB/RB` cycles the
workspace/project order already presented by Orca Mobile. No parallel ordering
or catalog is maintained.

### BIND-R5 - Agent intervention reuses native-chat ownership

Agent transcript, live state, approvals, questions, options, send, and cancel
remain owned by the existing native-chat controller and components. `A` and `B`
answer the focused intervention; `X` invokes the existing stop action for the
focused session.

### BIND-R6 - R3 reuses existing dictation

`R3` toggles the existing `useMobileDictation` pipeline for the focused text
target. Setup probing, microphone permission, audio chunks, host session,
errors, keep-awake, and cleanup are not reimplemented.

A visible listening state is derived from the existing dictation status. Losing
the active host connection stops through existing cleanup behavior.

### BIND-R7 - Files and diffs reuse existing readers

Controller navigation operates the current file explorer, preview, markdown,
and diff entry points. It retains existing mixed-version fallbacks, binary/image
handling, editing capability, caching, and path handling. The controller fork
does not introduce a second read-only file application.

### BIND-R8 - Terminal reuses the existing WebView and stream

Controller scrolling, text, control keys, quick commands, and file-path actions
feed the existing terminal pane and WebView callbacks. No terminal frame,
snapshot, backpressure, resize, or capability protocol is reimplemented.

### BIND-R9 - Pairing, home, and notifications stay intact

Existing QR/manual pairing, host catalog, home/resume behavior, push
registration, reconnect catch-up, and notification deep links remain unchanged.
Controller bindings add navigation only. The MVP adds no replacement dashboard.

### BIND-R10 - Wheel bindings are replaceable trial data

Existing actions may register stable binding ids for mutable wheel presets. A
binding does not determine wheel side, segment count, or placement.

## Acceptance criteria

- **BIND-AC1** - Every bound action identifies one existing callback,
  controller method, or route action as its owner.
- **BIND-AC2** - Pairing by QR still uses the current scan, parse, confirmation,
  and pre-profile pairing coordinator.
- **BIND-AC3** - Controller and touch activation of the same item reach the same
  action and produce one effect.
- **BIND-AC4** - LB/RB and `Y+LB/RB` follow the ordering already rendered by the
  active Orca surface.
- **BIND-AC5** - Agent `A`, `B`, and `X` invoke existing intervention and stop
  paths exactly once.
- **BIND-AC6** - `R3` starts and stops the existing dictation hook without a
  second microphone listener or `speech.*` request pipeline.
- **BIND-AC7** - Terminal controller input reaches the existing terminal pane;
  no `outputPause` capability or new stream opcode is added.
- **BIND-AC8** - File controller navigation retains the existing
  `files.readDir` compatibility fallback and preview behavior.
- **BIND-AC9** - Existing push registration and catch-up modules have no
  controller-owned replacement.
- **BIND-AC10** - All bound surfaces remain operable by touch.

## Non-goals

- Reproducing desktop Orca UI.
- Building a second mobile application layer.
- Replacing an existing screen because its current file location is not
  independently extractable.
