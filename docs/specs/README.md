# Orca Controller — Specification Index

Detailed specifications derived from [`../PRD.md`](../PRD.md) and
[`../architecture.md`](../architecture.md).

## How to read these

Each feature directory holds the three SDD artifacts:

| File        | Answers                                                                       |
| ----------- | ----------------------------------------------------------------------------- |
| `product.md` | What the feature does, for whom, and how we know it works (requirements + acceptance criteria) |
| `tech.md`    | Domain types, application ports, the Orca RPC calls the adapter maps them to, state, failure modes, tests |
| `tasks.md`   | Ordered, individually shippable checkpoints with file paths and verification commands |

Requirement IDs are stable: `<FEATURE>-R<n>` for requirements, `<FEATURE>-AC<n>`
for acceptance criteria, `<FEATURE>-T<n>` for tasks. Reference them in commits
and PRs.

## Features

| #   | Feature                                    | Depends on              | PRD surface                                  |
| --- | ------------------------------------------ | ----------------------- | -------------------------------------------- |
| 000 | [Foundation](./000-foundation/)            | —                       | §6 Orca relationship, §9 extraction          |
| 001 | [Controller input](./001-controller-input/) | 000                    | §3 controller-first, §4 controller mapping    |
| 002 | [Context wheel](./002-context-wheel/)      | 000, 001                | §3 Context Wheel                              |
| 003 | [Dictation](./003-dictation/)              | 000, 001                | §4 R3, §5 voice/dictation input               |
| 004 | [Pairing & connection](./004-pairing/)     | 000                     | §6 Orca relationship                          |
| 005 | [Projects & workspaces](./005-projects/)   | 000, 004                | §5 project/worktree context                   |
| 006 | [Sessions](./006-sessions/)                | 000, 004, 005           | §4 LB/RB tabs, §5 tabs/sessions               |
| 007 | [Agents](./007-agents/)                    | 000, 004, 006           | §4 X stop, §5 transcript, prompts, activity   |
| 008 | [Terminal](./008-terminal/)                | 000, 004, 006           | §5 terminal/output                            |
| 009 | [Dashboard](./009-dashboard/)              | 005, 006, 007, 008      | §5 project/worktree context                   |
| 010 | [Files](./010-files/)                      | 000, 004, 005           | §5 file tree, files/code, diffs               |

`001`–`003` own the interaction model. They come before every product feature
because §7 makes controller interaction "a first-class design constraint, not an
input accessory" — a feature surface cannot be specified before the model that
navigates it exists.

`010-files` is not in the `architecture.md` feature list but is required by
PRD §5 ("actual file tree", "actual files/code", "diffs where relevant"). It is
specified as its own feature rather than folded into `005-projects` because it
owns a distinct port (`FileInspectionPort`) and a distinct failure surface
(large files, binary content, remote-host latency).

## Build order

```text
000-foundation
     ↓
001-controller-input
     ↓
002-context-wheel ── 003-dictation
     ↓
004-pairing ──────────────┐
     ↓                    │
005-projects ─────────┬───┤
     ↓                │   │
006-sessions ──┬──────┤   │
     ↓         │      │   │
007-agents  008-terminal  010-files
     └─────────┴──────┴───┘
                ↓
          009-dashboard
```

`000-foundation` must land before any other feature: it defines the domain
types and port interfaces every other spec references. `001-controller-input`
must land before every product feature: it defines the focus model and the §4
mapping those features are operated through.

## Conventions these specs inherit

From [`../../AGENTS.md`](../../AGENTS.md) and [`../STYLEGUIDE.md`](../STYLEGUIDE.md):

- **One subtree.** The fork lives entirely under `mobile/src/gamepad/`.
  `src/gamepad/**` imports nothing outside itself except through
  `src/gamepad/adapters/**`, which reaches the upstream roots named in
  `ADAPTER_UPSTREAM_REACH` (`mobile/src/gamepad/gamepad-boundary.test.ts`).
  Everything else under `mobile/src/` is upstream Orca Mobile.
- **Reuse before reimplementing.** The Orca adapter wraps the existing
  `mobile/src/transport/` stack. It does not reimplement the RPC client,
  the relay client, pairing crypto, or the terminal binary stream.
- **No vague module names.** No `utils`, `helpers`, `common`, `misc`,
  `shared-stuff` files or folders. Name modules after the concept they hold.
- **No `max-lines` suppressions.** Split the module instead.
- **`.ts` over `.d.ts`**; no type assertions except `as const`, and an
  unavoidable cast carries a line-specific `SAFETY:` comment.
- **Cross-platform.** iOS and Android, and hosts on macOS, Linux, and Windows.
  No hardcoded path separators, no assumption of a POSIX host.
- **SSH / remote execution.** The execution host owns execution state. Loss of
  contact is never evidence of process death; the verdict vocabulary is
  `live` / `unverifiable` / `exited`.
- **Folder workspaces.** Not every workspace is a git worktree.
- **Wire compatibility.** See
  [`../reference/remote-wire-compatibility.md`](../reference/remote-wire-compatibility.md).
  A new optional JSON field is safe; a new stream opcode must be negotiated.
