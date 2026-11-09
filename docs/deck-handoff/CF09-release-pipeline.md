# CF09 — Fork release pipeline

**Goal:** Required signing secrets and releases published to the fork. Workflow and script edits only.

|               |                                                                       |
| ------------- | --------------------------------------------------------------------- |
| Dispatch when | CF01 merged                                                           |
| Branch        | `deck/cf09-release-pipeline` from `main`                              |
| PR            | `Theodagan/orcapad` `main`, title `deck(CF09): Fork release pipeline` |
| Tasks         | T15, T16 (in this order)                                              |

Read [`README.md`](./README.md) first: it holds the rules every cloud worker follows.

## Feature done when

- Every task below meets its _Done when_ (cloud bar), with an entry in `mobile/src/deck/HANDOFF-LOG.md`.
- `pnpm typecheck`, `pnpm test`, `pnpm lint` in `mobile/` add no failures to the recorded baseline; `deck-boundary.test.ts` passes once it exists.
- The PR description lists: tasks done, tasks skipped and why, files touched outside `mobile/src/deck/` and `mobile/app/deck/` (also in `UPSTREAM-TOUCHES.md`), and what the owner should try on the device.

## Requirements cited

From the PRD (not in the repo). Rule IDs such as `PAD-6` are in `Theodagan/Pocketdeck` `docs/ux/ux-rules.md`.

- **DECK-R45** One release signing key, stored outside the repo and in CI secrets, kept for the life
  of the app. Losing it forces every user to uninstall and reinstall. Release builds fail when it is
  missing; they never fall back to a debug key.
- **DECK-R46** CI publishes signed APKs to `Theodagan/orcapad` GitHub Releases under the fork's own
  tag prefix, from the existing `mobile-android-release.yml`.

## Tasks

### T15 — Require the fork's release signing key in CI

- **Scope:** cloud: code and tests.
- **Split:** Your part: the workflow and signing-script edits, failing loudly without secrets. The owner creates the key and secrets later. Never create or commit a key.
- **Files:** `.github/workflows/mobile-android-release.yml` (edit), `mobile/src/mobile-release/` (edit the signing plugin/script the workflow uses)
- **Change:** Read keystore, alias and passwords from fork secrets; fail the job when any is missing; never fall back to the debug key (DECK-R45). Document the off-repo backup location in `mobile/src/deck/RELEASING.md` (create).
- **Depends on:** T14
- **Done when:** a dispatch run without secrets fails at the signing step; with secrets, `apksigner verify --print-certs` on the artifact shows the fork certificate.

### T16 — Publish releases to the fork under its own tag prefix

- **Scope:** cloud: code and tests.
- **Split:** Your part: the workflow edits. The owner runs `workflow_dispatch` later.
- **Files:** `.github/workflows/mobile-android-release.yml` (edit)
- **Change:** Tag prefix from D3; release created on `Theodagan/orcapad`; remove or guard the job that checks out `stablyai/orca-marketing-website` (line ~274), which cannot run in the fork (DECK-R46).
- **Depends on:** T15
- **Done when:** a `workflow_dispatch` run creates a release on the fork with one `.apk` asset and the expected tag.
