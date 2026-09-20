# 003 — Dictation

## Purpose

Give `R3` something to toggle, and make dictated text land wherever the
controller is pointed.

A gamepad has no keyboard. [`../../PRD.md`](../../PRD.md) §5 lists
"voice/dictation input" as part of the information surface and §4 spends a whole
button on it, which is the strongest signal in the mapping: on a handheld,
speech is not a convenience, it is the text input.

## Problem

Dictation already exists in Orca Mobile, and it is host-side — `startMobileDictation`
runs speech on the paired machine, not on the phone, and
`terminal-live-dictation-routing.ts` places the result into terminal live input.
Two things are missing.

First, it is reachable only by tapping a microphone. Second, it is wired to one
destination. A controller user needs it on a button, and needs the text to go
wherever they are — a terminal, an agent composer, a search field — without
choosing a destination first.

There is also a contradiction to clear: the previous spec set listed dictation
as explicitly out of scope ("not a controller requirement"). The new PRD gives it
a button. This feature is that reversal.

## Scope

**In scope**

- A `DictationPort` over the existing `speech.*` host surface.
- `R3` toggling dictation on and off.
- Routing the transcript to the focused pane's text target.
- Setup and unavailability as first-class states: a host with dictation disabled,
  with no model selected, or too old to have the methods at all.
- A visible listening indicator — a mic that is on and invisible is a privacy
  problem, not a UX one.

**Out of scope**

- On-device speech recognition. Dictation is a host capability; the phone
  supplies audio and a trigger.
- Model management. `voice-settings-screen.tsx` already does this and keeps
  doing it.
- Voice commands. This is transcription into a text target, not a second control
  surface competing with §4.
- Dictating into a pane that has no text target.

## Requirements

### DICT-R1 — Dictation is a host capability behind a port

Everything Orca-specific — `speech.models.list`, `startMobileDictation`, the
setup error codes — lives behind `DictationPort` in the adapter. The controller
binding, the routing rule and the listening state are platform- and
host-agnostic, and survive extraction.

### DICT-R2 — `R3` toggles, and the target is resolved from focus

Pressing `R3` starts dictation against the focused pane's text target. Pressing
it again stops. The user never selects a destination; the destination is wherever
they already are.

If the focused pane has no text target, `R3` is a no-op with a brief notice —
not an error, and not a silent nothing, because a button that sometimes does
nothing invisibly reads as a broken button.

### DICT-R3 — Setup-required is a state, not a failure

A host with dictation disabled, or with no model selected, is correctly
configured hardware that needs one setting changed. It surfaces as an actionable
state that opens the existing voice settings, never as an error toast.

The upstream mapping already distinguishes `voice_dictation_disabled` and
`voice_model_not_selected` from real failures. That distinction is preserved,
not re-derived.

### DICT-R4 — A host that predates dictation is `unavailable`, not broken

An older host answers `speech.models.list` with `method_not_found`. That is the
foundation's `unavailable` capability: `R3` is inert and the indicator says the
host cannot do this, with the existing upgrade guidance. It is never reported as
a dictation failure.

### DICT-R5 — Listening is always visible

While the microphone is live there is an unambiguous indicator, and it is visible
from every pane — not only the one receiving text. Stopping is always one `R3`
away, including while a wheel is open.

### DICT-R6 — Losing the connection stops dictation

Dictation runs on the host. If the connection drops, the session is over: the
indicator clears and partial text already delivered stays. The controller never
shows a live mic against a host that cannot hear it.

## Acceptance criteria

- **DICT-AC1** — Searching `src/gamepad/` outside `adapters/orca/` for
  `speech.`, `startMobileDictation`, or either setup error code returns no hits.
- **DICT-AC2** — `R3` with a focused pane that has a text target starts
  dictation; `R3` again stops it; a third press starts a new session.
- **DICT-AC3** — `R3` with no text target in focus changes no state and shows a
  notice.
- **DICT-AC4** — A host reporting `voice_dictation_disabled` or
  `voice_model_not_selected` produces an actionable setup state that opens voice
  settings, and no error surface.
- **DICT-AC5** — A host answering `method_not_found` produces capability
  `unavailable`; `R3` is inert and no request is sent.
- **DICT-AC6** — The listening indicator is present in every pane while active,
  including with a wheel open.
- **DICT-AC7** — A disconnect during dictation clears the indicator within one
  second and retains text already delivered.

## Non-goals

- Punctuation commands, formatting commands, or an editing grammar.
- Choosing between hosts when several are paired — dictation follows the focused
  session's connection.
- Offline dictation.
