# CF02 — Orca design system for the deck

**Goal:** Make the deck read every visual value from Orca's mobile design system, inventory the Orca components to reuse, add the test that keeps hard-coded styles out, then the host refusal screen.

|               |                                                                                 |
| ------------- | ------------------------------------------------------------------------------- |
| Dispatch when | CF01 merged                                                                     |
| Branch        | `deck/cf02-orca-design-system` from `main`                                      |
| PR            | `Theodagan/orcapad` `main`, title `deck(CF02): Orca design system for the deck` |
| Tasks         | T10, T104, T106, T13 (in this order)                                            |

Read [`README.md`](./README.md) first: it holds the rules every cloud worker follows.

## Feature done when

- Every task below meets its _Done when_ (cloud bar), with an entry in `mobile/src/deck/HANDOFF-LOG.md`.
- `pnpm typecheck`, `pnpm test`, `pnpm lint` in `mobile/` add no failures to the recorded baseline; `deck-boundary.test.ts` passes once it exists.
- The PR description lists: tasks done, tasks skipped and why, files touched outside `mobile/src/deck/` and `mobile/app/deck/` (also in `UPSTREAM-TOUCHES.md`), and what the owner should try on the device.

## Requirements cited

From the PRD (not in the repo). Rule IDs such as `PAD-6` are in `Theodagan/Pocketdeck` `docs/ux/ux-rules.md`.

- **DECK-R34** Deck styles read Orca's tokens through one deck theme module that adds only what
  Orca lacks (page title size, focus ring, wheel kind colours and shapes derived from Orca's
  palette). No hex values, font sizes or corner radii are written anywhere else in `deck/`. The deck
  supports Orca's light and dark schemes and the user's appearance preference (the maquette is dark
  only). Borders only for focus ring and primary action (VIS-8 amended), one focus language (SD-1).
- **DECK-R39** Errors from the host are shown as they are (connection lost, refused, version too
  old), not swallowed.
- **DECK-R43** When a desktop refuses the client (protocol below its minimum), the deck says so
  plainly and offers the in-app update (§7.10), not a working-looking screen with failing calls.
- Silent changes to what the host sends (a field's meaning, a status value) carry no version signal.
  They are caught by the merge checklist (§5.3, item 4) and by testing each official desktop release.
- **DECK-R50** **Reuse Orca components before writing new ones.** Deck screens compose Orca's
  components and router-free views, wrapped for pad focus with the gamepad layer's `ZoneItem`
  (children draw the focus, so the touch look is unchanged). A new component is written only for a
  structure Orca has no equivalent for, and `mobile/src/deck/REUSE.md` records why.

## Tasks

### T10 — Build the deck theme on Orca's design system

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/theme/deck-theme.ts` (create), `mobile/src/deck/theme/deck-theme.test.ts` (create)
- **Change:** DECK-R34: re-export Orca's `paletteForScheme`, `spacing`, `radii`, `typography`, `feedback` under the maquette's role names (PRD §7.8 table) and add only page title size (22), focus ring, and wheel kind colours/shapes derived from Orca's palette. Follows Orca's light/dark scheme and appearance preference.
- **Depends on:** T6
- **Done when:** test asserts every deck role resolves to an Orca token or a listed addition, in both schemes; status colours meet contrast on their pane backgrounds (approach from `theme/mobile-theme-contrast.test.ts`).

### T104 — Component reuse inventory

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/REUSE.md` (create)
- **Change:** For each deck element in PRD §7.8's table, confirm the Orca component exists after T1, is router-free (or name the one router reference to lift out, e.g. `MobileFileExplorerPanel`), and note props the deck needs. Add a row per new deck component with why no Orca piece fit (DECK-R50).
- **Depends on:** T1
- **Done when:** every §7.8 row has a verified path and a reuse verdict; `rg` confirms each path exists.

### T106 — Deck design guard

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/deck-design-guard.test.ts` (create)
- **Change:** Source scan of `src/deck/**` (except `theme/deck-theme.ts`): fails on hex/`rgb(` colour literals, numeric `fontSize`, `borderRadius` and `fontFamily` literals, and imports of maquette `logos/` when `MobileAgentIcon` has the agent (DECK-R34, R35). Same idea as the desktop design-system lint in `AGENTS.md`.
- **Depends on:** T10
- **Done when:** passes on the deck; a probe file with `color: '#fff'` makes it fail.

### T13 — Host refusal screen

- **Scope:** cloud: code and tests.
- **Files:** `mobile/src/deck/host/DeckHostRefusal.tsx` (create, + render test)
- **Change:** When `transport/protocol-compat.ts` reports the desktop refuses this client, reuse `ProtocolBlockScreen`'s wording and `MobileStateView`; show the plain reason and the in-app Update entry (wired in T23). DECK-R43, DECK-R39.
- **Depends on:** T10, T11
- **Done when:** render test with a refused verdict shows the message and an Update control; with a compatible verdict renders children.
