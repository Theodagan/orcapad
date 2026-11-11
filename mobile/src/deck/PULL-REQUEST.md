# deck: build 1

> This file is the pull-request description for `implement/deck-build` → `main`. It lives in the
> deck's own folder because this repository ignores `docs/` (planning material stays local), and
> run 1 lost its report there. Paste it into the PR when opening it; there is no API credential on
> the worker that could open the PR itself.

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
