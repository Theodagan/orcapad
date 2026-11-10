# PocketDeck build — one-shot brief

You are building **PocketDeck**, a controller-first interface for Orca Mobile on Android handhelds,
in this repository (`Theodagan/orcapad`, a public fork of `stablyai/orca`). This file is the whole
brief: work through it top to bottom in one run. The owner tests on the device afterwards and sends
follow-up runs to refine; aim for **most of the job done and everything compiling**, not perfection.

## How to run this

- Branch `deck/build-1` from `main`. One commit per step below (`deck(CFnn): <title>`), one PR
  against `Theodagan/orcapad` `main` titled `deck: build 1`. Open it as a draft early and push as
  you go, so partial progress is never lost.
- Follow the steps in order: each builds on the previous ones. If a step is blocked, do what you can,
  note it, and continue with the next step that doesn't depend on it.
- Keep `main` releasable: every commit typechecks; never leave the app unbootable.
- The PR description, updated at the end: per step, what is done, partial or skipped and why; files
  touched outside `mobile/src/deck/` and `mobile/app/deck/`; and **what the owner should try on the
  device**, step by step.

## Ground rules

- Read `AGENTS.md` first and follow it. In particular:
  - **Tests: do not add them by default.** Ignore any per-task wording that asks for a test unless the
    test meets `docs/agents-md-refs/test-antipatterns.md`: it fails when the change is reverted, its
    expected values are hardcoded, and it sits at the one layer that owns the behaviour. Worth
    writing here: the deck boundary test (T8), the design guard (T106), the controller contract
    invariants (T27–T32), the update state machine and digest check (T19, T20), lenient host-data
    parsing (T12), request-bound decision confirmation (T61), wheel gesture and gain maths (T74, T75).
    Not worth writing: render-only, copy, style, registry-count or mock-echo tests.
  - Before every push: `pnpm check:changed` (never `--no-verify`). Typecheck `pnpm tc`; tests
    `pnpm test <path> --maxWorkers=2`; lint `pnpm exec oxlint <files>`, format
    `pnpm exec oxfmt --write <files>`. Mobile-only: in `mobile/`, `pnpm typecheck`, `pnpm lint`.
  - No vague file names (`helpers`, `utils`…); comments only when code can't say it, one line.
  - No type assertions except `as const` (or a `SAFETY:` comment).
- **Scope:** new code goes in `mobile/src/deck/` and `mobile/app/deck/`. No Orca module imports from
  them. Any edit outside them is appended to `mobile/src/deck/UPSTREAM-TOUCHES.md`
  (`path — reason — task`). Desktop code (`src/main`, relay, RPC protocol) is out of scope.
- **Reuse before reimplementing:** the deck composes Orca's existing data hooks and components (see
  _Look and feel_). Write a new component only for something Orca has no equivalent for, and say why
  in `mobile/src/deck/REUSE.md`.
- **No desktop or device in the cloud:** use `pnpm mock-server` in `mobile/` for live data; extending
  its fixtures is allowed (log it as an upstream touch).
- **Public repo:** no secrets, keys, tokens, personal paths or emails; never create a signing key;
  never run `workflow_dispatch`; never push to `stablyai/orca`.
- **Design sources:** behaviour rule IDs (`PAD-6`, `DIAL-25`, `SAFE-1`…) are defined in the private
  repo `Theodagan/Pocketdeck` (`docs/ux/ux-rules.md`); the look and layout reference is
  `explorations/maquette-v3/` there (open `index.html`). Paths written `Pocketdeck/…` refer to it. If
  you can't read it, build from the task text and the requirements below; never invent behaviour a
  task doesn't describe — leave it out and list it in the PR.

## What already exists (baseline on `main`)

- Upstream Orca mobile as of 2026-11-09. Orca's own host screens are the desktop's downloaded web
  page in a WebView; the engine (session/chat controllers, `terminal/session/TerminalPaneView.tsx`,
  transport, dictation, files, source control) is still native code the deck imports.
- The fork's controller plumbing: `mobile/src/gamepad/` (input runtime, focus registry, zones and
  `ZoneItem`, wheel geometry, hint bar) and the native module `mobile/modules/orca-gamepad/`.
  `ControllerShell` wraps the root layout. The per-screen hooks in `mobile/src/gamepad/bindings/`
  (X modifier) have no consumers: reshape what the deck needs into `mobile/src/deck/`.
- App identity: `com.theodagan.orcapad`, name Orcapad. Remote push is unavailable to this app (it
  needs the official Firebase project); never re-add `google-services.json`.

## Decisions (do not reopen)

- **D2:** the deck's modifier is **Y** (PAD-9). Orca's old bindings used X; the deck ignores them.
- **D3:** app id `com.theodagan.orcapad`, name Orcapad, release tag prefix `orcapad-android-v`.
- **D5:** the approvals source is chosen by you in T63, from the code.
- **D6:** in-app updates use `expo-file-system` content URIs + `expo-intent-launcher` +
  `REQUEST_INSTALL_PACKAGES`; no custom native module unless unavoidable.
- The deck sits beside Orca's screens behind an Interface setting until T71 makes it the default.

## Requirements

