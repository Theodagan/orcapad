# 004 - The Controller-Only Loop

## Purpose

`000`–`003` built the mechanism: input, wheel, and bindings into every existing
Orca Mobile surface. This specification closes the loop those parts were built
for — managing an agentic development environment with a controller and nothing
else.

The distinction matters because the previous specifications are complete and the
product goal is still not met. Every task in `003` passed while leaving a
controller-only user unable to prompt an agent.

## The loop, and where it breaks

An agentic coding session is a cycle:

```text
see state -> prompt the agent -> it works -> it asks -> answer -> approve -> read the result
```

Audited against the shipped bindings, a controller-only user can do this:

| Step | Controller-only today |
| --- | --- |
| see state | yes — home, workspaces, tabs, transcript, files, terminal all scroll |
| prompt the agent | **no** — no composer or send binding exists |
| it works | yes — `X` stops a turn |
| it asks | yes — the card renders |
| answer | **no** — `A` is deliberately a no-op on an ask or a question |
| approve | yes — `A` answers a permission |
| read the result | yes |

Two breaks, both fatal to the goal. A third is upstream of them: the PRD's
controller contract has **no way to move a selection**, so `move-selection` ships
behind `experimentalDpad: false` and a user cannot choose a host other than the
first one, or a file other than the first one.

## Scope

In scope:

- selection movement as a contract rather than an experiment;
- answering an agent's question or AskUserQuestion prompt;
- getting text to an agent without a keyboard;
- making available actions discoverable on every surface;
- a reachability audit that fails when the loop reopens.

Out of scope:

- a general on-screen keyboard for arbitrary text (dictation and canned replies
  are the MVP's answer; a radial keyboard is a product decision, not an MVP one);
- redesigning any existing touch surface;
- promoting any wheel preset to a product default — `002` WHEEL-T9 still owns
  that gate.

## Requirements

### LOOP-R1 - The loop closes with a controller alone

Every step of the cycle above is reachable without touching the screen. A step
that cannot be reached is a defect, not a limitation.

### LOOP-R2 - Selection movement is part of the contract

A list the controller can see is a list the controller can move through. The
PRD's D-pad-as-experiment position was written when the wheel was assumed to
carry navigation; a wheel has segments and a host list has rows, and the two do
not substitute. Movement becomes contract, and the experiment flag stops gating
whether the product works at all.

This is a change to a PRD position and is recorded as a decision, not applied
silently.

### LOOP-R3 - Text reaches the agent without a keyboard

Dictation is the primary path and already exists. It is not always available —
setup, permission, and a host session can each be missing — so a second path
exists that needs none of them: a small set of replies the user can commit from
the wheel.

Canned replies are experiment data, like every other preset. They are not a
product vocabulary.

### LOOP-R4 - An agent's question is answerable

`A` on an ask or a question answers the **selected** option, and selection is
movable. The refusal to guess a default stands: what changes is that there is
now a selection to accept, not that one is invented.

### LOOP-R5 - Available actions are discoverable

On every surface, the user can see what the buttons currently do. Derived from
what the focused surface actually accepts, never from a hand-written table that
can drift from the bindings.

### LOOP-R6 - Reachability is proven

The loop's steps are enumerated in a test that fails when one becomes
unreachable. An audit written once and left to rot is how `003` finished
complete and short of the goal.

### LOOP-R7 - Touch remains exactly as it was

Unchanged from BIND-AC10. Nothing here removes or degrades a touch path.

## Acceptance criteria

- **LOOP-AC1** - Every step in the loop table has a passing reachability test.
- **LOOP-AC2** - A host other than the first can be opened with a controller.
- **LOOP-AC3** - An AskUserQuestion prompt can be answered with a controller.
- **LOOP-AC4** - Text reaches an agent with dictation unavailable.
- **LOOP-AC5** - Each bound surface reports its own available actions.
- **LOOP-AC6** - Every touch entry point in `003` still reaches its action.
- **LOOP-AC7** - No preset or reply set becomes a product default.

## Non-goals

- Deciding the final reply vocabulary.
- Treating a closed loop as proof the experience is good. The loop closing is
  what makes the device trials in `002` and `003` worth running at all.
