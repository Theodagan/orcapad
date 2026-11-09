# Dictation is a tap of Y, and R3 is freed

**Date:** 2026-10-05
**Status:** applied in `005` USE-T7, pending human ratification
**Supersedes:** the PRD position that `R3` toggles dictation (section 4)

## What the PRD said

> R3 | Toggle dictation

## What forced the change

Dictation did not work on the device, and the product owner asked for it on `Y`. Two
things made `R3` a poor home for it: clicking a thumbstick while holding the pad is
easy to do by accident and hard to do on purpose, and the feature needs to be reachable
in one motion from wherever the thumbs already are.

`Y` already means something: held, it is the modifier for `L1`/`R1` to switch worktrees.
A button cannot be a modifier and a trigger at the same instant, so it has to be decided
by what happens next.

## What changed

- `Y` is a **tap**: pressed and released within 500 ms with nothing else pressed in
  between. It toggles the existing dictation, exactly as the mic button does.
- Anything else disarms it: another button, a capture by the wheel, or holding past the
  window. `Y` held with `L1`/`R1` still means worktree, and never also toggles dictation.
- `R3` and `L3` are unassigned, and a test proves they stay inert.
- A start is offered only where the words have a place to land, including a structured
  chat, and is refused out loud otherwise. A stop always goes through, from anywhere,
  because a live microphone must always be stoppable.

## What it costs

A tap is only knowable on release, so dictation starts when `Y` comes up, not when it goes
down. On a handheld that is a few tens of milliseconds, and it is the price of `Y` being a
modifier too.

## Ratification

Applied on the product owner's instruction. Whether the release-time start feels late is
a device question.
