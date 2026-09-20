# 007 — Files — Technical Specification

## 1. Port

`mobile/src/gamepad/application/ports/file-inspection-port.ts`:

```ts
export type FileEntryKind = 'file' | 'directory' | 'symlink' | 'other'

export type FileEntry = {
  /** Exactly as the host spells it. Never normalised. */
  readonly path: string
  readonly name: string
  readonly kind: FileEntryKind
  readonly sizeBytes: number | null
}

export type DirectoryListing =
  | { readonly kind: 'entries'; readonly entries: readonly FileEntry[] }
  | { readonly kind: 'too-large'; readonly message: string }

export type FileContent =
  | { readonly kind: 'text'; readonly text: string; readonly language: string | null
      readonly offset: number; readonly hasMore: boolean; readonly readAt: number }
  | { readonly kind: 'binary'; readonly sizeBytes: number }
  | { readonly kind: 'too-large'; readonly sizeBytes: number; readonly message: string }

export type FileMatch = {
  readonly path: string
  readonly line: number
  readonly preview: string
}

export type SearchResults = {
  readonly matches: readonly FileMatch[]
  readonly capped: boolean
}

export type FileInspectionPort = {
  readonly readDirectory: (id: ConnectionId, workspaceId: WorkspaceId, path: string)
    => Promise<PortResult<DirectoryListing>>
  readonly readFile: (id: ConnectionId, workspaceId: WorkspaceId, path: string,
    offset: number) => Promise<PortResult<FileContent>>
  readonly searchContent: (id: ConnectionId, workspaceId: WorkspaceId, query: string,
    maxResults: number) => Promise<PortResult<SearchResults>>
  readonly searchPaths: (id: ConnectionId, workspaceId: WorkspaceId, query: string,
    maxResults: number) => Promise<PortResult<SearchResults>>
  readonly stat: (id: ConnectionId, workspaceId: WorkspaceId, path: string)
    => Promise<PortResult<FileEntry>>
}

/** The port has no mutation method. This is the enforcement point for FILE-R10. */
```

## 2. Orca mapping

| Port method     | Orca RPC | Params |
| --------------- | -------- | ------ |
| `readDirectory` | `files.readDir` | `{ worktree, relativePath }` (`FileTreePath`) |
| `readFile`      | `files.readPreview`, then `files.readChunk` for continuation | `{ worktree, relativePath }`; chunk adds `{ offset, length }` |
| `searchContent` | `files.search` | `{ worktree, query, maxResults?, caseSensitive?, wholeWord?, useRegex?, includePattern?, excludePattern? }` |
| `searchPaths`   | `files.searchPaths` | `{ worktree, query, maxResults? }` |
| `stat`          | `files.stat` | `{ worktree, relativePath }` |
| markdown preview | `files.readDocPreview` | `{ worktree, relativePath }` |

**Unmapped, deliberately** — every mutation and every side-effecting call:
`files.write`, `files.writeBase64`, `files.writeBase64Chunk`, `files.createFile`,
`files.createDir`, `files.createDirNoClobber`, `files.copy`, `files.rename`,
`files.delete`, `files.commitUpload`, `files.writeTerminalArtifact`,
`files.open`, `files.openDiff`, `files.watch`, `files.unwatch`,
`files.listAll`, `files.browseServerDir`.

FILE-AC10 is asserted by a test over the adapter's mapped method set, so a
future mutation cannot be added without the test failing.

`files.resolveTerminalPath` is mapped by `008-terminal`, not here.

### 2.1 Directory limits

The host enforces `MOBILE_FILE_DIRECTORY_MAX_ENTRIES = 10_000` and
`MOBILE_FILE_DIRECTORY_MAX_RETAINED_BYTES = 4 MiB`
(`src/shared/mobile-file-directory-limit.ts`) and fails with
`MOBILE_FILE_DIRECTORY_LIMIT_MESSAGE`. The adapter maps that specific failure to
`DirectoryListing{kind:'too-large'}` carrying the host's message verbatim
(FILE-AC2) — it is not an error to the user, it is a state.

The adapter imports that constant from `src/shared/` — it is the one layer allowed to. The feature never restates the numbers; it renders the host's message.

### 2.2 Chunked reads

`FileReadChunk` accepts `{ offset, length }` with `length ≤ 512 KiB`.

```text
first read   → files.readPreview                  → text + hasMore
continue     → files.readChunk { offset, length }  → text + hasMore
```

