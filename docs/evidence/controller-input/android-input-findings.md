# Android controller input — device findings

Measured on a controller-capable Android device, not on one particular
handheld. The configuration below is reproducible on any machine with the SDK.

## Configuration

| | |
| --- | --- |
| Device | Android emulator, AVD `orca-controller`, API 36 arm64 (`google_apis`) |
| Controller | Virtual gamepad registered through `uinput`: `GAMEPAD \| JOYSTICK`, analog `LTRIGGER`/`RTRIGGER`, hat-form D-pad |
| Build | `app-release.apk`, arm64-v8a |
| Tool | `adb logcat -s OrcaGamepad:D`, input scripted through `/system/bin/uinput` |

Registering a virtual gamepad is what makes this reproducible without hardware:
`uinput` creates a real `InputDevice`, so Android classifies, maps and dispatches
it exactly as it would a physical pad. The emulator itself cannot receive a
host-connected controller — it has no HID passthrough at any layer.

## What holds

- The pad is detected and named: `controllers: Orca Virtual Gamepad#16`.
- Shoulders and stick clicks map: `lb`, `rb`, `l3`, `r3`, press and release.
- **A hat-form D-pad translates correctly** to `dpad-up` / `dpad-right`. This was
  one of the two forms Android documents, and the one that cannot be inferred
  from key codes.
- Disconnect is observed: `controllers: none` when the device is destroyed.
- `consumed=false` on every event, with `focus=ReactViewGroup` — nothing in the
  view tree swallowed controller input on the home screen. The terminal WebView
  case is still unmeasured, because reaching it needs a paired desktop.
- An unrecognised code is reported rather than dropped, which is what replaced
  the recording probe.

## Finding: Android synthesises fallback keys for unconsumed buttons

`KEYCODE_BUTTON_A` is followed by `KEYCODE_DPAD_CENTER`, and `KEYCODE_BUTTON_B`
by `KEYCODE_BACK`. This is Android's documented fallback for a gamepad button no
one consumed, and our tap consumes nothing — it reports what the view tree
returned and passes the event on.

It is harmless today because no intent has a handler. It stops being harmless in
`003`: once `B` is bound to `back`, a single press would produce both the
controller's `back` intent and the system's own back navigation.

The fix belongs with the first binding, not before it. Consuming a mapped button
in the tap would suppress the fallback, but it would also remove the system
behaviour while nothing has replaced it yet. BIND-T1 is where `back` gains a real
handler and where consumption can be turned on in the same change.

**Resolved in BIND-T1.** `FALLBACK_KEY_CODES` in `ControllerVocabulary.kt` names
the two codes that have a fallback, and `WindowCallbackTap.dispatchKeyEvent`
returns consumed for them when the event came from a pad. Only those two: every
other button has no fallback to suppress, and consuming one would take it from a
view that might want it.

An unhandled `B` is now a no-op rather than a system back, which is what `001`
§7 step 4 already specified. Screens reached before their BIND task lands
therefore answer `B` only through touch and the system gesture, both untouched.

## Not yet measured

- Dead-zone-to-wheel-frame latency: needs the overlay from `002`.
- Disconnect-notice timing: needs a timestamp on the JavaScript side where the
  notice renders. The native disconnect is observable; the round trip to a
  rendered notice is not, and a record without that number would be a guess.
