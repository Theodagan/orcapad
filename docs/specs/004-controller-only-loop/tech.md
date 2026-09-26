# 004 - The Controller-Only Loop - Technical Specification

## 1. The loop as data

The audit is a table, not prose, so a test can read it:

```ts
type LoopStep = {
  readonly id: 'observe' | 'prompt' | 'interrupt' | 'answer' | 'approve' | 'read'
  readonly surface: BoundSurface
  /** The intent that carries this step, or the wheel binding id that does. */
  readonly reachedBy: { kind: 'intent'; intent: ControllerIntentKind } | { kind: 'wheel'; id: string }
}
```

A step is reachable when the surface that owns it accepts that intent, or
registers that binding id, while mounted. The test asserts reachability against
the real bindings rather than against a description of them.

## 2. Selection movement

`move-selection` and `move-horizontal` stay the same intents. What changes is
`ControllerPolicy.experimentalDpad`, which currently decides whether they are
emitted at all.

It splits in two:

- `dpadNavigation: boolean` — contract, default **true**. List movement.
- `experimentalDpad: boolean` — unchanged, for anything the PRD still treats as
  provisional.

Splitting rather than flipping keeps CTRL-R2's experiment intact while removing
its power to decide whether the product functions. The change to the PRD position
is recorded under `docs/decisions/controller-contract/`, read by the same gate
shape `002` WHEEL-T9 uses.

## 3. Answering a prompt

The ask and question cards own their selection; a binding outside them cannot
see it. So the binding moves inside: each card registers its own focus target
while mounted, accepting `move-selection` to change the highlighted option and
`confirm` to submit it.

Nothing is invented. `A` still refuses to answer when nothing is selected — the
difference is that the user can now select.

Precedence is unchanged: one card is mounted at a time, and the focus registry
already gives a newly mounted inner surface focus.

## 4. Text without a keyboard

Two paths, in this order:

1. **Dictation** — `R3`, already bound in BIND-T5, writing to the focused text
   target.
2. **Canned replies** — wheel actions registered by the agent view, each sending
   a fixed string through the existing send callback.

The reply set is experiment data under `wheel/experiments/`, carries
`contractual: false`, and is subject to the same promotion gate as any preset.
Replies are non-destructive by construction: they are text, and the agent
decides what to do with them.

## 5. Discoverability

A hint surface derived from the focus registry's active target:

```ts
type ActionHint = { readonly control: 'a' | 'b' | 'x' | 'y' | 'lb' | 'rb' | 'l2r2' | 'r3'
                  ; readonly label: string }
```

Derived, never authored: the mapping from intent to control is the PRD binding
table, which already exists as `PRD_CONTROLLER_BINDINGS`, and the label comes
from the surface. A hand-written hint table would drift from the bindings the
first time one changed, and the drift would be invisible.

Raw control names appear here, so the module lives under `controller-input/`
where CTRL-T7's ratchet permits them.

## 6. Failure behavior

| Condition | Behavior |
| --- | --- |
| No controller attached | No hints, no selection; touch unchanged |
| Dictation unavailable | Canned replies remain; `R3` stays a no-op |
| Empty option list on a prompt | `A` cancels, as today |
| A loop step's surface unmounted | The step reports unreachable, and the audit says which |