The controller's chunk size is 128 KiB — well under the wire cap, chosen so a
chunk renders in one frame budget on the slowest supported device. Offsets are
byte offsets supplied by the host; the client does not compute them from
character counts.

### 2.3 Binary and oversized

`files.readPreview` reports content kind. The adapter maps:

```text
host says binary        → FileContent{kind:'binary', sizeBytes}
host refuses on size    → FileContent{kind:'too-large', sizeBytes, message}
otherwise               → FileContent{kind:'text', …}
```

The client never sniffs binary content itself — a UTF-8 replacement character
is not evidence, and guessing produces FILE-AC4 failures.

### 2.4 Paths

`relativePath` is passed through exactly as received from the host (a tree
entry, a diff row, a terminal path resolution). The controller layer contains
no `path.join`, no separator replacement, and no `startsWith('/')` check
(`AGENTS.md`, Cross-Platform Support). A test asserts the feature tree imports
no path module and contains no separator literal in path handling.

## 3. Feature structure

```text
mobile/src/gamepad/features/files/
├── screens/
│   ├── FileTreeScreen.tsx
│   ├── FilePreviewScreen.tsx
│   └── FileSearchScreen.tsx
├── components/
│   ├── FileTreeRow.tsx
│   ├── FileSourceView.tsx
│   ├── MarkdownPreview.tsx
│   ├── BinaryFileNotice.tsx
│   └── DirectoryTooLargeNotice.tsx
├── hooks/
│   ├── use-directory-listing.ts
│   └── use-file-content.ts
└── state/
    └── file-navigation-history.ts
```

Reuse from today's tree: `mobile/src/files/file-tree.ts`,
`mobile-file-explorer-row.tsx`, `MobileFilePreviewScreen.tsx`,
`MobileFileMarkdownPreview.tsx`, `mobile-file-preview-syntax.ts`,
`mobile-file-language.ts`, `directory-load-revisions.ts`,
`file-list-fallback.ts`, `mobile-file-preview-line-column.ts`. Migrate; do not
fork. Drop the editable-source path (`MobileFilePreviewEditableSource.tsx`) —
read-only MVP.

## 4. Caching and staleness

- A directory listing is cached per `(connectionId, workspaceId, path)` and
  invalidated on workspace refresh or explicit pull-to-refresh.
- File content is cached per `(connectionId, workspaceId, path, offset)` with a
  read timestamp, surfaced as "read at HH:MM" (FILE-R11).
- With the connection down, cached content stays readable and labelled stale;
  an uncached read reports that it cannot be read (FILE-AC9).
- Cache is memory-only and bounded; it is dropped on unpair with the rest of the
  connection's remote state.

## 5. Entry points

| Source | Carries | Lands on |
| ------ | ------- | -------- |
| `007` diff row | workspace, path | `FilePreviewScreen`, back to the conversation |
| `008` path tap | workspace, host-resolved path | `FilePreviewScreen`, back to the terminal |
| Tree | workspace, path | `FilePreviewScreen`, back to the tree at the same directory |
| Search result | workspace, path, line | `FilePreviewScreen` scrolled to the line |

`file-navigation-history.ts` records the origin so back always returns to it
(FILE-AC7). Origin is part of the route params, not a global.

## 6. Failure modes

| Condition | Behaviour |
| --------- | --------- |
| Directory over limit | `too-large` state with the host's message; offer search instead |
| File over the read budget | `too-large` state with the size |
| Binary file | binary notice with size |
| Path no longer exists | "this file is no longer here", with a way back to the tree |
| Connection down, cached | render with stale label |
| Connection down, uncached | "cannot read while disconnected" |
| Search unsupported | hide search entry points; no error |

## 7. Testing

| Test | Proves |
| ---- | ------ |
| `file-mutation-absence.test.ts` | FILE-AC10 — the adapter maps no mutating `files.*` method |
| `directory-listing-limit.test.ts` | §2.1 (FILE-AC2) |
| `file-chunked-read.test.ts` | §2.2 (FILE-AC3) |
| `binary-file-handling.test.ts` | §2.3 (FILE-AC4) |
| `host-path-passthrough.test.ts` | §2.4 (FILE-AC8), incl. a Windows-shaped fixture |
| `file-search-cap.test.ts` | FILE-AC6 |
| `file-navigation-origin.test.ts` | FILE-AC7 |
| `file-staleness.test.ts` | FILE-AC9, FILE-R11 |
