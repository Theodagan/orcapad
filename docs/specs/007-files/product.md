# 007 — Files

## Purpose

Let the user see what the agent actually changed, and read the file it is
talking about. PRD §5: "file tree / file inspection", and §2: "Keep the actual
project files and file tree accessible where useful".

## Product principle applied

*Information over simulation.* This is inspection, not editing. A phone is a
good place to read a 40-line diff and a bad place to refactor. The MVP is
read-only by design, and says so rather than offering an edit affordance that
disappoints.

## Scope

**In scope**

- Browse the file tree of a workspace.
- Read a file, with syntax highlighting where the app already supports it.
- Preview markdown.
- Read a large file in bounded chunks.
- Search files by content and by path.
- Open a file from: a diff in `004`, a path tapped in `005`, or the tree.
- Binary and oversized files are refused gracefully with a reason.

**Out of scope for MVP**

- Editing, creating, renaming, deleting, or uploading files. Every
  `files.*` mutation method is unmapped.
- Git operations of any kind.
- Diff review with comment threads — the existing review screens stay as they
  are until a controller-specific design exists.
- Watching a file for changes (`files.watch`) — deferred; the MVP re-reads on
  demand.

Read-only is a deliberate MVP boundary, not an oversight: a mistaken write from
a phone into an agent's working tree is expensive to notice and expensive to
undo.

## Requirements

### FILE-R1 — Tree browsing

The user can browse a workspace's directory tree, one level at a time, with
directories and files distinguished and sorted directories-first.

### FILE-R2 — Large directories fail safely

A directory beyond the mobile listing limits is refused with the host's message
rather than being partially rendered or hanging the screen. The user is told the
limit.

### FILE-R3 — File reading

Opening a file shows its content with line numbers, horizontal scrolling for
long lines, and syntax highlighting for supported languages.

### FILE-R4 — Chunked reads

A file larger than the single-read budget is read in bounded chunks, with the
user able to continue loading. The screen never blocks on a whole-file read.

### FILE-R5 — Binary and unsupported content

A binary file is not rendered as text. The user is told the file is binary and
given its size.

### FILE-R6 — Markdown preview

Markdown files can be previewed as rendered markdown, with a toggle to source.

### FILE-R7 — Search

Content search and path search over a workspace, with a bounded result count and
an explicit indication when results were capped.

### FILE-R8 — Entry points

A file opens with the right context from: a diff row in `004`, a tapped path in
`005`, a search result, and the tree. Returning goes back to where the user came
from.

### FILE-R9 — Paths are host-shaped

Paths are rendered as the host reports them. The client does not normalise
separators, does not join paths, and does not assume POSIX. A Windows host's
`src\renderer\main.ts` renders as the host spells it.

### FILE-R10 — Read-only is explicit

There is no edit affordance. Where the user might expect one (a file opened
from a diff), the surface states that the controller is read-only.

### FILE-R11 — Staleness

File content is a point-in-time read, labelled with when it was read. It is not
presented as live.

## Acceptance criteria

- **FILE-AC1** — Browsing a repository root lists entries with directories
  first and no client-side path manipulation.
- **FILE-AC2** — A directory exceeding 10,000 entries or a 4 MB listing shows
  the host's limit message and does not render a partial list.
- **FILE-AC3** — A 5 MB text file opens to its first chunk within the app's
  normal budget and loads further chunks on demand.
- **FILE-AC4** — A binary file shows the binary notice and its size, and never
  renders replacement characters as content.
- **FILE-AC5** — A markdown file toggles between rendered and source without a
  re-fetch.
- **FILE-AC6** — Content search caps at the requested maximum and says the
  results were capped.
- **FILE-AC7** — Opening a file from a `004` diff row lands on the right file
  and returns to the conversation.
- **FILE-AC8** — A path from a Windows host renders with backslashes and opens
  correctly.
- **FILE-AC9** — With the connection down, a previously read file stays
  readable and is labelled stale; opening a new file reports that it cannot be
  read.
- **FILE-AC10** — No screen in this feature can produce a `files.*` mutation.
  Asserted by a test over the adapter's mapped method set.

## Non-goals

- A mobile code editor.
- Offline sync of a repository.
