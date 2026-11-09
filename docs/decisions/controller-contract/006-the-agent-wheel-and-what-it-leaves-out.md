# The agent wheel: replies revoked, destructive actions admitted, hand off left out

**Date:** 2026-10-05
**Status:** applied in `005` USE-T10, pending human ratification
**Supersedes:** `004` LOOP-T4 and LOOP-AC4 (canned replies on the right wheel)
**Amends:** `002` WHEEL-R7 for the agent preset only
**Amended by:** `007` (Open web page is removed; Chat / terminal and Show / hide input are added)

## What the specifications said

`004` registered a set of canned replies as the right wheel's contents so that text could
reach an agent with dictation unavailable. `002` WHEEL-R7 kept real-action presets free of
destructive actions until cancel and commit had passed device trials.

## What changed

- **The replies are revoked.** The product owner asked for the right wheel to be
  "Close the agent, Stop the agent, Hand off, Launch an agent, Open a web page" and for the
  current options to be removed. Dictation is the text path, and `Y` now reaches it.
  LOOP-AC4 ("text reaches an agent with dictation unavailable") no longer has a mechanism
  and is dropped rather than quietly kept false.
- **Stop and Close are admitted.** They are what was asked for, and they are destructive.
  WHEEL-R7 asked for that to be said before a trial runs, so the agent preset declares
  `includes-destructive` and says why. Both sit away from the two segments that open another
  wheel, so a thumb that is aiming for a door does not land on one. A commit still needs a
  lock and `A`; `B` or centring cancels with no effect.
- **Hand off is out of scope.** In Orca a hand-off moves a session from one agent to another
  without losing context. The product owner's rule was that if the mobile app does not
  natively expose it, it is out of scope. It does not: there is no hand-off call, route or
  control in `mobile/` to reuse. Building one would be a new feature on the host side, not a
  controller binding. The wheel has four segments, and nothing in the preset needs to change
  if the app gains the feature.
- **Two segments open a wheel.** Launch agent lists what the new-tab drawer offers. Open web
  page lists the ports the worktree has open, and "Enter URL…".

## What it costs

A user with dictation unavailable has lost the canned replies and has no controller-only way
to put words in front of an agent. The terminal's keys cover the common answers (Enter,
Escape, the arrows). This is the trade the product owner chose.

## Ratification

The preset is an experiment like every other (`contractual: false`), and WHEEL-T9 still owns
promoting any layout to a default.
