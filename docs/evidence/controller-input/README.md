# Controller input evidence

Device facts that no documentation can supply. Android's input APIs prove an API
exists; they do not prove what a given handheld does with it.

Most of what CTRL-T1 originally set out to record turned out not to be evidence
at all. Android's own guidance is to key off `KEYCODE_*` and `AXIS_*` rather
than a device name or vendor id, and the variation between conforming pads is
documented: a trigger arrives as `AXIS_LTRIGGER`, as the racing-wheel alias
`AXIS_BRAKE`, or as a digital `KEYCODE_BUTTON_L2`; a D-pad arrives as a hat axis
or as key codes. `mobile/modules/orca-gamepad/` handles every one of those, so
no per-device table is recorded here.

## What still needs a device

| Question | How it is answered | Task |
| --- | --- | --- |
| Does the focused terminal WebView consume controller events before the app sees them? | `readControllerInterception()` reports `consumedByViewTree` and the focused view class on every sample. `001/tech.md` §6: if a decor-level tap cannot observe events, implementation pauses for an architecture decision rather than adding a workaround. | CTRL-T4 |
| Dead-zone crossing to first visible wheel frame, p95 | device trace | CTRL-T8 |
| Controller disconnect notice timing | device trace | CTRL-T8 |

## Running on a device

The handheld gets a standalone build; the emulator gets the fast loop. They are
different artifacts and the device one embeds its JavaScript:

```sh
pnpm --dir mobile run apk:android            # standalone release APK, sideload this
pnpm --dir mobile run start:android-emulator # boots the AVD and forwards Metro's port
```

The APK lands at `mobile/android/app/build/outputs/apk/release/app-release.apk`.
Install it with `adb install -r <apk>`; uninstall any debug build first, since
the two are signed differently and Android refuses the swap. `--abi arm64-v8a`
builds only what a handheld runs and is markedly faster than the default
four-architecture build.

For the emulator loop, `pnpm --dir mobile exec expo start --dev-client` after the
emulator script has forwarded port 8081. Only native changes need a rebuild.

## Scrubbing

Anything recorded here is committed, so it carries no stable per-device
identifier: `mobile/modules/orca-gamepad/` never reads
`InputDevice.getDescriptor()`. A controller the user renamed over Bluetooth
still carries that name in its device name, and that is the field a human has to
check before committing a record.

## Records

| Platform | File | Status |
| --- | --- | --- |
| Android (Retroid Pocket Flip 2) | `retroid-performance.json` | not yet recorded — CTRL-T8 |
| iOS/iPadOS | — | deferred; the project is Android-only for now |
