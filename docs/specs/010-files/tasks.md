# 007 — Files — Tasks

- [ ] **FILE-T1 — Port**

  `file-inspection-port.ts` per `tech.md` §1. No mutation method.

  **Verify:** `pnpm typecheck`

- [ ] **FILE-T2 — Read operations**

  `src/gamepad/adapters/orca/rpc/file-read-operations.ts` covering `files.readDir`,
  `files.readPreview`, `files.readChunk`, `files.readDocPreview`, `files.stat`,
  `files.search`, `files.searchPaths`.

  **Verify:** `pnpm test src/gamepad/adapters/orca/rpc/file-read-operations.test.ts`

- [ ] **FILE-T3 — Mutation-absence guard**

  `src/gamepad/adapters/orca/file-mutation-absence.test.ts` asserting the adapter's
  mapped method set contains no mutating `files.*` method.

  **Verify:** `pnpm test …/file-mutation-absence.test.ts` (FILE-AC10)

- [ ] **FILE-T4 — Directory listing with limits**

  `src/gamepad/adapters/orca/mapping/directory-listing-mapping.ts` mapping the host's
  limit failure to `too-large` using the shared constant.

  **Verify:** `pnpm test …/directory-listing-limit.test.ts` (FILE-AC2)

- [ ] **FILE-T5 — Chunked file content**

  `src/gamepad/adapters/orca/mapping/file-content-mapping.ts` with the 128 KiB chunk
  policy and host-supplied offsets.

  **Verify:** `pnpm test …/file-chunked-read.test.ts` (FILE-AC3)

- [ ] **FILE-T6 — Binary and oversized**

  Host-reported classification only; no client-side sniffing.

  **Verify:** `pnpm test …/binary-file-handling.test.ts` (FILE-AC4)

- [ ] **FILE-T7 — Path passthrough guard**

  `host-path-passthrough.test.ts` plus a layering-test rule rejecting `path`
  imports and separator literals in `src/gamepad/features/files/`.

  **Verify:** `pnpm test …/host-path-passthrough.test.ts` (FILE-AC8)

- [ ] **FILE-T8 — Tree screen**

  `FileTreeScreen`, `FileTreeRow`, `DirectoryTooLargeNotice`, migrating
  `mobile/src/files/file-tree.ts` and `mobile-file-explorer-row.tsx`.

  **Verify:** `pnpm run check:code-quality:changed`;
  `pnpm test src/gamepad/features/files` (FILE-AC1)

- [ ] **FILE-T9 — Preview screen**

  `FilePreviewScreen`, `FileSourceView`, `MarkdownPreview`, `BinaryFileNotice`,
  migrating the existing preview modules and dropping the editable-source path.

  **Verify:** `pnpm test src/gamepad/features/files/screens` (FILE-AC5)

- [ ] **FILE-T10 — Search screen**

  `FileSearchScreen` over content and path search, with the capped-results
  indicator.

  **Verify:** `pnpm test …/file-search-cap.test.ts` (FILE-AC6)

- [ ] **FILE-T11 — Entry points and back behaviour**

  `file-navigation-history.ts`, origin carried in route params, wired from `007`,
  `008`, tree, and search.

  **Verify:** `pnpm test …/file-navigation-origin.test.ts` (FILE-AC7)

- [ ] **FILE-T12 — Caching and staleness**

  Per-path cache with read timestamps, stale labelling, eviction on unpair.

  **Verify:** `pnpm test …/file-staleness.test.ts` (FILE-AC9)
