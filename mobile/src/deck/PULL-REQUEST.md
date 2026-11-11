# deck: build 1

> This file is the pull-request description for the deck branch → `main`. It lives in the deck's own
> folder because this repository ignores `docs/` (planning material stays local), and run 1 lost its
> report there. Paste it into the PR when opening it; there is no API credential on the worker that
> could open the PR itself.
>
> **Run 3 (`implement/cloud-continue`)** owns the branch now. Compare:
> <https://github.com/Theodagan/orcapad/compare/main...implement/cloud-continue>. The section below
> it is the corrected picture; the run 1–2 text is kept as history.

## Run 3 — corrections (C1–C4 of the continuation brief)

The continuation brief's four corrections are done. They were defects in what runs 1–2 claimed, not
polish:

- **C1 updates (T18/T19/T23).** The check hashed the APK's base64 _text_, so no published digest
  could match: it now hashes the file's bytes through a streamed `FileHandle` read, with a hardcoded
  SHA-256 regression over binary bytes. `expo-intent-launcher` is pinned to the SDK 55 release
  (`~55.0.16`) instead of the 58.0.3 the branch carried. The installer no longer reads success out
  of an activity result: it re-checks size and digest, carries the result code out as data, keeps
  the download for another attempt, and offers Android's own permission screen on every attempt.
  Failures keep the platform's words instead of becoming `cancelled`/`missing-file`. The store,
  panel, explainer and launch notice are wired to Settings and the deck shell, each control its own
  zone item.
- **C2 controller (T25/T26).** Bare L1/R1 step the focused area's items; Y+L1/R1 taps open that side,
  450 ms holds toggle that side, both shoulders toggle both; Y+arrows resize and never move; Start
  toggles the text target's keys, stops a live microphone and otherwise does nothing, with a 650 ms
  hold for dictation; Y+L2 unstage / Y+R2 stage, with per-scope hunk, arm-decision and TUI-key
  meanings. The matcher filters by scope, suppresses undefined Y chords instead of leaking plain
  A/B/X, and the shell stops resolving intents and unmounts Orca's back binding, native-focus
  fallback, hint strip and wheel overlay on `/deck` routes, so one dispatcher answers.
- **C3 test types.** Every deck test file typechecks (`pnpm typecheck:tests`), and the render/copy/
  registry tests that only pinned the old table were deleted rather than repaired. The remaining
  `mobile/src/gamepad/**` test type errors (64, 23 files) are the pre-existing baseline: unchanged
  from `origin/main`, reported in the run's report, not claimed green.
- **C4 audit.** `workspacePorts.scan/scanHost/probePage/kill/killHost` exist and are registered;
  what is missing is the phone's route table entry, which `rpc-caller-scope.ts` refuses by name.
  `stats.summary` is in the same position. `COVERAGE.md`, the panel comment and
  `UPSTREAM-CANDIDATES.md` now say that instead of "no ports RPC exists".

**Still not done:** T43, T44, T47–T54 (live destinations), T55–T69/T63/T64 (session loop), T72,
T74–T83 (wheels), T85–T91 (review), T92–T99, T71, T101–T103. Nothing is blocked by what landed.

PocketDeck's first build: the seam, the design system, the update channel, the controller contract,
the installer and update flow, and the navigation shell's registry, routes, context and panels.
Runs 1 and 2, one commit per card, in the plan's order.

Plan: `docs/deck-handoff/DECK-BUILD.md` (`Run 2 — start here`). Per-task status:
`mobile/src/deck/HANDOFF-LOG.md`. Deviations and gaps: the last section here.

## Done

**Seam (Step 1).** Touched-file ledger; `pnpm deck:upstream-check` (native-file and RPC-method
checks, with its own probe tests); the interface preference, its Settings row and the entry
redirect; the deck route group; the deck boundary test (both directions of DECK-R40); the coverage
ledger; the host capability gate; lenient host-data parsing with a parser audit.

**Design (Step 2).** `deck/theme/deck-theme.ts`: every deck role resolves to an Orca token, plus
page title size, focus ring and wheel kinds; contrast pinned per scheme. Reuse inventory; design
guard (no colour/font/radius literals, no second design system); host refusal screen.

**Updates (Steps 3 and 6).** The fork's release source (`Theodagan/orcapad`,
`orcapad-android-v*`, APK URL + size + digest); a vetted download (size, sha256, delete on mismatch,
cancel); Orca's own update runtime pointed at the fork; the APK installer (content URI +
`expo-intent-launcher` + `REQUEST_INSTALL_PACKAGES`); the update state machine; the one-time
unknown-sources explainer; the update panel and launch notice.

