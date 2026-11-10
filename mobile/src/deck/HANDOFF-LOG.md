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

- T15 — blocked (the delivery credentials cannot push `.github/workflows/`) — workflow step rewritten and verified locally (YAML parses) but stripped from the pushed history; the patch is in `docs/plans/deck-build/implementation-report.md`. `mobile/src/deck/RELEASING.md` written and pushed.
- T16 — blocked (same cause) — tag prefix + site-job guard stripped from the pushed history (patch in the report). The parts outside the workflow — `mobile/scripts/prepare-android-release.mjs` and its test — are committed; `npx vitest run src/mobile-release` 4 passed.

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
