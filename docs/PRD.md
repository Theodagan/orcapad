# Orca Controller — MVP PRD

## 1. Product

A controller-first fork of Orca Mobile that redesigns the mobile Orca experience around gamepad interaction.

The product is intended for:

- Android handhelds with integrated controls, initially the Retroid Pocket Flip.
- iPhone/iPad paired with a Bluetooth controller. **Deferred.** Android is the
  only platform built, tested, and shipped until the Retroid device trials
  conclude. The iOS audience remains a product intent, not current scope.

Orca is the initial backend/integration target, but the UX and product layer should remain sufficiently backend-agnostic to support extraction into a standalone application later.

## 2. Objective

Explore and validate a fundamentally controller-native interaction model for an AI coding environment, rather than adapting a conventional mobile/desktop IDE to a gamepad.

The MVP prioritizes experimentation with the interaction model, especially the Context Wheel, while retaining the information needed to understand and operate an active coding environment.

## 3. Core UX

### Controller-first

The gamepad is the primary interaction model.

Touch remains useful where appropriate, but the principal navigation, selection and action model must work through the controller.

### Context Wheel

The Context Wheel is the central UX pattern to explore.

Two contextual wheels are opened through stick motion:

- Left stick → Wheel 1 — assignment TBD
- Right stick → Wheel 2 — assignment TBD

Wheel behavior:

1. Opens immediately when the stick leaves the dead zone.
2. Locks onto the segment indicated by the stick.
3. Stick movement alone never executes an action.
4. A commits the currently selected segment.
5. Returning to center or leaving the valid segment before A cancels with zero side effect.
6. No hold-to-summon delay.

Wheel assignments and segment contents remain deliberately open for UX iteration.

## 4. Controller mapping

| Input | Function |
| ----- | -------- |
| L2 (analog) | Scroll up — current pane |
| R2 (analog) | Scroll down — current pane |
| LB / RB | Previous / next tab — current project |
| Y + LB/RB (hold) | Previous / next worktree or project |
| Left stick (motion) | Open Wheel 1 — assignment TBD |
| Right stick (motion) | Open Wheel 2 — assignment TBD |
| A | Confirm — commits held wheel direction, or general confirm |
| B | Reject / back |
| X | Stop / interrupt — kills in-flight agent turn or tool call, any pane |
| R3 | Toggle dictation |
| L3 | Unassigned |

This mapping is the initial controller contract. The wheel contents are the primary area of UX experimentation.

## 5. Information surface

The experience must preserve direct visibility into the underlying coding environment, including:

- project/worktree context
- tabs/sessions
- actual file tree
- actual files/code
- agent transcript
- prompts and responses
- agent/tool activity and state
- terminal/output where relevant
- diffs where relevant
- voice/dictation input

This is not intended to become a full mobile IDE. The goal is to expose the right information and controls through a controller-oriented experience.

## 6. Orca relationship

The implementation should reuse Orca Mobile's existing capabilities and connectivity wherever practical.

The fork owns the presentation and interaction layer.

Orca-specific integration must remain isolated so that the controller UX does not become structurally dependent on Orca's implementation.

## 7. MVP constraints

- Start from Orca Mobile rather than building an unrelated application.
- Preserve compatibility with upstream Orca Mobile as far as practical.
- Controller interaction is a first-class design constraint, not an input accessory.
- Context Wheel behavior must remain easy to iterate.
- Preserve actual files/file tree and agent interaction visibility.
- Avoid unnecessary backend/runtime reimplementation.
- Keep the reusable product layer separable from Orca-specific integration.

## 8. Non-goals

- Building a conventional mobile IDE.
- Reproducing the desktop Orca UI on mobile.
- Replacing Orca's backend/runtime.
- Finalizing the Context Wheel before experimentation.
- Building a separate standalone application before the UX has matured.

## 9. Extraction target

Once the controller UX has matured, the maximum practical portion of the application should be extractable into a standalone product.

The intended evolution is:

```text
Orca Mobile fork → controller UX experimentation → validated product layer → standalone application
```

The architecture must therefore keep the Orca integration replaceable without requiring the controller UX to be rewritten.
