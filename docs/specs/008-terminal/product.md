# 005 — Terminal & Activity

## Purpose

Show what a process is actually printing, and let the user type into it when
that is the fastest way to intervene. PRD §5: "terminal/output where useful".

## Product principle applied

*Information over simulation.* "Where useful" is the operative phrase. The
controller does not try to be a terminal emulator you would choose to work in.
It is the place you read what went wrong and send `y`, `Ctrl-C`, or a short
command.

That framing sets the priorities: readable output on a small screen and fast,
reliable control keys outrank fidelity of a full TUI experience.

## Scope

**In scope**

- Live output for a terminal session, with scrollback.
- A snapshot on attach, so the screen is correct before the first new byte.
- Input: text, Enter, and control keys (`Ctrl-C`, `Ctrl-D`, arrows, Tab, Esc).
- An accessory key row sized for a phone, labelled for the *host's* platform.
- Viewport sizing that does not disturb the desktop's view of the same
  terminal.
- Quick commands: a small set of one-tap commands.
- Read-only mode when the host does not grant write.
- Tapping a file path in output to open it in `010-files`.

**Out of scope for MVP**

- Pane splits, layout editing, or multiplexing (`terminal.split`,
  `terminal.multiplex`).
- Creating terminals — that is `006-sessions`.
- Terminal themes and appearance settings beyond honouring the host's theme.
- Orphan adoption and process inspection (`terminal.adoptOrphans`,
  `terminal.inspectProcess`).
- Dictation into the terminal (exists today; not a controller requirement).

## Requirements

### TERM-R1 — Snapshot then stream

On attach the user sees the current screen before any new output arrives. The
snapshot arrives as its own framed sequence and is applied atomically.

### TERM-R2 — Live output

Output appears with no user action. Throughput is bounded so a runaway process
cannot lock the UI; when output is dropped for backpressure, the user is told
that output was elided rather than shown a silently incomplete screen.

### TERM-R3 — Input

The user can send text and control keys. Input is disabled, with a stated
reason, when the host reports write is unavailable, when the connection is
down, or when the session is not `live`.

### TERM-R4 — Control keys are first-class

An accessory row above the keyboard gives at minimum: `Esc`, `Tab`, `Ctrl`,
arrows, and a repeat-capable interrupt. These are reachable one-handed.

### TERM-R5 — Host-platform labelling

Key labels follow the **host's** platform, not the phone's. A terminal running
on a Windows host shows `Ctrl`; one on macOS shows `⌘`/`⌃` where that is what
the process expects. The host platform comes from the workspace payload, never
inferred from the phone.

### TERM-R6 — Viewport negotiation

Resizing for the phone must not resize the desktop's view of the same terminal.
The client uses the mobile-fit resize mode and can restore the host's own
sizing on detach.

### TERM-R7 — Capability negotiation

The client advertises the stream capabilities it supports in the subscribe
handshake and uses only those the host echoes back. No opcode is sent before
its capability is confirmed.

### TERM-R8 — No new opcodes

This fork introduces no new terminal stream opcode. An unknown opcode is
dropped silently by the decoder, so an un-negotiated addition would hang the
feature rather than fail
([`../../reference/remote-wire-compatibility.md`](../../reference/remote-wire-compatibility.md)).

### TERM-R9 — Scrollback is bounded and honest

Scrollback is capped. When the cap is reached, the oldest content is dropped
and the top of the buffer says so.

### TERM-R10 — File paths are actionable

A path in output can be tapped to open the file in `010-files`. Resolution is
done by the host (`files.resolveTerminalPath`), not by client-side guessing.

### TERM-R11 — Quick commands

A small, editable set of one-tap commands. Sending one is a normal input, and
is visible in the terminal like any typed command.

### TERM-R12 — Detach cleanly

Leaving the screen unsubscribes, releases any viewport claim, and does not
leave the host streaming to a screen nobody is watching.

## Acceptance criteria

- **TERM-AC1** — Attaching to a terminal with an existing screen shows that
  screen before any new output, with no visible redraw from blank.
- **TERM-AC2** — A process printing continuously keeps the UI responsive;
  interaction latency stays within the app's normal budget.
- **TERM-AC3** — `Ctrl-C` interrupts a running process from the accessory row.
- **TERM-AC4** — Attaching from the phone does not change the desktop's
  rendering of the same terminal.
- **TERM-AC5** — A host that does not echo `terminalBinaryStream` still
  produces a working read-only view via `terminal.read`.
- **TERM-AC6** — A host reporting write-unavailable disables input with the
  host's reason shown.
- **TERM-AC7** — Key labels for a Windows-host terminal read `Ctrl`, on an
  iOS phone, in the same build that shows `⌃` for a macOS host.
- **TERM-AC8** — Leaving the screen stops the subscription; verified by the
  host no longer having a mobile subscriber.
- **TERM-AC9** — Killing the connection mid-stream shows "connection lost,
  output may be incomplete" and the session reads `unverifiable` — never
  "process exited".
- **TERM-AC10** — Tapping a path opens the right file; an unresolvable path
  shows that it could not be resolved rather than opening the wrong file.
- **TERM-AC11** — Rotating the device re-fits without losing scroll position or
  the buffer.

## Non-goals

- Being a daily-driver terminal.
- Matching desktop rendering pixel for pixel.
