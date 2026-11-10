# Upstream touches

Baseline: upstream `c82839fb7b6` merged with the fork's pad plumbing (decided 2026-11-09).

Everything new lives in `mobile/src/deck/` and `mobile/app/deck/`. Any edit outside those two
folders gets **one appended line** here, in this format:

```
path — reason — task
```

Append only. Never reorder, rewrap or rewrite an existing line: parallel deck branches edit this
file in the same commit as their touch, and appended lines merge without conflict.

mobile/package.json — `deck:upstream-check` script entry for the PRD §5.3 merge checklist — T3
mobile/src/storage/preferences.ts — stored `interface` preference for the deck entry switch — T5
mobile/app/index.tsx — entry redirects to the deck when the interface preference says so — T7
mobile/src/settings/mobile-settings-menu-items.ts — the Interface row that switches shells — T7
mobile/src/settings/settings-menu-screen.tsx — re-renders the menu when the Interface row switches — T7
mobile/src/storage/interface-preference.ts — in-memory interface switch for the entry route and Settings, neither of which may import the deck (DECK-R40) — T8
mobile/src/app-update/fork-release-update-source.ts — the fork APK channel; Orca screens ask it too, and Orca may not import the deck (DECK-R40) — T22
mobile/src/app-update/app-update-channel.ts — picks the fork channel on Android (DECK-R47) — T22
mobile/src/app-update/app-update-runtime.ts — Android update checks now read the fork releases — T22
.github/workflows/mobile-android-release.yml — the fork release key is required and the tag prefix is the fork's (DECK-R45/R46) — T15, T16
mobile/scripts/prepare-android-release.mjs — the fork's tag prefix in the version resolution — T16
mobile/src/mobile-release/prepare-android-release-script.test.ts — expects the fork's tag prefix — T16
mobile/src/gamepad/controller-provider.tsx — the deck reads live samples for chords Orca's resolver table cannot express (Y modifier, D2) — T26
