# D-pad navigation becomes contract

**Date:** 2026-09-26
**Status:** applied in `004` LOOP-T2, pending human ratification
**Supersedes:** the PRD position that the D-pad is experimental (CTRL-R2)

## What the PRD said

> D-pad behavior is experimental and is not part of the PRD controller contract.

`EXPERIMENTAL_DPAD_BINDINGS` shipped behind `experimentalDpad: false`, so
`move-selection` and `move-horizontal` were never emitted in a release build.

## What forced the change

`004` LOOP-T1's reachability audit, run against the real bindings. With the flag
off, the only intents that can move a selection are never emitted, so:

- on the home screen, `A` opens the first host and there is no way to reach any
  other one;
- in the file explorer, no row but the first can be selected, and the tree
  cannot be walked;
- an agent's question cannot be answered, because answering means choosing an
  option and there is no way to choose.

The workspace list survives only because `Y`+`LB`/`RB` happens to move its
selection — a PRD binding meant for cycling, doing navigation by accident.

## Why the wheel is not the answer

The original position assumed contextual wheels would carry navigation, which is
reasonable until you count. A wheel has segments; a host list has rows. Four to
eight of one does not enumerate an unbounded set of the other, and a wheel that
paged through a list would be a worse list.

The wheel remains right for *actions*. It was never a list.

## What changed

- `experimentalDpad` became `dpadNavigation`, default **true**.
- `EXPERIMENTAL_DPAD_BINDINGS` became `DPAD_NAVIGATION_BINDINGS`, in
  `dpad-navigation-bindings.ts`.
- The CTRL-T7 ratchet was repointed at the new names. It had been keyed to a
  module that no longer existed, so it was passing vacuously — worth noting,
  because a silently vacuous ratchet is worse than no ratchet.

The two binding sets stay separate. Their provenance still differs — one is the
PRD's own table, one was promoted here — and the rule that a mapping test must
say which table it is testing matters more once both are contract, not less.

## What is still a flag

`dpadNavigation` remains a policy field rather than a constant. A pad without a
D-pad exists, and the policy is how it says so.

## Ratification

Applied on evidence, not on preference — but it changes a PRD position, so it
wants a human yes. The device run in `004` LOOP-T7 is where it earns one: if a
controller-only task can be completed end to end, the change did its job.
