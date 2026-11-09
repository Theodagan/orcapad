# CF09 — Fork release pipeline

**Goal:** Own package id, required signing secrets and releases published to the fork. Config and workflow edits only.

|                          |                                                                       |
| ------------------------ | --------------------------------------------------------------------- |
| Dispatch when            | CF01 merged, decision D3 recorded (owner)                             |
| Branch                   | `deck/cf09-release-pipeline` from `main`                              |
| PR                       | `Theodagan/orcapad` `main`, title `deck(CF09): Fork release pipeline` |
| Tasks                    | T14, T15, T16 (in this order)                                         |
| Owner checks after merge | none                                                                  |

Read [`README.md`](./README.md) first: it holds the rules every cloud worker follows.

## Feature done when

- Every task below meets its _Done when_ (cloud bar), with an entry in `mobile/src/deck/HANDOFF-LOG.md`.
- `pnpm typecheck`, `pnpm test`, `pnpm lint` in `mobile/` add no failures to the recorded baseline; `deck-boundary.test.ts` passes once it exists.
- The PR description lists: tasks done, tasks skipped and why, files touched outside `mobile/src/deck/` and `mobile/app/deck/` (also in `UPSTREAM-TOUCHES.md`), and the owner checks to run.

## Requirements cited

From the PRD (not in the repo). Rule IDs such as `PAD-6` are in `Theodagan/Pocketdeck` `docs/ux/ux-rules.md`.

- **DECK-R44** The fork has its **own Android package id** (not `com.stably.orca.mobile`, which
  `mobile/app.json` still uses) so it never conflicts with the official app.
- **DECK-R45** One release signing key, stored outside the repo and in CI secrets, kept for the life
  of the app. Losing it forces every user to uninstall and reinstall. Release builds fail when it is
  missing; they never fall back to a debug key.
- **DECK-R46** CI publishes signed APKs to `Theodagan/orcapad` GitHub Releases under the fork's own
  tag prefix, from the existing `mobile-android-release.yml`.

## Tasks

### T14 — Set the fork's package id and app name

- **Scope:** cloud: code and tests.
- **Split:** Cloud part: the `app.json` / `app.config.js` edits with the D3 values from the feature header. Installing side by side with the official app is the owner's (L05).
- **Decision:** use the value given in this feature's dispatch prompt; if none is given, skip this task and report it.
- **Files:** `mobile/app.json` (edit: `android.package`, `ios.bundleIdentifier`, `name`), `mobile/app.config.js` (edit if it overrides)
- **Change:** Apply D3 (DECK-R44). Log the touch.
- **Depends on:** D3, T1
- **Done when:** a built APK installs alongside the official Orca app on the same device.

### T15 — Require the fork's release signing key in CI

- **Scope:** cloud: code and tests.
- **Split:** Cloud part: the workflow and signing-script edits, failing loudly without secrets. Creating the key, adding secrets and running the workflow are the owner's (L05). Never create or commit a key.
- **Files:** `.github/workflows/mobile-android-release.yml` (edit), `mobile/src/mobile-release/` (edit the signing plugin/script the workflow uses)
- **Change:** Read keystore, alias and passwords from fork secrets; fail the job when any is missing; never fall back to the debug key (DECK-R45). Document the off-repo backup location in `mobile/src/deck/RELEASING.md` (create).
- **Depends on:** T14
- **Done when:** a dispatch run without secrets fails at the signing step; with secrets, `apksigner verify --print-certs` on the artifact shows the fork certificate.

### T16 — Publish releases to the fork under its own tag prefix

- **Scope:** cloud: code and tests.
- **Split:** Cloud part: the workflow edits. Running `workflow_dispatch` is the owner's (L05).
- **Files:** `.github/workflows/mobile-android-release.yml` (edit)
- **Change:** Tag prefix from D3; release created on `Theodagan/orcapad`; remove or guard the job that checks out `stablyai/orca-marketing-website` (line ~274), which cannot run in the fork (DECK-R46).
- **Depends on:** T15
- **Done when:** a `workflow_dispatch` run creates a release on the fork with one `.apk` asset and the expected tag.
