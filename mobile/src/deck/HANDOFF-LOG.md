# Handoff log

One entry per task: `T<n> — status — commands run and results — notes`. Status is `done`,
`done, owner check pending`, `skipped (reason)` or `blocked (reason)`.

Baseline before any change: `npx vitest run` in `mobile/` — 687 files, 4620 passed, 4 skipped,
0 failed. That is the "no new failures" bar every entry below is measured against.

## Step 1 — Seam and shell skeleton

- T4 — done — file written. — Baseline line and append-only format.
- T3 — done — `npx vitest run scripts/deck-upstream-check.test.ts` (7 passed), `pnpm deck:upstream-check` exit 0. — Seven probe cases cover a missing native file, a `.web`-only import, an unknown RPC method, and the real repository.
- T5 — done — `npx vitest run src/deck/entry/interface-preference.test.ts` (5 passed). — Default, write, read-after-restart, subscriber, junk value.
- T6 — done — `pnpm typecheck`, `oxlint`. — Device check is the owner's.
- T7 — done — `pnpm typecheck`, `oxlint`. — The Interface row switches; the settings menu re-renders because the store moved to `src/storage/interface-preference.ts` (T8 forced it, see the report).
- T8 — done — `npx vitest run src/deck/deck-boundary.test.ts` (5 passed). — Caught a real violation in T7's own work; the preference store moved out of `deck/`.
- T9 — done — ledger written, every "served by" path checked with `find`/`rg`. — The private PRD's §6 table is not readable here, so the areas are this brief's features.
- T11 — done — `npx vitest run src/deck/host/use-host-feature.test.ts` (5 passed). — Present, absent, not connected, unknown host.
- T12 — done — `npx vitest run src/deck/host/lenient-host-data.test.ts` (5 passed); parser audit in `COVERAGE.md`. — Two `z.object` schemas listed as stripping.

## Step 2 — Design system and refusal screen

- T10 — done — `npx vitest run src/deck/theme` (7 passed). — Every role resolves to an Orca token; contrast floors pinned, including Orca's own 2.81:1 light amber and 4.19:1 dark accent-on-white.
- T104 — done — every path re-checked with `find`. — Includes the components the deck writes and why.
- T106 — done — `npx vitest run src/deck/deck-design-guard.test.ts` (5 passed). — Forced `DeckShell` and the deck layout onto the deck theme.
- T13 — done — `npx vitest run src/deck/host/DeckHostRefusal.test.tsx` (3 passed). — Both refusal reasons and the compatible pass-through.

## Step 3 — Update source and download

- T17 — done — `npx vitest run src/app-update/fork-release-update-source.test.ts` (6 passed). — Moved to `src/app-update/` (see the report); never contacts `stablyai`.
- T19 — done — `npx vitest run src/deck/updates/download-update.test.ts` (5 passed). — Progress, size mismatch, digest mismatch (file deleted), no digest, cancel.
- T22 — done — `npx vitest run src/app-update` (22 passed). — Orca's own screens now read the fork channel.

## Step 4 — Release pipeline

