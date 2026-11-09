# CF03 — Fork update source and download

**Goal:** Check the fork's own GitHub releases, download and verify an APK, and stop Orca's screens from offering upstream's APK.

|               |                                                                                 |
| ------------- | ------------------------------------------------------------------------------- |
| Dispatch when | CF01 merged                                                                     |
| Branch        | `deck/cf03-updates-core` from `main`                                            |
| PR            | `Theodagan/orcapad` `main`, title `deck(CF03): Fork update source and download` |
| Tasks         | T17, T19, T22 (in this order)                                                   |

Read [`README.md`](./README.md) first: it holds the rules every cloud worker follows.

## Feature done when

- Every task below meets its _Done when_ (cloud bar), with an entry in `mobile/src/deck/HANDOFF-LOG.md`.
- `pnpm typecheck`, `pnpm test`, `pnpm lint` in `mobile/` add no failures to the recorded baseline; `deck-boundary.test.ts` passes once it exists.
- The PR description lists: tasks done, tasks skipped and why, files touched outside `mobile/src/deck/` and `mobile/app/deck/` (also in `UPSTREAM-TOUCHES.md`), and what the owner should try on the device.

## Requirements cited

From the PRD (not in the repo). Rule IDs such as `PAD-6` are in `Theodagan/Pocketdeck` `docs/ux/ux-rules.md`.

- **DECK-R47** The update check reads only the fork's releases. Settings shows the installed and
  latest versions and an **Update** button; a new version is also announced (non-blocking) on
  launch.

## Tasks

### T17 — Fork release update source

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/updates/fork-release-update-source.ts` (create, + test with fixtures)
- **Change:** Implements the existing `AppUpdateSource` interface (`app-update/app-update-source.ts`) against the fork repo and tag prefix; returns version, APK asset URL, size and `digest` (sha256) when GitHub provides it. Reuse `parseMobileAndroidTagVersions`-style parsing; do not edit upstream's source (DECK-R47).
- **Depends on:** T6 (the fork repo and tag prefix are one exported constant; set its final value when D3 is made, before T16 runs)
- **Done when:** tests cover newer version found, no newer version, tag without APK, rate-limited reply (error surfaced), never contacting `stablyai/orca`.

### T19 — Download and verify the update

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/updates/download-update.ts` (create, + test)
- **Change:** `expo-file-system` resumable download to the cache dir with progress callback; verify size and sha256 (`expo-crypto`) against T17's digest; delete on mismatch.
- **Depends on:** T17
- **Done when:** tests (mocked FS) cover progress, success, digest mismatch → error and file removed, cancel.

### T22 — Point Orca's update runtime at the fork source

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/app-update/app-update-runtime.ts` (edit)
- **Change:** Use the fork source from T17 so Orca's own screens (version strip, Settings rows) never offer upstream's APK. Log the touch.
- **Depends on:** T17
- **Done when:** `pnpm test src/app-update` passes with a test asserting the configured source repo is the fork.
