# PocketDeck cloud handoff

Work packages for cloud agents building **PocketDeck**: a controller-first interface for Orca Mobile
on Android handhelds, in `mobile/src/deck/` and `mobile/app/deck/`. Each `CFnn-*.md` file is one
feature: dispatch it as one worker, one branch and one PR.

**Policy: implement first, test later.** Every feature is implementation the cloud can finish on
its own: there are no device spikes and no owner gates between features. The owner tests on the
Retroid handheld after delivery; failures come back as new dispatches. Anything a card says happens
"on device" is therefore _not_ your bar: prove the same behaviour with tests (and `pnpm mock-server`).

## Features

| Feature                               | What                                            | Dispatch when merged   |
| ------------------------------------- | ----------------------------------------------- | ---------------------- |
| [CF01](./CF01-seam-skeleton.md)       | Seam and shell skeleton                         | baseline on `main`     |
| [CF02](./CF02-orca-design-system.md)  | Orca design system, host refusal screen         | CF01                   |
| [CF03](./CF03-updates-core.md)        | Fork update source and download                 | CF01                   |
| [CF09](./CF09-release-pipeline.md)    | Fork release pipeline (workflow edits)          | CF01                   |
| [CF04](./CF04-controller-contract.md) | Deck controller contract                        | CF02                   |
| [CF08](./CF08-updates-install.md)     | APK installer, update flow and UI               | CF02, CF03             |
| [CF05](./CF05-navigation-shell.md)    | Navigation shell                                | CF04                   |
| [CF06](./CF06-destinations-live.md)   | Destinations on live data                       | CF05                   |
| [CF07](./CF07-session-loop.md)        | Session loop                                    | CF06                   |
| [CF10](./CF10-approvals-inbox.md)     | Approvals inbox (source chosen from code)       | CF07                   |
| [CF11](./CF11-wheels.md)              | Wheels (with a dev latency readout)             | CF07                   |
| [CF12](./CF12-review.md)              | Files, source control, browser, message actions | CF07                   |
| [CF13](./CF13-polish.md)              | Polish and gaps                                 | CF08, CF10, CF11, CF12 |
| [CF14](./CF14-compat-tests.md)        | Newer-desktop compatibility tests               | CF10, CF12             |
| [CF15](./CF15-deck-default.md)        | Deck by default and cleanup                     | CF13, CF14             |

Parallel waves: CF01 → CF02 ∥ CF03 ∥ CF09 → CF04 ∥ CF08 → CF05 → CF06 → CF07 → CF10 ∥ CF11 ∥ CF12
→ CF13 ∥ CF14 → CF15.

## Decisions

- **D2:** the deck's modifier is **Y** (PAD-9).
- **D3:** app id `com.theodagan.orcapad`, name **Orcapad**, release tag prefix `orcapad-android-v`
  (already applied in `mobile/app.json`).
- **D6:** in-app updates use `expo-file-system` content URIs + `expo-intent-launcher` +
  `REQUEST_INSTALL_PACKAGES`.
- **D5** (approvals source) is made by T63 inside CF10. **D4** (acceptance agents) concerns only the
  owner's test pass.

## Rules for every worker

### Repository

- This repository (`Theodagan/orcapad`) is a **public fork** of `stablyai/orca`. Branch from `main`,
  name the branch as the feature says, open one PR against `Theodagan/orcapad` `main`.
- Never push to, fetch-and-push, or open PRs on `stablyai/orca`. Never merge your own PR, never use
  `--admin`, never force-push `main`.
- Read `AGENTS.md` at the root. Rules that bite most here: no `max-lines` disables; no vague file
  names (`helpers`, `utils`…); one-line "why" comments only; no type assertions except `as const`
  (or a `SAFETY:` comment); reuse an existing Orca module before writing a new one.
- **Public repo:** never commit secrets, tokens, keystores, personal paths or emails. Do not paste
  design documents from the private `Theodagan/Pocketdeck` repository into this one: cite rule IDs
  and keep the short descriptions already in the task cards.

### Scope

- Everything new goes in `mobile/src/deck/` or `mobile/app/deck/`. No Orca module may import from
  them (a boundary test enforces it once CF01 lands).
- Any edit outside those folders is logged in `mobile/src/deck/UPSTREAM-TOUCHES.md` in the same
  commit: **append one line** (`path — reason — task`), never reorder, so parallel PRs merge cleanly.
- The deck takes every visual value from Orca's mobile design system (`mobile/src/theme/`) and
  reuses Orca components (`mobile/src/deck/REUSE.md` once CF02 lands). The maquette gives layout and
  behaviour only.
- Orca's own screens are upstream's downloaded web page; the fork adds only the pad plumbing
  (`mobile/src/gamepad/`, native module `mobile/modules/orca-gamepad/`), the deck and its app identity
  (`com.theodagan.orcapad`). The per-screen hooks in `mobile/src/gamepad/bindings/` (X modifier) have
  no consumers now: reshape what the deck needs into `mobile/src/deck/`, and do not wire them back
  into Orca's screens. The deck uses **Y** as modifier.
- Remote push is unavailable to this app (it needs the official Firebase project); never re-add
  `google-services.json` to `app.json`.
- Desktop code (`src/main`, the relay, the RPC protocol) is out of scope.

### Commands

From the repository root: `pnpm install`, then in `mobile/`: `pnpm install`.

In `mobile/`:

- Typecheck `pnpm typecheck`, tests `pnpm test [path]`, lint `pnpm lint`, format `pnpm format`.
- **Before your first change**, run `pnpm test` on the untouched branch and keep the failing set:
  your bar is _no new failures_, not zero.
- No desktop or device exists in the cloud. For live data, run `pnpm mock-server`
  (`scripts/mock-server.ts`: native chat scenario, session tabs, terminal, git and file fixtures).
  Extending its fixtures for a deck screen is allowed; log it in `UPSTREAM-TOUCHES.md`.
- Android builds are not required. Do not run release workflows.

### Design sources

- Requirements (`DECK-Rn`) are quoted in each feature file under _Requirements cited_.
- Behaviour rule IDs (`PAD-6`, `DIAL-25`, `SAFE-1`…) are defined in the private repository
  `Theodagan/Pocketdeck`, file `docs/ux/ux-rules.md`; the look and layout reference is
  `explorations/maquette-v3/` there (open `index.html`, no build). Paths written `Pocketdeck/…` in
  cards refer to that repository.
- If you cannot read `Theodagan/Pocketdeck` and a task's behaviour is not fully determined by its
  card and the cited requirements, **skip that task** and report it. Never invent behaviour.

### What you never do

- Device or desktop checks: a card's **Device part** is tested by the owner later. Say in your PR
  what the owner should try; do not claim it.
- Create, read or commit signing keys or secrets; run `workflow_dispatch`; change CI secrets.
- Reopen a decision listed above.

### Logging and reporting

- `mobile/src/deck/HANDOFF-LOG.md`: append one entry per task (`T<n> — status — commands run and
  results — notes`). Status is `done`, `done, owner check pending`, `skipped (reason)` or `blocked
  (reason)`.
- When a card is wrong (file moved, hook renamed, rule ID changed), do what the task needs, record
  the correction in the log and the PR, and keep task IDs unchanged.
- PR description: tasks done, skipped and why, owner checks to run, upstream touches, deviations.
- Stop and report instead of continuing when: a prerequisite feature is not on `main`; the baseline
  test run fails in a way that blocks the task; a task needs something listed in _What you never do_.
