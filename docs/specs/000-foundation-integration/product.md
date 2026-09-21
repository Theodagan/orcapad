# 000 - Foundation and Integration

## Purpose

Establish the smallest boundary needed to add controller interaction to Orca
Mobile without creating a second Orca Mobile inside the fork.

## Scope

In scope:

- controller-specific concepts and dependency rules;
- authoritative reuse of existing Orca Mobile capabilities;
- thin intent and wheel bindings into existing surfaces;
- safeguards against duplicate infrastructure and presentation;
- a practical, evidence-based future extraction path.

Out of scope:

- replacement models for projects, workspaces, sessions, agents, messages,
  tasks, activity, connections, notifications, terminals, or files;
- generic backend ports created only for architectural symmetry;
- replacement screens, routes, state stores, RPC descriptors, transport clients,
  or persistence;
- a standalone runtime or application.

## Requirements

### FND-R1 - Existing Orca Mobile behavior is authoritative

When Orca Mobile already owns a capability, controller code invokes that
implementation. It does not copy, migrate, or independently orchestrate it.

### FND-R2 - The controller layer owns only controller mechanics

The initial controller vocabulary is limited to normalized input samples,
bindings, intents, focus targets, wheel state, wheel segments, and experiment
presets. Additional models require a concrete controller behavior that cannot be
expressed using existing Orca Mobile state.

### FND-R3 - Bindings are thin

A binding translates a controller intent or wheel commit into an existing
surface action. It owns no remote truth, transport lifecycle, protocol decode,
or persistence already owned by that surface.

### FND-R4 - Touch behavior is preserved

Controller integration must not remove, fork, or change the semantics of an
existing touch action. One controller action and the corresponding touch action
reach the same authoritative callback.

### FND-R5 - Extraction follows evidence

Controller mechanics remain clean enough to move later. Existing Orca Mobile
behavior is not duplicated merely to make the entire current subtree compile in
isolation.

### FND-R6 - Existing pushed work is not grandfathered

Every existing file under `mobile/src/gamepad/` is re-evaluated against these
requirements. A checked task from the superseded specification is not evidence
that the implementation should remain.

## Acceptance criteria

- **FND-AC1** - Every controller-visible capability in `003` cites its
  authoritative existing implementation.
- **FND-AC2** - Repository search finds no new socket, reconnect scheduler,
  pairing parser/coordinator, push-registration pipeline, speech-audio pipeline,
  terminal protocol implementation, or file RPC layer under `mobile/src/gamepad/`.
- **FND-AC3** - No new route or screen replaces an existing Orca Mobile route or
  screen solely to satisfy a controller-layer boundary.
- **FND-AC4** - A controller and touch test invoke the same existing action for
  each bound surface.
- **FND-AC5** - Every retained `mobile/src/gamepad/` file is classified by the
  source-reconciliation task.

## Non-goals

- Proving that every Orca-independent UI element can already ship standalone.
- Designing a generic backend abstraction.
- Freezing wheel contents before trials.