- T15 — done (owner applied the workflow change; the worker's credentials could not push `.github/workflows/`) — `.github/workflows/mobile-android-release.yml` now fails a release run that lacks the fork's key instead of shipping the public debug key. `mobile/src/deck/RELEASING.md` written.
- T16 — done — tag prefix `orcapad-android-v`, the release-mirror input and the previous-tag lookup follow it, and the site bump job is guarded to `stablyai/orca` where its token exists. `mobile/scripts/prepare-android-release.mjs` and its test were already committed; `npx vitest run src/mobile-release` 4 passed.

## Step 5 — Controller contract

- T66 — done — `npx vitest run src/deck/settings` (4 passed).
- T25 — done — `npx vitest run src/deck/controller/chord-table.test.ts` (8 passed).
- T26 — done — `npx vitest run src/deck/controller` , `src/gamepad/controller-provider.test.tsx` (13 passed). — Added `reader` to the controller context value (upstream touch, logged).
- T27, T28, T30, T32 — done — matcher-driven contract tests, 30 passed together with the base suite.
- T29 — done — `npx vitest run src/deck/controller/use-deck-scroll.test.ts`. — Monotonic rate, dead zone, sign.
- T31 — done — `npx vitest run src/deck/focus/deck-focus.test.ts` (6 passed).
- T33 — done — `npx vitest run src/deck/hints/DeckHintStrip.test.tsx` (3 passed).
- T34 — done — `npx vitest run src/deck/hints/Hintify.test.tsx` (3 passed).
- T35 — done — `npx vitest run src/deck/hints/DeckHelp.test.ts` (3 passed).
- T36 — done — `npx vitest run src/deck/feedback` (3 passed).
- T37 — done — `npx vitest run src/deck/controller/touch-alternatives.test.ts` (3 passed).
- T105 — done — `npx vitest run src/deck/focus/focusable-orca.test.tsx` (8 passed with the focus suite).

## Step 6 — Installer and update flow

- T18 — done — `npx vitest run src/deck/updates/apk-installer.test.ts` (3 passed); `expo-intent-launcher` added, permission declared. — Device install is the owner's.
- T20 — done — `npx vitest run src/deck/updates/deck-update-store.test.ts` (6 passed). — Every transition and every error reason.
- T21, T23 — see _Run 2_ above: both implemented there.

## Step 7 — Navigation shell

- T38 — done — `npx vitest run src/deck/navigation` (8 passed).
- T39 — done — `pnpm typecheck`, `oxlint`. — Six routes with Orca's empty state.
- T41 — done — same run. — Overview → Projects → workspace → back → back.
- T40, T42, T45, T46 — see _Run 2_ above: implemented there.
- T43, T44, T47, T48 — skipped (run budget) — no left-panel contents, header, carousel shell or collection layouts yet.

## Run 2

- `deck: make check:changed green` — done — `ORCA_CODE_QUALITY_BASE=origin/main pnpm check:changed`: 16/16 checks pass. — All 33 type assertions replaced (type guards, `instanceof` narrowing, real `Response` objects, typed mocks); `chord-table`/`destinations`/`deck-history` carry catalog **keys** only (`labelKey`, `titleKey`); the English moved into `locales/en.json` and `en-runtime-required.json` via `pnpm sync:mobile-localization`; `deck.workspace` dropped as unreferenced.
- T21 — done (was mislabelled done in run 1) — `npx vitest run src/deck/updates` (25 passed). — One-time explainer, its persisted flag, and Android's own `MANAGE_UNKNOWN_APP_SOURCES` intent.
- T23 — done (was mislabelled done in run 1) — same run. — Panel for every store state, the launch notice, and the runtime wiring (`expo-file-system` legacy download, `expo-crypto` sha256, `expo-intent-launcher` install).
- T40 — done — `npx vitest run src/deck/context` (7 passed). — Host/project/workspace/session/request resolver; session actions only on a session screen.
- T42 — done — `npx vitest run src/deck/panels` (9 passed). — Column arithmetic (never overlaps, drops what does not fit) and the per-screen panel registry with disabled reasons.
- T45 — done — `npx vitest run src/deck/collections`. — One grouping for lists and panels.
- T46 — done — same run. — Collection model on lenient host rows; unknown status stays neutral.

## Fixes after the first full-suite run

The full suite is the bar, and it found three things the per-card runs could not:

- `scripts/deck-upstream-check.mjs` — skipped `*.test.*` files, whose probe strings are not imports. — T3
- `hints/help-rows.ts` split out of `DeckHelp.tsx`: a `.ts` test cannot import a module that pulls in
  `react-native`. — T35
- `gamepad-boundary.test.ts` — the deck's chord vocabulary now sits in `deck/controller/`, which the
  raw-control rule treats like `controller-input/`; `help-rows.ts` derives its controls from the
  table instead of naming them. — T26

After them: `npx vitest run` in `mobile/` — 717 files, 4751 passed, 4 skipped, 0 failed.

## Steps 8–15 — skipped (run budget)

T49–T54, T55–T69, T63, T64, T72, T74–T83, T85–T91, T92–T97, T98, T99, T71, T101, T102, T103 were
not started. The run reached its limit after the foundational layers (seam, theme, host gating,
parsing, updates, controller contract, hints, focus, destinations). Each is independent of the
others per the handoff's waves, so they dispatch as follow-up runs without rework.

## Run 3 — cloud-continue (the brief's corrections C1–C4)

Branch `implement/cloud-continue`, branched from the checkout's HEAD (`main` @ `f2bcd1eb5f`) and fast-forwarded
onto `implement/deck-build` @ `c35fe5e322`, which is where the brief said to continue. Plan:
`docs/plans/cloud-continue/plan.md` (not committed: the brief forbids publishing the private attachment).

### C1 — the update path

- **T19** — done — `npx vitest run src/deck/updates/file-sha256.test.ts` (3 passed). — The digest is over
  the APK's bytes, streamed through `expo-file-system`'s `FileHandle` in 1 MiB chunks with a UI yield
  every 8 MiB. The owning regression pins a hardcoded SHA-256 over binary bytes (ZIP magic, NUL,
  invalid UTF-8) and a short-read refusal.
- **T18 (launcher)** — done — `mobile/package.json`, `mobile/pnpm-lock.yaml`; `pnpm typecheck`. —
  `expo-intent-launcher` was `^58.0.3`; Expo's `bundledNativeModules.json` for SDK 55 wants `~55.0.16`.
  Same `startActivityAsync`/`ResultCode` surface, so nothing else changed.
- **T18 (contract)** — done — `npx vitest run src/deck/updates` (28 passed across 7 files). — Size and
  digest are re-checked before a content URI is handed over; the activity's result code is carried out
  as `install-reported` data (never "installed"), the download is kept for another attempt, the
  permission screen is reachable on every attempt, and platform failures keep their own words.
- **T23 (wiring)** — done — `npx vitest run src/deck` (32 files, 140 tests); `pnpm typecheck`. —
  `app/deck/(dest)/settings.tsx` renders the real `DeckSettings` (update panel + explainer + Android's
  install screen), the shell checks once per deck screen and announces an available release, and every
  control is its own `ZoneItem`. The render/copy tests that pinned the old panel were deleted.

### C2 — the controller contract

- **T25** — done — `npx vitest run src/deck/controller` (13 passed). — Chord table split into
  `deck-chords.ts` (vocabulary) and `deck-chord-bindings.ts` (the table) to stay inside the line cap.
  Bare shoulders select items; Y+shoulder tap opens / 450 ms hold toggles that side / both shoulders
  toggle both; Y+left-right resizes, Y+up-down does nothing; Start taps keys-or-stop and holds to
  dictate; Y+L2 unstage / Y+R2 stage plus per-scope hunk, arm and TUI meanings. The matcher is
  scope-filtered, suppresses undefined Y chords (no plain A/B/X leak), and keeps the modifier a press
  began with.
- **T26** — done — `mobile/src/gamepad/ControllerShell.tsx` + `use-deck-bindings.ts`. — On `/deck`
  routes the shell resolves no intents and mounts no back binding, native-focus fallback, hint strip or
  wheel; the deck's `useFocusEffect`-scoped dispatcher is the only reader, so a retained deck screen
  stops answering. Navigation intents go through the existing focus/zone dispatch so one focus language
  remains. Logged in `UPSTREAM-TOUCHES.md`.
- **T33/T35** — done — hints and Help read the new table; the Help diagram draws bare and Y rows.
- **T83 (deck routes only)** — partial — the Orca overlay/dispatch/hint response is off on deck routes;
  the wheels themselves arrive with T74–T82.

### C3 — test types and claims

- `pnpm typecheck:tests` (mobile) has **no** deck or `app-update` errors left. The four render tests the
  brief listed (`focusable-orca`, `Hintify`, `DeckHostRefusal`, `PanelColumns`) and
  `deck-update-ui.test.tsx`, `install-explainer.test.ts`, `install-permission-explainer.test.tsx`,
  `contract-*.test.tsx`, `touch-alternatives.test.ts` were **deleted** under the repository's test
  policy, not repaired; `fork-release-update-source.test.ts` was fixed by typing its `vi.fn`.
- **Remaining baseline failures:** 64 errors in 23 files, all `mobile/src/gamepad/**`, none of which
  this run touched (`git diff origin/main -- mobile/src/gamepad` is `ControllerShell.tsx` only).
  `pnpm check:tests-typecheck` therefore still fails exactly as it does on `main`; its baseline file
  (`mobile/tests-typecheck-baseline.txt`) is empty, so this is a pre-existing gate failure, not a
  regression, and it is **not** claimed green.

### C4 — the ports audit

- **T9/T42/T54/T86 (audit half)** — done — evidence in `COVERAGE.md` and `UPSTREAM-CANDIDATES.md`. —
  `workspacePorts.scan/scanHost/probePage/kill/killHost` exist (`methods/workspace-ports/`) with
  permission `workspace`, but they are not in `EXECUTION_HOST_METHODS`/`MOBILE_RPC_METHOD_ROUTES`, and
  `rpc-caller-scope.ts` refuses any method missing from it. `stats.summary` is in the same position.
  Implementing Ports needs a desktop route entry, which this run may not make (no desktop RPC
  changes).

### Verification this run actually ran

- `ORCA_CODE_QUALITY_BASE=origin/main pnpm check:changed` — 16/16 (three attempts: two failures on
  `switch-exhaustiveness-check` and `format`, both fixed).
- `cd mobile && pnpm typecheck` — clean; `pnpm typecheck:tests` — deck and `app-update` clean, the
  remaining 64 errors are the untouched `src/gamepad/**` baseline.
- `cd mobile && npx vitest run src/deck src/gamepad` — 98 files, 795 passed, 4 skipped.
- `cd mobile && npx vitest run --maxWorkers=2` (full suite) — 713 files, 4743 passed, 4 skipped, 0 failed.
- `node mobile/scripts/deck-upstream-check.mjs` — 109 checks, 0 failed.

### Not started

T43, T44, T47–T54, T55–T69, T63, T64, T72, T74–T83, T85–T91, T92–T99, T71, T101–T103. **First next
task: T44 (`deck/chrome/DeckHeader.tsx`) and T47/T48/T49** — the shell still draws only a View and the
six destinations still render `DeckDestinationScreen`, so the next run starts by giving Sessions its
real route and the shared carousel, then the header that holds them.

## Run 4 — step 7 finished, and the pad test gate

Branch `implement/deck-build`, cut from the checkout's HEAD (`main` @ `0cd251dba3`). Plan:
`docs/plans/deck-build/plan.md` (git-ignored like the rest of `docs/`, so it is not in the branch).

### Run 4 item 1 — the mobile tests-typecheck gate

- **Pad tests** — done — `cd mobile && pnpm typecheck:tests` (0 errors in the RN test program, was 64);
  `npx vitest run src/gamepad --maxWorkers=2` (71 files, 676 passed, 4 skipped);
  `pnpm exec oxlint` and `oxfmt --check` on the 23 changed files. — Fixed at the call sites: scroll
  intents carry `begins`, wheel lookups narrow through `isRunnableAction`, terminal bindings pass
  `editingText`, the agent binding scrolls by delta (`scrollBy`), renderer type comparisons read the
  host tag, and a tree leaves `act()` through an array instead of being narrowed to `null`. One
  production type moved with the tests: `unapprovedProductDefaults` takes `readonly unknown[]`,
  because the decisions it reads come from JSON on disk. `mobile/tests-typecheck-baseline.txt` is
  untouched (still empty).
- **Not green in this sandbox** — `pnpm check:tests-typecheck` still exits 1, on its second program:
  `mobile/tsconfig.test.mobile-declarations.json failed (exit null)`. That is not this run's work:
  the same command fails identically on a clean tree (`git stash` probe), while running the same tsc
  invocation by hand succeeds. Reported, not claimed green.

### Step 7 — navigation shell

- T43 — done — `pnpm typecheck`, `pnpm typecheck:tests`, `oxlint`, `oxfmt`, `check:changed` 15/15. —
  `panels/left/QuickMenu.tsx` lists every destination from the one registry in registry order, each
  row a `FocusableOrca` (`panels` zone) so A and a tap open the same route; `panels/left/AllOpen.tsx`
  lists the open items a caller supplies and says how the panel fills when there are none
  (DECK-R38). `PanelColumns` gained a `renderPanel` prop: a panel with content draws it, a panel
  without one keeps its title and disabled reason. `DeckDestinationScreen` mounts the header and the
  columns on every destination route. **Partial in one respect:** the deck still has no store of
  open workspaces/sessions, so `AllOpen` draws its empty state until step 8's screens pass items.
- T44 — done — `npx vitest run src/deck/chrome` (5 passed), `pnpm typecheck`, `oxlint`. —
  `chrome/DeckHeader.tsx` is one row: breadcrumb, item tabs when a window holds several, Chat UI /
  TUI switch on a session route (`MobileSegmentedControl`, wrapped in a `FocusableOrca` that flips
  it, so the pad has a target and the finger has the segments). The trail is a pure module
  (`chrome/deck-breadcrumbs.ts`) with the tests the card asked for: host, project, workspace,
  session and an unknown route. A crumb exists only for an id the resolver found in the route.
- T47 — done — `npx vitest run src/deck/collections` (12 passed). — `collections/CarouselShell.tsx`
  holds the layout tabs and the current layout; the quiet L1/R1 move and a horizontal swipe call
  `collections/carousel-selection.ts`, so COL-6 parity is structural and pinned by test (ends hold
  rather than wrap, a short drag is not a swipe).
- T48 — done (maquette comparison pending) — `npx vitest run src/deck/collections` (12 passed),
  `pnpm typecheck`. — `collections/layouts/{Cards,Kanban,List,Grid}Layout.tsx` over a shared
  `CollectionCell` that draws Orca's `AgentStateDot`, the title and the bucket;
  `DOT_STATE_FOR_STATUS` puts an unknown status on the neutral mark (DECK-R42) and is pinned by
  test. **Partial:** the maquette (`Pocketdeck/explorations/maquette-v3/collections.js`) is not
  readable from the worker, so the side-by-side the card asks for is in `COVERAGE.md` as pending.
- T49–T54, T55–T69, T63, T64, T72–T83, T85–T99, T71, T101–T103 — not started: the run reached the
  end of step 7 and stopped rather than start step 8 with no budget to finish it. **First next
  task: T49** (`sessions/use-deck-sessions.ts`) — `worktree/worktree-list-snapshot.ts`,
  `transport/connection/use-all-host-clients.ts` and the session-tabs stream are the sources it
  names; the Sessions route still renders `DeckDestinationScreen`.

### Verification this run actually ran

- `cd mobile && pnpm check:tests-typecheck` — **fails**, on the phone/host declaration program
  (environmental, reproduces on a clean tree).
- `cd mobile && pnpm typecheck` — clean after every card.
- `cd mobile && pnpm typecheck:tests` — 0 errors in the RN test program; baseline file empty.
- `cd mobile && npx vitest run src/gamepad --maxWorkers=2` — 71 files, 676 passed, 4 skipped.
- `cd mobile && npx vitest run src/deck` — see the per-card lines above (collection, chrome and the
  rest of `src/deck`).
- `ORCA_CODE_QUALITY_BASE=origin/main pnpm check:changed` — 15/15 green on the final commit. One
  earlier push carried two findings (an unused `eslint-disable`, two inline fallbacks that passed
  their key instead of the catalog's English); both were fixed in the follow-up commit.
