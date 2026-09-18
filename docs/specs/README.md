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

| #   | Feature                              | Depends on         | PRD surface                                  |
| --- | ------------------------------------ | ------------------ | -------------------------------------------- |
| 000 | [Foundation](./000-foundation/)      | —                  | §6 compatibility, §7 extraction              |
| 001 | [Pairing & connection](./001-pairing/) | 000              | connection / pairing                          |
| 002 | [Projects & workspaces](./002-projects/) | 000, 001       | projects and workspaces                       |
| 003 | [Sessions](./003-sessions/)          | 000, 001, 002      | active sessions, session status and activity  |
| 004 | [Agents](./004-agents/)              | 000, 001, 003      | conversation / agent interaction, task steering and intervention |
| 005 | [Terminal](./005-terminal/)          | 000, 001, 003      | terminal/output where useful                  |
| 006 | [Dashboard](./006-dashboard/)        | 002, 003, 004, 005 | basic session/project navigation              |
| 007 | [Files](./007-files/)                | 000, 001, 002      | file tree / file inspection                   |

`007-files` is not in the `architecture.md` feature list but is required by
PRD §5 ("file tree / file inspection"). It is specified as its own feature
rather than folded into `002-projects` because it owns a distinct port
(`FileInspectionPort`) and a distinct failure surface (large files, binary
content, remote-host latency).

## Build order

```text
000-foundation
     ↓
001-pairing ──────────────┐
     ↓                    │
002-projects ─────────┬───┤
     ↓                │   │
003-sessions ──┬──────┤   │
     ↓         │      │   │
004-agents  005-terminal  007-files
     └─────────┴──────┴───┘
                ↓
          006-dashboard
```

`000-foundation` must land before any other feature: it defines the domain
types and port interfaces every other spec references.

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