- **DECK-R3** Panels are columns that split the width, never overlays. Left: Quick menu, All open (PANEL-1). Right: per screen, from one registry that also returns the disabled reason (PNL-2).
- **DECK-R4** One context resolver answers which project / workspace / session / request is current (UXA-R23). Session actions appear only on session screens.
- **DECK-R13** Every timed or chorded input has a visible touch alternative (PAD-8).
- **DECK-R17** A wheel is a hold gesture on its stick: past the dead zone opens that side's wheel, rotating turns it, the **opposite trigger validates**, the **same-side trigger dismisses / steps back**, return to centre closes (DIAL-0, DIAL-25, DIAL-33, DIAL-31).
- **DECK-R18** Feel: click-wheel ring under a fixed selector, rate curve and S-curve gain, 1/8-turn distance guard, no snap animation, loop only above six entries (DIAL-21, 24, 26, 27, 30). Draw on the UI thread (Reanimated worklets); a dropped frame during a turn is a bug. Today's wheels (`gamepad/wheel`) do not use Reanimated, so this is a rewrite of the wheel's rendering. Note: stick samples reach JS as events from the native module (`OrcaGamepadModule.kt`, `sendEvent`), so input still waits on the JS thread even when drawing does not. M4 measures turn latency on device while a chat streams; if it fails, the native module writes stick values straight into a UI-thread shared value (small native change, logged in `UPSTREAM-TOUCHES.md` only if it touches an Orca file).
- **DECK-R20** Items are kind-coded with colour **and** shape and label (DIAL-2, VIS-2); counts as badges (DIAL-16); no duplicate entries (DIAL-22); a readout card previews the selected item (DIAL-9, DIAL-18, IH-13).
- **DECK-R25** No decision from a single trigger or wheel pick: a confirmation shows the exact request, operation and effect, and is bound to that request (SAFE-1, SAFE-2).
- **DECK-R27** One composer under the conversation, with mode · model indicator opening the Agent panel (SES-9, SES-7). Notes attached from files appear as chips and travel with the next prompt (FILE-4).
- **DECK-R30** Source control panel per FILE-5 with Y + L2/R2 stage / unstage.
- **DECK-R34** Deck styles read Orca's tokens through one deck theme module that adds only what Orca lacks (page title size, focus ring, wheel kind colours and shapes derived from Orca's palette). No hex values, font sizes or corner radii are written anywhere else in `deck/`. The deck supports Orca's light and dark schemes and the user's appearance preference (the maquette is dark only). Borders only for focus ring and primary action (VIS-8 amended), one focus language (SD-1).
- **DECK-R37** Capabilities come from what Orca declares; nothing is inferred (SAFE-3). A missing one shows disabled with its reason, never a working-looking control that does nothing.
- **DECK-R38** No fixture, example or placeholder data in production builds. Empty states say what is empty and how to fill it.
- **DECK-R39** Errors from the host are shown as they are (connection lost, refused, version too old), not swallowed.
- **DECK-R40** `deck/` depends only on the data API and the engine modules. It never loads the page, uses the bridge, or calls the bundle methods. - Decided 2026-11-09: Orca's own screens follow upstream (the downloaded page) from the first baseline. The fork carries only the pad plumbing, the deck and its own app identity. Until the deck covers the agent loop (M3), daily pad use stays on the previous fork build, installed under the old package id beside the new app. - The deck gets no screen updates from the desktop. New screens reach users only through a new APK, hence §7.10. - If upstream moves logic into the page (computed in browser code instead of exposed as an RPC), that feature becomes an H row (§6): rebuild it in `deck/` from data the API does expose, or show it as unavailable.
- **DECK-R41** Every host feature the deck uses is gated on the desktop's declared feature list, never on a version number or on what the engine code knows. A missing feature is shown disabled with its reason (DECK-R37). This also covers a newer fork build against an older desktop.
- **DECK-R42** Data from the host is parsed leniently in `deck/`: unknown fields pass, unknown status or kind values fall back to a neutral state. A schema addition upstream must never blank a screen. M0 audits the engine parsers the deck reads and lists strict ones in `COVERAGE.md`.
- **DECK-R43** When a desktop refuses the client (protocol below its minimum), the deck says so plainly and offers the in-app update (§7.10), not a working-looking screen with failing calls. - Silent changes to what the host sends (a field's meaning, a status value) carry no version signal. They are caught by the merge checklist (§5.3, item 4) and by testing each official desktop release.
- **DECK-R45** One release signing key, stored outside the repo and in CI secrets, kept for the life of the app. Losing it forces every user to uninstall and reinstall. Release builds fail when it is missing; they never fall back to a debug key.
- **DECK-R46** CI publishes signed APKs to `Theodagan/orcapad` GitHub Releases under the fork's own tag prefix, from the existing `mobile-android-release.yml`.
- **DECK-R47** The update check reads only the fork's releases. Settings shows the installed and latest versions and an **Update** button; a new version is also announced (non-blocking) on launch.
- **DECK-R49** Every update control is reachable by pad and by touch (NAV-1, NAV-9), and failures (no network, rate limit, bad download, install refused) are shown as they are (DECK-R39). - _Later, optional:_ code-only updates through `expo-updates` with a self-hosted manifest (no install dialog). Needs runtime-version discipline so code never runs on a binary without its native modules. Not in this PRD's milestones.
- **DECK-R50** **Reuse Orca components before writing new ones.** Deck screens compose Orca's components and router-free views, wrapped for pad focus with the gamepad layer's `ZoneItem` (children draw the focus, so the touch look is unchanged). A new component is written only for a structure Orca has no equivalent for, and `mobile/src/deck/REUSE.md` records why.

## Look and feel

The deck must feel like Orca, laid out like the maquette. **Orca's mobile design system is the
source of every value; the maquette supplies layout, structure and behaviour.** The maquette's
tokens map almost one to one onto Orca's roles, so this costs little:

| Maquette (`tokens.css`)               | Orca (`theme/mobile-theme.ts`)                | Note                                                              |
| ------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------- |
| `--fs-meta` 12 · `--fs-body` 14       | `typography.metaSize` 12 · `bodySize` 14      | Same values.                                                      |
| `--fs-title` 16                       | `typography.titleSize` 18                     | Use Orca's 18.                                                    |
| `--fs-page` 22                        | —                                             | Deck addition: page title size.                                   |
| `--text-1/2/3`                        | `textPrimary` / `textSecondary` / `textMuted` | Three tones (IH-2).                                               |
| `--accent`, `--st-run`                | `accentBlue`                                  | One accent; "running" uses it.                                    |
| `--st-need` · `--st-ok` · `--st-risk` | `statusAmber` · `statusGreen` · `statusRed`   | Four status colours with run.                                     |
| `--bg-0/1/2`                          | `bgBase` / `bgPanel` / `bgRaised`             | Pane backgrounds (VIS-7).                                         |
| `--hair`                              | `borderSubtle`                                |                                                                   |
| corners, spacing                      | `radii` roles, `spacing` scale                | Use the roles as Orca defines them (control, surface, floating…). |

Orca pieces to reuse (paths after the upstream merge; all verified router-free unless noted):

| Deck element                               | Orca piece                                                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Agent rows, status dots, agent marks       | `WorktreeAgentRow`, `WorktreeAgentList`, `AgentStateDot`, `StatusDot`, `MobileAgentIcon`, `AgentSpinner`                  |
| Workspace / project rows                   | `WorktreeListRow`, `WorktreeMetaGlyphs`, `MobileRepoIcon`, `home/MobileHomeHostList`                                      |
| Chat UI / TUI switch, layout tabs          | `MobileSegmentedControl`                                                                                                  |
| Empty, loading, error states (DECK-R38/39) | `MobileStateView`, `LoadingSpinner`, `HostOfflineBanner`, `AuthFailedBanner`                                              |
| Toasts and Undo (SAFE-6)                   | `TransientToast`                                                                                                          |
| Confirmations (SAFE-1) frame               | `ConfirmModal`, `ActionSheetModal` (content is the deck's)                                                                |
| Message bodies, code, mermaid              | `MobileMarkdown` and `mobile-markdown-*`                                                                                  |
| Diff view in a file item                   | `MobileDiffReviewScreenView` / `MobileDiffReviewBody`                                                                     |
| File view, file tree                       | `files/MobileFilePreviewBody`, `MobileFileExplorerPanel` (one router reference to lift out)                               |
| Source control panel                       | `source-control/MobileSourceControlContent`, `MobileSourceControlFileRows`                                                |
| Browser tab item                           | `browser/MobileBrowserPaneView`                                                                                           |
| Create workspace                           | `NewWorktreeFormSheet` and the `use-new-workspace-*` hooks                                                                |
| Settings rows and screens                  | `MobileSwitch`, `settings/voice-settings-screen`, `notification-settings-screen`, `theme/mobile-appearance.ts` for Themes |
| Account usage on Overview                  | `AccountUsage`                                                                                                            |
| App update rows                            | `home/AppUpdateCard`, `settings/settings-app-update-section` (fed by the fork source, §7.10)                              |
| Split-key slot geometry (landscape)        | `layout/side-rail-strip.ts` (`getSideRailStrip`, keyboard occlusion)                                                      |
| Motion                                     | `sheet-motion-values.ts`, `ArrivalFade`, `use-working-motion`                                                             |

Upstream keeps these up to date because its downloaded page renders the same components, so their
visual changes reach the deck on each merge. That is the point (the deck stays looking like Orca) and
also a risk (§11).

## Build steps

### Step 1 — Seam and shell skeleton (`CF01`)

- **T4 — Start the touched-file ledger**
  - Files: `mobile/src/deck/UPSTREAM-TOUCHES.md` (create)
  - Do: Header naming the baseline (upstream `c82839fb7b6` + pad plumbing, decided 2026-11-09) and the append-only line format `path — reason — task`.
  - Accept: the file exists with the baseline line and format.
- **T3 — Add the upstream merge check script**
  - Files: `mobile/scripts/deck-upstream-check.mjs` (create), `mobile/package.json` (edit: `deck:upstream-check` script)
  - Do: Script for the PRD §5.3 checklist: (1) for each Orca module imported from `src/deck/**`, the native file (not only `.web.*`) exists; (2) each RPC method name the deck calls (collected from `src/deck/**` operation files) exists in `src/main/runtime/rpc/methods/`. Prints a pass/fail table.
  - Accept: `pnpm deck:upstream-check` exits 0 on the baseline and exits 1 when a probe import to a deleted file is added to a fixture directory used by its own test (`mobile/scripts/deck-upstream-check.test.ts`).
- **T5 — Add the interface preference**
  - Files: `mobile/src/storage/preferences.ts` (edit), `mobile/src/deck/entry/interface-preference.ts` (create), `mobile/src/deck/entry/interface-preference.test.ts` (create)
  - Do: One stored value `interface: 'deck' | 'orca'`, default `'orca'` until M3, read through a deck-owned hook. Log the `preferences.ts` touch.
  - Accept: unit test covers default, write, read-after-restart (mocked storage).
- **T6 — Mount the deck route group**
  - Files: `mobile/app/deck/_layout.tsx` (create), `mobile/app/deck/index.tsx` (create), `mobile/src/deck/DeckShell.tsx` (create)
  - Do: Expo Router group for the deck; `DeckShell` renders an empty frame with the deck background. Inherits `RpcClientProvider` and `ControllerShell` from `app/_layout.tsx`.
  - Accept: navigating to `/deck` on device shows the deck frame; Orca's routes still work. → the device part is the owner's later test; you prove the behaviour in code (and against `pnpm mock-server` where it serves the data).
- **T7 — Route the app entry by the interface preference**
  - Files: `mobile/app/index.tsx` (edit), `mobile/src/settings/mobile-settings-menu-items.ts` (edit)
  - Do: `app/index.tsx` redirects to `/deck` when the preference is `deck`; Orca Settings gets an "Interface" row to switch. Log both touches.
  - Accept: toggling the row and relaunching lands on the chosen shell (device check + a render test of `app/index.tsx`). → the device part is the owner's later test; you prove the behaviour in code (and against `pnpm mock-server` where it serves the data).
- **T8 — Add the deck boundary test**
  - Files: `mobile/src/deck/deck-boundary.test.ts` (create)
  - Do: Fails when any file outside `src/deck/` and `app/deck/` imports from them (DECK-R40 seam), and when `src/deck/**` imports `mobile-web-shell/**`, `modules/orca-mobile-web-shell/**` or `transport/mobile-web-bundle-*` (DECK-R40). Pattern from `gamepad-boundary.test.ts` (source scan with `typescript`).
  - Accept: test passes; adding a probe import in a fixture makes each rule fail (predicates unit-tested like the gamepad ratchets).
- **T9 — Create and verify the coverage ledger**
  - Files: `mobile/src/deck/COVERAGE.md` (create)
  - Do: One row per PRD §6 area: rule IDs → tier (R/N/H/P) → status → owning file. Verify each R row by naming the Orca hook or RPC that serves it (e.g. Sessions → `worktree/worktree-list-snapshot.ts`, prompts → `session/native-chat/use-mobile-native-chat-prompts.ts`); correct tiers that are wrong.
  - Accept: no row says "unverified"; every R row cites a file that exists (`pnpm deck:upstream-check` style spot check).
- **T11 — Feature gate hook**
  - Files: `mobile/src/deck/host/use-host-feature.ts` (create), `mobile/src/deck/host/disabled-reason.ts` (create), tests (create)
  - Do: `useHostFeature(capability)` returns `{ available: true } | { available: false, reason }` from the negotiated capabilities (`transport/mobile-runtime-capability-negotiation.ts`). DECK-R41, DECK-R37.
  - Accept: tests cover: capability present, absent (reason "This desktop doesn't provide …"), host not connected (reason distinct).
- **T12 — Lenient host-data parsing and engine parser audit**
  - Files: `mobile/src/deck/host/lenient-host-data.ts` (create, + test), `mobile/src/deck/COVERAGE.md` (edit: "Strict parsers" section)
  - Do: Helpers that wrap Orca reply schemas so unknown fields pass and unknown enum values map to a neutral `unknown` (DECK-R42). Audit the `*-reply-schema.ts` files the deck will read and list strict ones.
  - Accept: tests feed an unknown field and an unknown status value and get data + `unknown`; the audit lists every schema the ledger's R rows rely on.

### Step 2 — Orca design system for the deck, host refusal screen (`CF02`)

- **T10 — Build the deck theme on Orca's design system**
  - Files: `mobile/src/deck/theme/deck-theme.ts` (create), `mobile/src/deck/theme/deck-theme.test.ts` (create)
  - Do: DECK-R34: re-export Orca's `paletteForScheme`, `spacing`, `radii`, `typography`, `feedback` under the maquette's role names (PRD §7.8 table) and add only page title size (22), focus ring, and wheel kind colours/shapes derived from Orca's palette. Follows Orca's light/dark scheme and appearance preference.
  - Accept: test asserts every deck role resolves to an Orca token or a listed addition, in both schemes; status colours meet contrast on their pane backgrounds (approach from `theme/mobile-theme-contrast.test.ts`).
- **T104 — Component reuse inventory**
  - Files: `mobile/src/deck/REUSE.md` (create)
  - Do: For each deck element in PRD §7.8's table, confirm the Orca component exists after T1, is router-free (or name the one router reference to lift out, e.g. `MobileFileExplorerPanel`), and note props the deck needs. Add a row per new deck component with why no Orca piece fit (DECK-R50).
  - Accept: every §7.8 row has a verified path and a reuse verdict; `rg` confirms each path exists.
- **T106 — Deck design guard**
  - Files: `mobile/src/deck/deck-design-guard.test.ts` (create)
  - Do: Source scan of `src/deck/**` (except `theme/deck-theme.ts`): fails on hex/`rgb(` colour literals, numeric `fontSize`, `borderRadius` and `fontFamily` literals, and imports of maquette `logos/` when `MobileAgentIcon` has the agent (DECK-R34, R35). Same idea as the desktop design-system lint in `AGENTS.md`.
  - Accept: passes on the deck; a probe file with `color: '#fff'` makes it fail.
- **T13 — Host refusal screen**
  - Files: `mobile/src/deck/host/DeckHostRefusal.tsx` (create, + render test)
  - Do: When `transport/protocol-compat.ts` reports the desktop refuses this client, reuse `ProtocolBlockScreen`'s wording and `MobileStateView`; show the plain reason and the in-app Update entry (wired in T23). DECK-R43, DECK-R39.
  - Accept: render test with a refused verdict shows the message and an Update control; with a compatible verdict renders children.

### Step 3 — Fork update source and download (`CF03`)

- **T17 — Fork release update source**
  - Files: `mobile/src/deck/updates/fork-release-update-source.ts` (create, + test with fixtures)
  - Do: Implements the existing `AppUpdateSource` interface (`app-update/app-update-source.ts`) against the fork repo and tag prefix; returns version, APK asset URL, size and `digest` (sha256) when GitHub provides it. Reuse `parseMobileAndroidTagVersions`-style parsing; do not edit upstream's source (DECK-R47).
  - Accept: tests cover newer version found, no newer version, tag without APK, rate-limited reply (error surfaced), never contacting `stablyai/orca`.
- **T19 — Download and verify the update**
  - Files: `mobile/src/deck/updates/download-update.ts` (create, + test)
  - Do: `expo-file-system` resumable download to the cache dir with progress callback; verify size and sha256 (`expo-crypto`) against T17's digest; delete on mismatch.
  - Accept: tests (mocked FS) cover progress, success, digest mismatch → error and file removed, cancel.
- **T22 — Point Orca's update runtime at the fork source**
  - Files: `mobile/src/app-update/app-update-runtime.ts` (edit)
  - Do: Use the fork source from T17 so Orca's own screens (version strip, Settings rows) never offer upstream's APK. Log the touch.
  - Accept: `pnpm test src/app-update` passes with a test asserting the configured source repo is the fork.

### Step 4 — Fork release pipeline (workflow and script edits only) (`CF09`)

- **T15 — Require the fork's release signing key in CI**
  - Files: `.github/workflows/mobile-android-release.yml` (edit), `mobile/src/mobile-release/` (edit the signing plugin/script the workflow uses)
  - Do: Read keystore, alias and passwords from fork secrets; fail the job when any is missing; never fall back to the debug key (DECK-R45). Document the off-repo backup location in `mobile/src/deck/RELEASING.md` (create).
  - Accept: a dispatch run without secrets fails at the signing step; with secrets, `apksigner verify --print-certs` on the artifact shows the fork certificate.
- **T16 — Publish releases to the fork under its own tag prefix**
  - Files: `.github/workflows/mobile-android-release.yml` (edit)
  - Do: Tag prefix from D3; release created on `Theodagan/orcapad`; remove or guard the job that checks out `stablyai/orca-marketing-website` (line ~274), which cannot run in the fork (DECK-R46).
  - Accept: a `workflow_dispatch` run creates a release on the fork with one `.apk` asset and the expected tag.

### Step 5 — Deck controller contract (`CF04`)

- **T66 — Split keys setting**
  - Files: `mobile/src/deck/settings/deck-settings-store.ts` (create, + test)
  - Do: Deck settings store (split vs bottom keys, focus tick, haptics, sounds, prototype notes); used by T36, T65, T88.
  - Accept: tests for defaults and persistence.
- **T25 — Deck chord table**
  - Files: `mobile/src/deck/controller/chord-table.ts` (create, + test)
  - Do: One table: control/chord → intent → label → screen scope, per PAD-1…13, NAV-*, IH-6. Single source for bindings, hints (T33) and Help (T35).
  - Accept: test asserts no duplicate chord per scope and every intent has a label.
- **T26 — Deck binding layer over the existing input runtime**
  - Files: `mobile/src/deck/controller/use-deck-bindings.ts` (create), `mobile/src/gamepad/bindings/surface-binding.ts` (edit only if a hook point is missing; log it)
  - Do: While the deck is mounted, deck intents from the chord table take the controller via `controller-input/controller-runtime.ts` and `bindings/use-surface-binding.ts`; Orca-screen bindings stay inactive.
  - Accept: a composed-screen test (spec 005 standard) shows a deck intent fires and no Orca-screen binding fires.
- **T27 — Contract: A / X / B, and B never switches destination**
  - Files: `mobile/src/deck/controller/contract-face-buttons.test.tsx` (create), `use-deck-bindings.ts` (edit)
  - Do: PAD-1, PAD-11 (Y+B is the only back).
  - Accept: test: B dismisses an open layer and does nothing else at root; Y+B pops history.
- **T28 — Contract: L1/R1 and Y + L1/R1 tap / long-press**
  - Files: `mobile/src/deck/controller/contract-shoulders.test.tsx` (create), `use-deck-bindings.ts` (edit)
  - Do: PAD-2; PAD-6 with 450 ms long-press via `controller-input/tap-tracker.ts`, haptic on toggle.
  - Accept: test with fake timers: tap moves panel focus, 450 ms hold toggles panel and fires haptic once.
- **T29 — Contract: L2/R2 analog scroll everywhere**
  - Files: `mobile/src/deck/controller/use-deck-scroll.ts` (create, + test)
  - Do: PAD-3, SCR-11; reuse `bindings/controller-scroll-rate.ts` and `controller-scroll-tracker.ts`.
  - Accept: test: trigger value maps to scroll rate monotonically; no other trigger meaning outside a wheel or Y chord.
- **T30 — Contract: Y is a modifier only**
  - Files: `mobile/src/deck/controller/contract-modifier.test.tsx` (create), `use-deck-bindings.ts` (edit)
  - Do: PAD-9 per D2; reuse `controller-input/use-modifier-held.ts`.
  - Accept: test: Y press/release alone fires no intent; Y held switches the active scope to the Y layer.
- **T31 — Contract: arrows bound to the focused pane, one focus, stable restore**
  - Files: `mobile/src/deck/focus/deck-focus.ts` (create, + test)
  - Do: NAV-6/7/11/12 on `gamepad/focus/focus-registry.ts` and `zones/zone-grid.ts`; focus keys are stable ids.
  - Accept: test: arrows never leave the focused pane; exactly one focused element; re-render keeps focus on the same key.
- **T32 — Contract: Start, hold-Start dictation, L3/R3**
  - Files: `mobile/src/deck/controller/contract-start-sticks.test.tsx` (create), `use-deck-bindings.ts` (edit)
  - Do: PAD-7 (650 ms hold toggles dictation via `bindings/active-dictation.ts`); PAD-5 (L3/R3 alone inert; L3+R3 opens TUI wheels, wired in T81).
  - Accept: fake-timer test for 650 ms threshold; L3 alone fires nothing.
- **T33 — Hint strip with Y layer**
  - Files: `mobile/src/deck/hints/DeckHintStrip.tsx` (create, + render test)
  - Do: Reads the chord table for the current scope; shows the Y layer while Y is held (PAD-13, IH-6); never overflows (VIS-6, SD-2): drops lowest-priority hints.
  - Accept: render test at 640 px width shows no overflow; holding Y swaps content.
- **T34 — Hints on elements**
  - Files: `mobile/src/deck/hints/Hintify.tsx` (create, + test)
  - Do: HINT-2/6: focused element shows its button glyph; falls back to the strip when it would break layout (HINT-8).
  - Accept: test: focused hintified element renders glyph; constrained layout routes it to the strip.
- **T35 — Help diagram from live bindings**
  - Files: `mobile/src/deck/hints/DeckHelp.tsx` (create, + test)
  - Do: SD-10: controller drawing labelled from the chord table for the current screen.
  - Accept: test: changing a binding in the table changes the diagram label.
- **T36 — Focus tick**
  - Files: `mobile/src/deck/feedback/focus-tick.ts` (create, + test)
  - Do: SD-9: light click + `expo-haptics` on controller focus moves only, not taps; switch stored in deck settings.
  - Accept: test: pad focus move triggers once, touch focus does not, switch off silences.
- **T37 — Touch alternative registry**
  - Files: `mobile/src/deck/controller/touch-alternatives.test.ts` (create)
  - Do: DECK-R13/PAD-8: every timed or chorded intent in the chord table names its touch control.
  - Accept: test fails when a chorded intent lacks a touch alternative.
- **T105 — Pad-focus wrappers for Orca components**
  - Files: `mobile/src/deck/focus/focusable-orca.tsx` (create, + test)
  - Do: Small wrappers that put Orca components (rows, segmented control, switch, sheet primary button) in a `gamepad/zones/ZoneItem` with `ControllerFocusRing`, so pad focus is drawn without restyling the component and touch looks unchanged.
  - Accept: render test: a wrapped `WorktreeListRow` shows the focus ring only when focused and calls the same handler on A as on tap.

### Step 6 — APK installer, update flow and UI (`CF08`)

- **T18 — APK installer**
  - Files: `mobile/package.json` (edit: add `expo-intent-launcher`), `mobile/app.json` (edit: `android.permissions` += `REQUEST_INSTALL_PACKAGES`), `mobile/src/deck/updates/apk-installer.ts` (create)
  - Do: Implement D6 directly (no device spike): `FileSystem.getContentUriAsync` + `IntentLauncher.startActivityAsync` with `INSTALL_PACKAGE`/`VIEW`, `GRANT_READ_URI_PERMISSION`, APK MIME type; add `expo-intent-launcher` and the `REQUEST_INSTALL_PACKAGES` permission. If a FileProvider turns out to be required, add it in a deck-owned config plugin.
  - Accept: unit tests (mocked `expo-file-system` / `expo-intent-launcher`) cover success, missing file, intent refused; `app.json` declares the permission. Installing on a device is part of the owner's local test.
- **T20 — Update state store**
  - Files: `mobile/src/deck/updates/deck-update-store.ts` (create, + test)
  - Do: States `idle → checking → available → downloading(progress) → ready → installing | error(reason)`; check on launch (non-blocking) and on demand; composes T17, T19, T18.
  - Accept: state-machine tests cover every transition and every error reason (DECK-R49).
- **T21 — Unknown-sources guidance**
  - Files: `mobile/src/deck/updates/install-permission-explainer.tsx` (create, + render test)
  - Do: Before the first install, explain Android's "install unknown apps" permission and open that setting via `IntentLauncher` (`MANAGE_UNKNOWN_APP_SOURCES` with package URI).
  - Accept: render test shows the explainer once (persisted flag) and its button calls the intent.
- **T23 — Deck update UI**
  - Files: `mobile/src/deck/updates/DeckUpdatePanel.tsx` (create), `mobile/src/deck/updates/DeckUpdateNotice.tsx` (create), render tests
  - Do: Reuse `home/AppUpdateCard` and `settings/settings-app-update-section` presentation where they fit, fed by the deck store. Panel: installed/latest versions, Check, Update, progress, errors as they are. Notice: non-blocking toast on launch when a version is available. Reachable by pad and touch (DECK-R47, R49). Placed in Settings in T92.
  - Accept: render tests for each store state; pad focus reaches every control.

### Step 7 — Navigation shell (`CF05`)

- **T38 — Destinations registry**
  - Files: `mobile/src/deck/navigation/destinations.ts` (create, + test)
  - Do: UXA-R18: Overview (landing), Sessions, Projects, Approvals, Ports, Settings; one registry feeds nav, left wheel and previews.
  - Accept: test asserts order, landing, and unique ids.
- **T39 — Deck routes per destination**
  - Files: `mobile/app/deck/(dest)/overview.tsx`, `sessions.tsx`, `projects.tsx`, `approvals.tsx`, `ports.tsx`, `settings.tsx` (create, placeholders)
  - Do: One route per destination, each rendering an empty state with `MobileStateView` that says what is empty (DECK-R38).
  - Accept: each route renders on device; render tests for empty states. → the device part is the owner's later test; you prove the behaviour in code (and against `pnpm mock-server` where it serves the data).
- **T40 — Context resolver**
  - Files: `mobile/src/deck/context/deck-context.ts` (create, + test)
  - Do: UXA-R23: current host / project / workspace / session / request from the route + stores; session actions only on session screens (DECK-R4).
  - Accept: table test over route shapes returns the right context and session-action visibility.
- **T41 — Navigation history and Y + B**
  - Files: `mobile/src/deck/navigation/deck-history.ts` (create, + test)
  - Do: History stack for Y+B (PAD-11); B never pops it.
  - Accept: test: Overview → Projects → workspace, Y+B twice returns to Overview.
- **T42 — Panel columns system**
  - Files: `mobile/src/deck/panels/PanelColumns.tsx` (create), `mobile/src/deck/panels/panel-registry.ts` (create), tests
  - Do: DECK-R3/PANEL-1/PNL-2: left and right columns split width, never overlay; right panels per screen from a registry that returns disabled reasons.
  - Accept: render test at landscape and portrait widths: content width shrinks, no overlap; disabled panel shows reason.
- **T43 — Left panels: Quick menu and All open**
  - Files: `mobile/src/deck/panels/left/QuickMenu.tsx`, `AllOpen.tsx` (create, + tests)
  - Do: PANEL-1 content from destinations and open items.
  - Accept: render tests; pad selection opens the target.
- **T44 — Breadcrumb header**
  - Files: `mobile/src/deck/chrome/DeckHeader.tsx` (create, + test)
  - Do: Chat UI / TUI switch with `MobileSegmentedControl`. NAV-13, IH-4, SD-5: one header row with breadcrumb, item tabs when several, Chat UI / TUI switch.
  - Accept: render tests for host, project, workspace and session contexts.
- **T45 — Shared grouping**
  - Files: `mobile/src/deck/collections/grouping.ts` (create, + test)
  - Do: SES-6, GROUP-1: one grouping used by every list.
  - Accept: test: same input → same groups for list and panel consumers.
- **T46 — Collection model**
  - Files: `mobile/src/deck/collections/collection-model.ts` (create, + test)
  - Do: COL-*: items, selection, layout kind; status buckets from agent status data (`components/WorktreeAgentSummary.tsx` source hooks, `session/mobile-terminal-tab-agent.ts`) parsed via T12.
  - Accept: test maps fixture host data (test-only) to buckets including an unknown status → neutral.
- **T47 — Carousel shell**
  - Files: `mobile/src/deck/collections/CarouselShell.tsx` (create, + test)
  - Do: SD-6, SD-11: one shell, layout tabs, L1/R1 item moves, swipe parity (COL-6).
  - Accept: render test: L1/R1 and swipe move selection identically.
- **T48 — Sessions layouts: Cards, Kanban, List, Grid**
  - Files: `mobile/src/deck/collections/layouts/CardsLayout.tsx`, `KanbanLayout.tsx`, `ListLayout.tsx`, `GridLayout.tsx` (create, + tests)
  - Do: SES-0, IH-10 per maquette `collections.js`; items built from `WorktreeAgentRow`, `AgentStateDot`, `StatusDot`, `MobileAgentIcon`, `AgentSpinner`; layout tabs with `MobileSegmentedControl`.
  - Accept: render test per layout; maquette side-by-side noted in `COVERAGE.md`.

### Step 8 — Destinations on live data (`CF06`)

- **T49 — Sessions destination on live data**
  - Files: `mobile/app/deck/(dest)/sessions.tsx` (edit), `mobile/src/deck/sessions/use-deck-sessions.ts` (create, + test)
  - Do: Sessions across hosts from `worktree/worktree-list-snapshot.ts`, `transport/use-all-host-clients.ts`, session tabs stream.
  - Accept: on device, sessions of a paired desktop appear with correct status buckets. → the device part is the owner's later test; you prove the behaviour in code (and against `pnpm mock-server` where it serves the data).
- **T50 — Projects destination**
  - Files: `mobile/app/deck/(dest)/projects.tsx` (edit), `mobile/src/deck/projects/use-deck-projects.ts` (create, + test)
  - Do: Rows from `WorktreeListRow`, `WorktreeMetaGlyphs`, `MobileRepoIcon`. PRJ-*, SPACE-2: projects and worktrees from `worktree/use-workspace-sections.ts`, `server-repos.ts`.
  - Accept: on device, projects list matches desktop; folder workspaces appear too. → the device part is the owner's later test; you prove the behaviour in code (and against `pnpm mock-server` where it serves the data).
- **T51 — Workspace screen and item tabs**
  - Files: `mobile/app/deck/w/[hostId]/[worktreeId].tsx` (create), `mobile/src/deck/workspace/DeckWorkspace.tsx` (create, + test)
  - Do: SPACE-4, NAV-13: items = agents · browser tabs · files, each keeping its landing spot.
  - Accept: entering a workspace from Projects shows its items; returning restores the last item.
- **T52 — Create workspace**
  - Files: `mobile/src/deck/projects/DeckCreateWorkspace.tsx` (create, + test)
  - Do: Reuse `NewWorktreeFormSheet` and the `use-new-workspace-*` hooks (router-free), wrapped for pad focus; deck layout and split keys later (T67).
  - Accept: on device, a new worktree is created and entered. → the device part is the owner's later test; you prove the behaviour in code (and against `pnpm mock-server` where it serves the data).
- **T53 — Overview screen**
  - Files: `mobile/app/deck/(dest)/overview.tsx` (edit), `mobile/src/deck/overview/*.tsx` (create, + tests)
  - Do: IH-9, OVR-1: agents by status, latest tool calls, Needs you, network and battery; host CPU/RAM/bandwidth shown unavailable (H). Account usage via `AccountUsage`; agents via `WorktreeAgentList`.
  - Accept: on device Overview reflects live agents; H tiles show reasons. → the device part is the owner's later test; you prove the behaviour in code (and against `pnpm mock-server` where it serves the data).
- **T54 — Ports destination (list only)**
  - Files: `mobile/app/deck/(dest)/ports.tsx` (edit), `mobile/src/deck/ports/use-deck-ports.ts` (create, + test)
  - Do: PRJ-4 from the workspace-ports RPC; opening is T86.
  - Accept: ports of a running dev server appear on device. → the device part is the owner's later test; you prove the behaviour in code (and against `pnpm mock-server` where it serves the data).

### Step 9 — Session loop (`CF07`)

- **T55 — Session screen frame**
  - Files: `mobile/app/deck/s/[hostId]/[worktreeId].tsx` (create), `mobile/src/deck/session/DeckSession.tsx` (create, + test)
  - Do: Session screen inside the workspace header; Chat UI / TUI switch (SES-1).
  - Accept: opening a session from Sessions or a workspace lands here on device. → the device part is the owner's later test; you prove the behaviour in code (and against `pnpm mock-server` where it serves the data).
- **T56 — Chat transcript on the native chat controller**
  - Files: `mobile/src/deck/session/DeckTranscript.tsx` (create, + test)
  - Do: Data from `session/native-chat/use-mobile-native-chat-controller.ts`; message bodies through `MobileMarkdown`; reuse native-chat row components (tool runs, reasoning, notices) where their layout fits a column; deck layout and focus.
  - Accept: on device, a live Claude Code session streams into the transcript; L2/R2 scroll works. → the device part is the owner's later test; you prove the behaviour in code (and against `pnpm mock-server` where it serves the data).
- **T57 — TUI view**
  - Files: `mobile/src/deck/session/DeckTerminal.tsx` (create, + test)
  - Do: Wrap `session/TerminalPaneView.tsx`; SCR-11 scroll; IME suppressed.
  - Accept: on device, switching to TUI shows the agent terminal and accepts keys. → the device part is the owner's later test; you prove the behaviour in code (and against `pnpm mock-server` where it serves the data).
- **T58 — Composer**
  - Files: `mobile/src/deck/session/DeckComposer.tsx` (create, + test)
  - Do: SES-9: one composer under the conversation; send via the native chat controller; `showSoftInputOnFocus={false}` (KEY-9).
  - Accept: on device, a typed (split keys stub) message is sent and appears. → the device part is the owner's later test; you prove the behaviour in code (and against `pnpm mock-server` where it serves the data).
- **T59 — Mode · model indicator and Agent panel**
  - Files: `mobile/src/deck/session/AgentPanel.tsx` (create, + test)
  - Do: SES-7 on `use-mobile-native-chat-session-option-controller.ts`; options gated by T11.
  - Accept: on device, changing model takes effect on the next turn. → the device part is the owner's later test; you prove the behaviour in code (and against `pnpm mock-server` where it serves the data).
- **T60 — Inline prompt strip and hero band**
  - Files: `mobile/src/deck/approvals/PromptStrip.tsx`, `HeroBand.tsx` (create, + tests)
  - Do: SAFE-2, HINT-3, SD-7, REQ-INLINE from `use-mobile-native-chat-prompts.ts` / `prompt-cards`.
  - Accept: on device, a permission request shows inline with the exact request. → the device part is the owner's later test; you prove the behaviour in code (and against `pnpm mock-server` where it serves the data).
- **T61 — Decision confirmation**
  - Files: `mobile/src/deck/approvals/DecisionConfirm.tsx` (create, + test)
  - Do: Frame from `ConfirmModal` (content is the deck's). SAFE-1/DECK-R25: confirmation shows request, operation, effect; bound to the request id; sends via `mobile-native-chat-permission-send.ts`.
  - Accept: test: a stale request id cannot be confirmed; a trigger alone never decides.
- **T62 — Deny with feedback**
  - Files: `mobile/src/deck/approvals/DenyWithFeedback.tsx` (create, + test)
  - Do: SAFE-7: offered only when the prompt accepts free text; otherwise absent.
  - Accept: tests for both prompt kinds.
- **T65 — Split keys keyboard**
  - Files: `mobile/src/deck/keys/SplitKeys.tsx`, `split-keys-layout.ts` (create, + tests)
  - Do: KEY-2/3/4/10, IH-14: halves in side-panel slots (landscape), bottom keys (portrait), dual cursors per maquette `keyboard.js`; landscape slot geometry from `layout/side-rail-strip.ts` (`getSideRailStrip`, keyboard occlusion).
  - Accept: render tests for both orientations; pad types into a field on device. → the device part is the owner's later test; you prove the behaviour in code (and against `pnpm mock-server` where it serves the data).
- **T67 — No Android IME on deck fields**
  - Files: `mobile/src/deck/keys/deck-text-field.tsx` (create), `mobile/src/deck/keys/ime-guard.test.ts` (create)
  - Do: One deck text field wrapper with `showSoftInputOnFocus={false}`; test scans `src/deck/**` for raw `TextInput`.
  - Accept: guard test fails on a raw `TextInput` probe.
- **T68 — Dictation notch**
  - Files: `mobile/src/deck/dictation/DictationNotch.tsx` (create, + test)
  - Do: MIC-1…4 on `hooks/use-mobile-dictation.ts`; inserts only recognised text (SAFE-4).
  - Accept: on device, hold Start dictates into the composer. → the device part is the owner's later test; you prove the behaviour in code (and against `pnpm mock-server` where it serves the data).
- **T69 — Notifications panel, toasts, Needs you**
  - Files: `mobile/src/deck/notifications/*.tsx` (create, + tests)
  - Do: Toasts with `TransientToast`. SD-8, SD-4, DIAL-14 data from `notifications/desktop-notification-events.ts`.
  - Accept: on device, an agent needing input raises a toast and appears in Needs you. → the device part is the owner's later test; you prove the behaviour in code (and against `pnpm mock-server` where it serves the data).

### Step 10 — Approvals inbox (`CF10`)

- **T63 — Choose the app-wide pending prompts source**
  - Files: `mobile/src/deck/approvals/inbox-source.md` (create)
  - Do: From the code (subscriptions in `transport/`, native-chat prompt hooks, mock server): can existing subscriptions list pending prompts across sessions, or is a per-session subscription needed? Pick the cheapest correct source and record it as D5.
  - Accept: the note names the source, its cost and why; T64 builds on it.
- **T64 — Approvals inbox**
  - Files: `mobile/app/deck/(dest)/approvals.tsx` (edit), `mobile/src/deck/approvals/use-deck-approvals.ts` (create, + test)
  - Do: SAFE-5 from T63's source; decisions reuse T61; documentation fields Orca lacks shown as H.
  - Accept: on device, prompts from two sessions appear and can be decided from the inbox. → the device part is the owner's later test; you prove the behaviour in code (and against `pnpm mock-server` where it serves the data).

### Step 11 — Wheels (`CF11`)

- **T72 — Dev-only wheel latency readout**
  - Files: `mobile/src/deck/wheels/latency-readout.tsx` (create, + test)
  - Do: No device spike. A dev-setting overlay that shows stick-sample-to-frame latency (p50/p95) while wheels turn, so the owner can judge it during local testing. Samples arrive as JS events from `OrcaGamepadModule.kt`.
  - Accept: test feeds timestamped samples and frames and gets the right percentiles; the overlay is off by default.
- **T74 — Wheel engine on Reanimated**
  - Files: `mobile/src/deck/wheels/wheel-engine.ts` (create, + test)
  - Do: DECK-R18: click-wheel ring under a fixed selector, rate curve and S-curve gain, 1/8-turn distance guard, no snap, loop above six entries. Reuse `gamepad/wheel/wheel-geometry.ts` math.
  - Accept: unit tests for gain curve, distance guard and looping rule; no JS-thread `setState` per frame.
- **T75 — Hold gesture model**
  - Files: `mobile/src/deck/wheels/wheel-gesture.ts` (create, + test)
  - Do: DECK-R17: past dead zone opens the side's wheel; opposite trigger validates; same-side trigger steps back; centre closes (DIAL-0, 25, 31, 33).
  - Accept: sample-sequence tests for each path.
- **T76 — Wheel view and readout card**
  - Files: `mobile/src/deck/wheels/DeckWheel.tsx`, `WheelReadout.tsx` (create, + tests)
  - Do: DECK-R20: kind coded by colour, shape and label; badges; readout previews selection (DIAL-2, 9, 16, 18, 22).
  - Accept: render tests; duplicate entries rejected.
- **T77 — Left wheel content**
  - Files: `mobile/src/deck/wheels/left-wheel.ts` (create, + test)
  - Do: DIAL-14, DIAL-19: destinations, Needs you, open sessions in the workspace.
  - Accept: test: entries follow destinations registry and live counts.
- **T78 — Right wheel and Launch agent rim**
  - Files: `mobile/src/deck/wheels/right-wheel.ts`, `SubWheelRim.tsx` (create, + tests)
  - Do: IH-12 session actions; DIAL-17/28 Launch agent as sub-wheel rim using `session/mobile-agent-launch-availability.ts`.
  - Accept: on device, launching an agent from the rim starts it. → the device part is the owner's later test; you prove the behaviour in code (and against `pnpm mock-server` where it serves the data).
- **T79 — Summoned wheels by edge swipe**
  - Files: `mobile/src/deck/wheels/SummonedWheel.tsx` (create, + test)
  - Do: DIAL-13 with gesture-handler; DIAL-20 purpose-summoned style.
  - Accept: touch-only test opens and turns the wheel.
- **T80 — Open/close animation and reduce motion**
  - Files: `mobile/src/deck/wheels/wheel-motion.ts` (create, + test)
  - Do: DIAL-8, DIAL-23; reduce motion skips.
  - Accept: test: reduce motion → zero-duration transitions.
- **T81 — TUI key wheels**
  - Files: `mobile/src/deck/wheels/tui-key-wheels.ts` (create, + test)
  - Do: DIAL-6: literal key bytes through Orca's terminal input; opened by L3+R3 (T32).
  - Accept: on device, Esc / Ctrl-C / arrows reach the TUI. → the device part is the owner's later test; you prove the behaviour in code (and against `pnpm mock-server` where it serves the data).
- **T82 — Wheel edit mode with Undo**
  - Files: `mobile/src/deck/wheels/wheel-edit.ts`, `mobile/src/deck/feedback/undo-toast.tsx` (create, wraps `TransientToast`, + tests)
  - Do: DIAL-11, SAFE-6: edit from the wheel, saved per wheel, Undo toast built on `TransientToast`.
  - Accept: tests: edit persists across restart; Undo restores.
- **T83 — Retire the old wheel overlay inside the deck**
  - Files: `mobile/src/deck/controller/use-deck-bindings.ts` (edit)
  - Do: Deck screens never mount `gamepad/wheel/WheelOverlay.tsx`; Orca screens keep it until Slice 10.
  - Accept: composed test: stick hold on a deck screen opens only the deck wheel.

### Step 12 — Review: files, source control, browser, message actions (`CF12`)

- **T85 — File items with Diff / File views and line notes**
  - Files: `mobile/src/deck/review/DeckFileItem.tsx` (create, + test)
  - Do: Embed `MobileDiffReviewScreenView` / `MobileDiffReviewBody` and `files/MobileFilePreviewBody`. FILE-1…3 on `session/mobile-diff-*` and `files/mobile-file-preview-*`; notes = diff comments.
  - Accept: on device, open a changed file, switch Diff/File, add a note. → the device part is the owner's later test; you prove the behaviour in code (and against `pnpm mock-server` where it serves the data).
- **T86 — Ports and browser tab items**
  - Files: `mobile/src/deck/review/DeckBrowserItem.tsx` (create, + test)
  - Do: WEB-1/2: a port opens as a browser item in its workspace on `browser/MobileBrowserPaneView.tsx`; full screen.
  - Accept: on device, a dev server port opens as an item. → the device part is the owner's later test; you prove the behaviour in code (and against `pnpm mock-server` where it serves the data).
- **T87 — Notes travel with the next prompt**
  - Files: `mobile/src/deck/session/DeckComposer.tsx` (edit), `mobile/src/deck/review/note-chips.tsx` (create, + test)
  - Do: FILE-4, DECK-R27: note chips in the composer, sent with the next prompt, cleared after.
  - Accept: test: chips included in the sent payload once.
- **T88 — Source control panel with Y + L2/R2 stage / unstage**
  - Files: `mobile/src/deck/review/DeckSourceControl.tsx` (create, + test)
  - Do: Embed `source-control/MobileSourceControlContent` / `MobileSourceControlFileRows`. FILE-5, DECK-R30 on `source-control/mobile-git-*-operations.ts`; commit box per Orca support.
  - Accept: on device, stage and unstage by chord; commit works. → the device part is the owner's later test; you prove the behaviour in code (and against `pnpm mock-server` where it serves the data).
- **T89 — Message actions: Quote and Fork; Revert disabled**
  - Files: `mobile/src/deck/session/MessageActions.tsx` (create, + test)
  - Do: MSG-1/3 on `session/mobile-native-chat-cli-fork.ts` and fork feedback; MSG-2 disabled with reason.
  - Accept: on device, fork creates a session; Revert shows its reason. → the device part is the owner's later test; you prove the behaviour in code (and against `pnpm mock-server` where it serves the data).
- **T90 — Forks panel**
  - Files: `mobile/src/deck/session/ForksPanel.tsx` (create, + test)
  - Do: SES-4: forks Orca knows; compare only when data exists.
  - Accept: render test with and without compare data.
- **T91 — Session log panel**
  - Files: `mobile/src/deck/session/SessionLogPanel.tsx` (create, + test)
  - Do: SES-3 from chat events / `agent-history/`; labels missing parts.
  - Accept: on device, the log lists turns and tool runs. → the device part is the owner's later test; you prove the behaviour in code (and against `pnpm mock-server` where it serves the data).

### Step 13 — Polish and gaps (`CF13`)

- **T92 — Settings destination complete**
  - Files: `mobile/app/deck/(dest)/settings.tsx` (edit), `mobile/src/deck/settings/*.tsx` (create, + tests)
  - Do: SET-1…3 General, Controls, Themes (Orca's `mobile-appearance.ts` preference); rows with `MobileSwitch`; embed `voice-settings-screen` and `notification-settings-screen`; Hosts reusing pair-scan / confirm flows (SET-6/7); Updates panel from T23; Interface switch.
  - Accept: every control reachable by pad and touch; pairing a new desktop works from deck Settings.
- **T93 — Wheel forms**
  - Files: `mobile/src/deck/wheels/forms/*.tsx` (create, + tests)
  - Do: DIAL-29/32/34/35 per maquette `wheel-forms.js`.
  - Accept: render and gesture tests per form.
- **T94 — Every H row shown disabled with reason**
  - Files: `mobile/src/deck/COVERAGE.md` (edit), affected deck components (edit)
  - Do: Walk all H rows; each has a placed, disabled control with reason or is explicitly omitted.
  - Accept: a test enumerates H rows from a typed copy of the ledger and finds a component or an omission note for each.
- **T95 — Port maquette checks**
  - Files: `mobile/src/deck/maquette-checks/*.test.ts(x)` (create)
  - Do: One test per applicable `Pocketdeck/explorations/maquette-v3/checks.js` check, rule ID in the name; skipped ones listed with reason in `COVERAGE.md`.
  - Accept: `pnpm test src/deck/maquette-checks` passes; skip list complete.
- **T96 — Reachability gate**
  - Files: `mobile/src/deck/reachability.test.tsx` (create)
  - Do: NAV-1 and NAV-9: every visible control reachable by pad and by tap at its centre, landscape and portrait, panels open and closed.
  - Accept: test passes for every deck screen state.
- **T97 — Upstream candidates list**
  - Files: `mobile/src/deck/UPSTREAM-CANDIDATES.md` (create)
  - Do: H rows worth proposing to Orca (Revert, CPU/RAM, capability declarations, stable RPCs the deck uses), ranked (PRD Q4).
  - Accept: each candidate names the RPC or capability it needs.

### Step 14 — Newer-desktop compatibility (`CF14`)

- **T98 — Missing-feature host fixture tests**
  - Files: `mobile/src/deck/host/compat-missing-features.test.tsx` (create)
  - Do: Mount key deck screens against a host that declares none of the optional capabilities; each gated control shows its reason (DECK-R41).
  - Accept: test passes; removing a gate makes it fail.
- **T99 — Unknown-data host fixture tests**
  - Files: `mobile/src/deck/host/compat-unknown-data.test.tsx` (create)
  - Do: Feed unknown fields and unknown status/kind values to Sessions, Overview, Approvals; screens render with neutral states (DECK-R42).
  - Accept: test passes; switching a parser to strict makes it fail.

### Step 15 — Deck by default and cleanup (`CF15`)

- **T71 — Make the deck the default interface**
  - Files: `mobile/src/deck/entry/interface-preference.ts` (edit)
  - Do: Default `'deck'` once T70 passes; Orca remains selectable.
  - Accept: fresh install opens the deck.
- **T101 — Restore upstream's host routes for Orca screens**
  - Files: `mobile/app/h/[hostId]/**` (edit to upstream), `mobile/src/components/HostProtocolGate.tsx` (edit to upstream)
  - Do: Already true from the T1 baseline (Orca's routes are upstream's). Only verify nothing in `mobile/app/h/**` diverged from upstream since.
  - Accept: `git diff upstream/main -- mobile/app/h` is empty.
- **T102 — Remove gamepad bindings that only drove native Orca screens**
  - Files: `mobile/src/gamepad/bindings/use-*-controller-binding.ts` (delete those with no remaining consumer), `mobile/src/gamepad/gamepad-boundary.test.ts` (edit)
  - Do: Keep input plumbing the deck uses (controller-input, focus, zones); remove bindings for screens that no longer exist natively.
  - Accept: `pnpm typecheck && pnpm test && pnpm lint` pass; `rg` finds no imports of deleted files.
- **T103 — Drop the revert check from the merge checklist**
  - Files: `mobile/scripts/deck-upstream-check.mjs` (edit), fork memory note `fork-keeps-native-screens` (edit)
  - Do: Checklist item 3 is obsolete since the T1 baseline (no reverts to keep): remove it now rather than after M3; memory note already updated.
  - Accept: script no longer reports item 3; note updated.

## Not in this run

Owner-only, after delivery: device checks, the M3 acceptance run, wheel feel, screenshots,
creating the signing key and secrets, running the release workflow, the update trial and the
newer-desktop trial. T73 (native stick path) only if the owner's test shows wheel lag.

## Done for this run

- All steps attempted in order; each is done, partial (with what's missing) or skipped (with why).
- `pnpm check:changed` passes on the final push; `mobile/` typecheck and lint pass; the app boots
  with the Interface setting on Orca and on Deck.
- The PR description lists what the owner should try on the device, step by step.
