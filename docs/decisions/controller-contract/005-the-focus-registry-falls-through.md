# The focus registry falls through, and priority is declared

**Date:** 2026-10-05
**Status:** applied in `005` USE-T2, pending human ratification
**Amends:** `001` §7 (focus registry), step 3 and step 4

## What the specification said

> 3. the active focus target receives accepted intents;
> 4. unaccepted or targetless intents are no-ops.

with "active" meaning the most recently mounted target that accepts the intent.

## What forced the change

The device found scroll and the buttons dead on screens that had bindings for them.
Tracing it through the composed screen, two properties of "newest accepting target wins"
were responsible:

- React runs child effects before parents', so on first mount the parent session's
  target was newest and won focus over the chat or terminal inside it;
- a terminal pane that was not on screen still registered, and a re-render read as a
  fresh mount that took focus from whoever was in front.

`005` USE-R2 also asked for something "newest wins" cannot do: that an intent reach the
most specific surface that accepts it and fall through to the next when that surface does
not.

## What changed

- **Priority is declared**, not inferred from mount order: `screen`, `surface`, `card`.
  The newest seat only breaks a tie, and a seat survives same-id re-registration.
- **An intent falls through** the focused zone, then the screen's own targets, then the
  other zones for the intents that mean the same everywhere (`scroll`, `cycle-tab`,
  `cycle-workspace`). Anything unaccepted along the whole chain is still a no-op.
- **A handler may decline** with a sentinel and the intent continues down the chain.
- **Panes nobody is looking at register nothing**, and screens retained underneath another
  are gated by the navigator, so fall-through can never reach a hidden screen.

## What it costs

Fall-through is more forgiving than "first accepter wins", which means a target that accepts
too much can now be reached from further away. `ZONE_AGNOSTIC_INTENTS` is deliberately short
and a test pins it.

## Ratification

Applied on evidence from the device session. The reachability audit of `004` is the standing
check that it did not strand a step.
