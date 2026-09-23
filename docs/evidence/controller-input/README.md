# Controller input evidence

Device facts that no documentation can supply. Android's input APIs prove an
API exists; they do not say what the Retroid
Pocket Flip reports, whether its triggers are analog, or whether Orca's focused
terminal WebView eats controller events before the app sees them.

`001/tech.md` §1 names those as device checkpoints. CTRL-T3 may not finalize a
translation table until the record for a platform exists here.

## What to record

| Question | Field in the record | Why it decides something |
| --- | --- | --- |
| Which source does the pad report? | `devices[].sourceNames`, `devices[].sources` | A pad that is keyboard-only never reaches joystick handling. |
| Which axes, at what range? | `devices[].motionRanges` | Dead zones and stick normalisation (CTRL-R5). |
| Which key codes? | `events[].keyCode`, `keyCodeName`, `scanCode` | The CTRL-R1 mapping table. |
| Analog or digital triggers? | `devices[].triggerForm` | Digital triggers need a fixed scroll velocity instead of an analog one. |
| What does a disconnect look like? | `deviceChanges[]` | CTRL-T6's notice, and releasing held buttons (`001` §9). |
| Does the focused terminal WebView consume events? | `events[].focusedView`, `events[].consumedByViewTree` | `001/tech.md` §6: if a decor-level listener cannot observe events, implementation pauses for an architecture decision rather than adding a workaround. |

## Running the Android probe (CTRL-T1)

The probe is a temporary local Expo module, `mobile/modules/orca-gamepad-probe/`,
plus the route `mobile/app/controller-probe.tsx`. It needs a development build:
Expo Go cannot load a local native module.

The toolchain is Android command-line tools under
`/opt/homebrew/share/android-commandlinetools` with Temurin JDK 17. Build once:

```sh
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
pnpm --dir mobile exec expo prebuild --platform android --no-install
cd mobile/android && ./gradlew :app:assembleDebug
```

The APK lands at `mobile/android/app/build/outputs/apk/debug/app-debug.apk`
(~233 MB debug). Install it over USB with
`adb install -r <apk>`, then serve JS from this machine:

```sh
adb reverse tcp:8081 tcp:8081           # USB device or emulator
pnpm --dir mobile exec expo start --dev-client --port 8081
```

Only the Kotlin needs another `assembleDebug`. Everything in JS hot-reloads, so
the probe screen can be reshaped between passes without reinstalling.

Two things that will waste your time otherwise:

- the `orca://` scheme is claimed by the dev-client launcher, so a cold
  `adb shell am start -d orca://controller-probe` opens the launcher, not the
  route. Load the app from the launcher first, then send the deep link again;
- the first bundle takes minutes and the splash screen looks like a hang.

Then, on the device:

1. open `/controller-probe` and press **Start**;
2. work every control once — both sticks through their full range, both
   triggers from rest to fully pressed, every face and shoulder button, both
   stick clicks, all four D-pad directions;
3. navigate to a session with a **focused terminal**, repeat the pass, and watch
   whether events keep arriving and what `consumedByViewTree` says. Expo's own
   dev menu installs an `InterceptingWindowCallback` on the same hook, so in a
   development build the probe's tap sits above it — worth remembering if the
   ordering ever looks odd;
4. disconnect the pad while a button is held, then reconnect;
5. return to the probe and press **Copy scrubbed JSON**;
6. paste it into `retroid-pocket-flip.json` beside this file.

The tap is installed on the activity window, so it keeps recording across
navigation. That is what makes step 3 possible without embedding a terminal in
the probe screen.

## Scrubbing

`scrubRecording` runs before the JSON reaches the clipboard. It drops the name
of every non-controller input device (a phone's own devices can carry a
user-chosen name), rebases event times so device uptime never lands in git, and
zeroes the wall-clock start. The native module never reads
`InputDevice.getDescriptor()`, which is a stable per-device identifier.

Read the pasted JSON before committing it. The scrubber handles what it knows
about; a controller the user renamed over Bluetooth still carries that name in
`devices[].name`, and that is the one field a human has to check.

## Records

| Platform | File | Status |
| --- | --- | --- |
| Android (Retroid Pocket Flip) | `retroid-pocket-flip.json` | not yet recorded — CTRL-T1 |
| iOS/iPadOS (Bluetooth controller) | `ios-extended-gamepad.json` | deferred — CTRL-T2 is parked while the project is Android-only |