**Controller contract (Step 5).** Deck settings; the one chord table; the deck's own chord matcher
(Y is the modifier — D2); the binding layer; the A/B/Y/shoulder/trigger/Start/stick contract tests;
analog scroll; pane focus; hint strip with the Y layer; element hints; the Help diagram; the focus
tick; the touch-alternative gate; pad-focus wrappers for Orca components.

**Navigation (Step 7, in part).** Destinations registry; the six routes with Orca's empty state;
Y+B history; the context resolver; panel columns and the per-screen panel registry; collection
model and shared grouping.

**Check gate.** `pnpm check:changed` is green (16/16). Run 1 left four failures: formatting, 33 type
assertions, English labels beside keys, and missing catalog entries. All four fixed: type guards and
`instanceof` narrowing replaced every cast, `chord-table`/`destinations`/`deck-history` carry
catalog keys only, and the English now lives in `locales/en.json` and `en-runtime-required.json`.

## Blocked — the release workflow

T15 and T16 cannot be pushed by this worker: the GitHub App has no `workflows` permission, so
`.github/workflows/mobile-android-release.yml` is rejected. The verified change is handed back as
`mobile/src/deck/pending-workflow-changes.patch` (`git apply` applies it cleanly to this branch): the
signing step fails without the fork key (no debug fallback) and the tag prefix, release title and
site-job guard move to the fork. `mobile/src/deck/RELEASING.md` is the runbook. The parts outside
the workflow — `prepare-android-release.mjs` and its test — are committed.

## Not done

- **T43, T44, T47, T48**: left-panel contents, header, carousel shell, collection layouts.
- **Steps 8–15**: T49–T54 (live destinations), T55–T69 (session loop), T63/T64 (approvals inbox),
  T72/T74–T83 (wheels), T85–T91 (review), T92–T97 (polish), T98/T99 (compat), T71/T101–T103
  (deck by default and cleanup).

Neither group is blocked by what landed; each continues from the layers that are in place.

## Deviations

- The fork update source lives in `src/app-update/` and the interface-preference store in
  `src/storage/`, because Orca may not import the deck (DECK-R40 — the boundary test caught run 1
  trying). `deck/updates/fork-release-update-source.ts` and `deck/entry/interface-preference.ts`
  remain as the deck's import sites.
- `gamepad/controller-provider.tsx` gained `reader`, and `gamepad/gamepad-boundary.test.ts` counts
  `deck/controller/` as a controller-input-equivalent place for raw control names (the deck's
  modifier is Y, not Orca's X). Both logged in `UPSTREAM-TOUCHES.md`.
- Tests follow `AGENTS.md` rather than each card's wording: no render-only, copy or registry-count
  tests beyond the ones the brief lists as worth having.
- Ports and host CPU/RAM are **H** rows in `COVERAGE.md`: the host has the methods
  (`workspacePorts.*`, `stats.summary`) but the phone has no route for them, so a paired client is
  refused by name (`UPSTREAM-CANDIDATES.md` 1 and 2).

## Verification

- `pnpm check:changed` (base `origin/main`): **16/16 checks pass**.
- `npx vitest run` in `mobile/`: see the run's final report; no failures.
- `pnpm typecheck` (mobile) clean; `oxlint` clean over `src/deck`, `app/deck`, `scripts`,
  `src/gamepad`.
- `node scripts/deck-upstream-check.mjs`: 0 failed.
- Not run, and not claimed: device checks, `workflow_dispatch`.

## What the owner should try on the device

1. Install the APK, open Settings → Interface (it shows the shell in use), switch it, relaunch: the
   deck opens instead of Orca's home. Switch back the same way.
2. In the deck: B dismisses, A confirms, L1/R1 move panel focus, Y + L1 held 450 ms toggles a panel
   (landscape only — panels need width), Start opens Help, a 650 ms Start hold starts dictation,
   L3+R3 opens the key wheels once T81 lands.
3. Settings → App update: Check, then Update; Android's "install unknown apps" screen should appear
   once, and the second time it should go straight to the installer.
4. Pair a desktop older than this build: the deck's refusal screen appears with an Update button,
   not a blank screen.
5. On Orca's own screens nothing changed, except that the update row now reads this fork's releases.
