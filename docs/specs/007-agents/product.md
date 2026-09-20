# 004 — Agents

## Purpose

The controller's core job: watch what an agent is doing and intervene when it
needs you. PRD §5: "agent transcript", "prompts and responses", and
"agent/tool activity and state". §4 gives interruption its own button: `X`
stops the focused session's in-flight turn or tool call.

This is where "controller first" earns its keep. The phone is not a good place
to write a 300-line prompt; it is an excellent place to answer "may I run
this?" while away from the desk.

## PRD constraint applied

*Not a full mobile IDE (PRD §5).* The agent surface shows what happened and what
is being asked, at a density a phone can carry. It does not reproduce the
desktop chat pane.

Concretely, that means the intervention affordances (approve, answer, stop)
outrank the transcript in visual priority, and the transcript is summarised by
default with full detail on demand.

## Scope

**In scope**

- Read the conversation for an agent session: user messages, assistant
  messages, tool calls with their state, and file diffs.
- Live updates while a turn runs.
- History paging backwards through a long transcript.
- Intervention: approve or deny a permission request, answer a question, pick
  an option.
- Steering: send a message, cancel a running turn, stop a background task.
- Session options: read and change the model and other provider options.
- Slash commands the provider exposes.
- Subagent / background-task visibility.
- Unconfirmed-send handling: a message whose delivery is not yet acknowledged
  is shown as such.

**Out of scope for MVP**

- Rewind (`agentSession.rewind`) — destructive, needs a designed confirmation
  flow.
- Handoff between TUI and native chat (`agentSession.requestHandoff`,
  `handoffStatus`, `hold`, `release`).
- Creating an agent session from the phone (`agentSession.create`,
  `ensure`) — `006` creates terminal sessions only.
- Image attachments in outbound messages. The wire supports `image-ref`; the
  controller MVP sends text only.
- Editing a previously sent message.

## Controller surface

Operated entirely through `001`'s intents; this feature owns no input of its own
and never reads the controller port. Wheel segments are contributed to `002`'s
registry with an `availability`, so the ring's shape stays stable.

| Pane | Accepts | Notes |
| ---- | ------- | ----- |
| Transcript | `scroll`, `move-selection` | selection moves between turns, not lines |
| Composer | text target | the primary dictation destination |
| Intervention card | `confirm`, `back` | `A` approves, `B` rejects — no wheel needed for the common case |

`X` maps to this feature's `cancelTurn`. It is the only destructive action on a
plain button, which is deliberate: interrupting a runaway agent must not require
a wheel, a chord, or navigating to the right pane first.

Wheel segments: retry, rewind, cancel background task, session options.

An intervention answered with `A`/`B` never also runs a wheel segment — the
buttons are the fast path and the wheel is the long one.

## Requirements

### AG-R1 — Transcript

Render the journal for a session: user and assistant messages, tool calls with
`running` / `completed` / `failed`, and diffs with path and line counts. Items
are ordered by the host's journal order, never re-sorted by the client.

### AG-R2 — Live turn

While a turn runs, the surface shows: that it is running, elapsed time anchored
on the host clock, the current tool, and new items as they arrive. No spinner
that lies — if the host stops reporting, the surface says the state is unknown.

### AG-R3 — Convergent updates

The client applies journal batches idempotently: applying the same batch twice
converges rather than duplicating. Item removals are applied as tombstones.

### AG-R4 — Reset is a reseed, not an error

When the host reports a journal reset, the client discards its local journal
for that session and reseeds from the page the reset carries. The user sees a
brief, non-alarming notice; the transcript does not appear to break.

### AG-R5 — Intervention is the primary affordance

A pending approval or question is surfaced:

- at the top of the session view, above the transcript;
- in the session list (`006`) as `needs-input`;
- in the dashboard (`009`) as an attention item;
- through a push notification (`009`).

Answering is one tap per option, with the default option visually distinct.

### AG-R6 — Compare-and-set answers

Answering carries the revision the user saw. If the item changed underneath —
answered on the desktop, cancelled, superseded — the answer is rejected and the
user is told what happened rather than the answer landing on a different
question.

### AG-R7 — Exactly-once mutations

Every mutation carries a client operation id and a payload fingerprint. A retry
replays the same operation id, so the host replays its recorded outcome instead
of applying a second effect. The client never auto-retries with a fresh
operation id.

### AG-R8 — Ambiguous delivery is visible

A send whose reply never arrives is shown as "may not have been delivered",
with an explicit retry that reuses the original operation id. It is never shown
as delivered, and never silently dropped.

### AG-R9 — Cancel

The user can cancel a running turn, and separately cancel a single background
task. Cancel is not confirmed (it is the safe direction) but its outcome is
reported.

### AG-R10 — Options and commands

The user can see and change the provider model and other session options, and
see the provider's slash commands. Options a host does not report are absent,
not shown as empty.

### AG-R11 — Background tasks

Provider-owned background tasks (subagents) are listed with their state and can
be cancelled individually.

### AG-R12 — Paging

Scrolling back loads older pages; the client asks for a bounded page and never
requests an unbounded transcript. Attaching mid-session starts from the tail and
can switch to live without a second full read.

### AG-R13 — Composer drafts survive

A typed but unsent message survives navigation, backgrounding, and disconnect.
It is local UI state.

### AG-R14 — Message size limits are enforced client-side

The composer enforces the wire limits before sending and tells the user which
limit was hit.

## Acceptance criteria

- **AG-AC1** — Attaching to a session with 5,000 journal items renders the tail
  within the app's normal screen budget and pages backwards on scroll.
- **AG-AC2** — Applying the same journal batch twice produces an identical
  transcript. Asserted by a reducer test.
- **AG-AC3** — A `reset` frame replaces the transcript and shows the reset
  notice; no duplicate or interleaved items remain.
- **AG-AC4** — A pending approval appears above the transcript, in the session
  list as `needs-input`, and on the dashboard, from one host event.
- **AG-AC5** — Answering an item that was already answered elsewhere shows
  "already answered" and does not send a second effect.
- **AG-AC6** — Retrying an ambiguous send reuses the original client operation
  id; the host records one message. Asserted against a scripted transport that
  drops the first reply.
- **AG-AC7** — Cancelling a turn stops it, and the transcript shows the turn as
  cancelled rather than completed.
- **AG-AC8** — Cancelling one background task leaves the others running.
- **AG-AC9** — A draft survives kill-and-relaunch of the app.
- **AG-AC10** — A message over the byte limit is refused in the composer with
  the limit named, before any request is sent.
- **AG-AC11** — With the connection down, the transcript stays readable, the
  composer is disabled with a reason, and the turn state reads unknown — not
  finished.
- **AG-AC12** — A host that does not support `agentSession.commands` shows no
  command affordance and no error.

## Non-goals

- Authoring long prompts on the phone.
- Diff review and comment threads (the existing review screens stay where they
  are until a controller-specific design exists).
