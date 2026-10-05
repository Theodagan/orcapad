# Manual validation plan

Everything in `000`–`003` that a machine can check is checked. What remains needs
a person holding a controller, and it produces two records:

| Record | Schema | Lands in |
| --- | --- | --- |
| Wheel device trial (WHEEL-T8) | `mobile/src/gamepad/wheel/wheel-trial-records.ts` | `docs/evidence/context-wheel/*.json` |
| Binding device validation (BIND-T10) | `mobile/src/gamepad/bindings/controller-binding-evidence.ts` | `docs/evidence/surface-bindings/*.json` |

Both gates currently **skip** rather than fail. They turn into gates the moment a
record lands — and a malformed one fails immediately, so file them as you go.

CTRL-T8 (`docs/evidence/controller-input/`) is the third, and is measured in the
same sitting because it needs the same hardware.

## 0. Before you start

```bash
pnpm --dir mobile apk:android --abi arm64-v8a
adb install -r mobile/android/app/build/outputs/apk/release/app-release.apk
```

Rebuild even if you tested a previous build. The native module changed in BIND-T1
(`BUTTON_A`/`BUTTON_B` are now consumed), and a stale APK would validate the old
double-navigation behaviour and give you numbers for a build nobody ships.

Have `adb logcat -s OrcaGamepad` running in a second terminal. Every button edge
and every unmapped key code is logged there; it is the difference between "B did
nothing" and "B was never delivered".

## 1. Does the pad exist at all

1. Pair the desktop, open the app, connect the controller.
2. Confirm `logcat` prints a device line, and that pressing each face button logs
   `button a=1.0`, `b=1.0`, `x=1.0`, `y=1.0`.
3. Disconnect the controller mid-screen. The disconnect notice must appear within
   a second, and touch must keep working while it is up.

**Stop here if nothing logs.** Every later step assumes delivery, and debugging
a binding when the problem is delivery wastes the session.

## 2. The three failure modes worth counting

These are the WHEEL-T8 numbers, and the only ones a trial can get wrong quietly.
Count them across the whole session rather than in a dedicated block — they are
about ordinary use, not about a test posture.

- **`accidentalOpenCount`** — the wheel opened when you were not asking for it.
  Resting a thumb, walking to another control, adjusting your grip.
- **`wrongCommitCount`** — `A` ran a segment other than the highlighted one.
- **`cancelFailureCount`** — returning to centre or pressing `B` ran something
  anyway. This is the one that matters most: `002` promises zero side effects on
  every non-commit path, and it is the promise that makes the wheel safe to
  experiment with.

Also note `openLatencyP95Ms` roughly — the gap between leaving the dead zone and
seeing the wheel. `001` §8 targets 50 ms p95. If it feels laggy, it is; record
that rather than rounding it down.

## 3. Surface by surface

The eight surfaces BIND-T10 requires. For each one, do it **twice** — once with
the pad, once by touch — because BIND-AC10 is half the claim and a record that
proves only the controller proves half of it.

| # | Surface | Controller | Watch for |
| --- | --- | --- | --- |
| 1 | **pairing** | `A` on the pair screen's primary button, `B` to leave | `B` must go back **once**. Twice means the native fallback fix regressed. |
| 2 | **home** | `A` opens the highlighted host | The blue outline appears only once a pad is connected, and disappears on disconnect. |
| 3 | **workspaces** | `Y`+`LB`/`RB` moves the highlight, `A` opens | Selection must follow search and collapse. Type in the search box and cycle again. |
| 4 | **session-tabs** | `LB`/`RB` cycles | It wraps. With one tab, nothing should happen at all. |
| 5 | **agent** | `X` stops a turn; `A`/`B` on a permission prompt | `A` must answer **only** a permission. On an ask or a question it should do nothing — that refusal is deliberate. |
| 6 | **dictation** | `R3` starts and stops | Then: start dictation, navigate to another screen, press `R3`. It must still stop. That is the global-stop rule. |
| 7 | **terminal** | `L2`/`R2` scrolls the scrollback | It must stop at both ends, and **must not double-scroll**. If it jumps two steps per press, the WebView is consuming input too — record `terminalWebViewConsumedInput: true`. |
| 8 | **files** | `A` toggles a folder / previews a file; D-pad left and right walk the tree | A loading row must do nothing when pressed. |

## 4. The wheel

Left stick runs a six-segment smoke preset; right stick runs the real-action
explorer preset. Both are in `active-wheel-trial.ts` and are one edit to change.

1. Flick the left stick. The wheel opens with no delay — no hold, no timer.
2. Move around the six segments. Can you reach all of them reliably, or are the
   ones away from the thumb's rest awkward? That is what six segments is asking.
3. Press `A`. Reopen: the committed segment's label now carries a run count
   (`Slot 3 x1`). That counter is the only way to tell a commit from a cancel.
4. Return to centre and release. Reopen — the count must be unchanged.
5. On the right stick, open the explorer preset **from the home screen**. Its
   segments should render disabled, and `A` should cancel. This is the "mostly
   disabled wheel" question: does it read as broken or as informative?
6. Open a file explorer, then the same preset. Now the segments are live.

## 5. Filing the records

Write the JSON by hand; the validators are the spec.

```bash
pnpm --dir mobile test src/gamepad/wheel/wheel-trial-records.test.ts
pnpm --dir mobile test src/gamepad/bindings/controller-binding-evidence.test.ts
pnpm --dir mobile test src/gamepad/controller-input/controller-evidence.test.ts
```

A few refusals are deliberate and worth knowing before you hit them:

- a trial with `sampleCount: 0` — it measured nothing, whatever else it says;
- `disposition: "candidate"` on a trial that saw a wrong commit or a failed
  cancel — that is the judgement WHEEL-R7 exists to prevent;
- a binding record missing any of the eight surfaces, or missing the `touch`
  column, or reporting `worked: false` with no `problem` text;
- a missing `terminalWebViewConsumedInput` — it is the CTRL-T4 checkpoint and
  step 7 above is where you learn the answer.

Once both are filed, delete the two `skipIf` lines the tests point at, and the
device evidence becomes a gate like everything else.

## 6. What a bad result means

None of this is a pass/fail exam. `002` is explicit that a first successful trial
is not UX validation, and the presets are experiments precisely so that a poor
result changes the preset rather than the mechanism. A trial that finds six
segments unusable has done its job.

The one class of result that is a real defect rather than a layout finding:
anything in section 2 above being non-zero, or `B` navigating twice. Those are
mechanism failures, and they belong in an issue rather than in a preset edit.

---

# Appendix: the controller-only run (`004` LOOP-T7)

Everything above validates that each surface works. This validates the thing the
product is actually for, and it has one rule: **do not touch the screen.**

Put the phone in a stand if that helps you keep to it. Reaching for the glass
once is the finding — note where and why, because that is the gap.

## The task

Pick something real and small. "Add a test for X and show me the diff" is a good
shape: it needs a prompt, usually produces a question, involves a tool call, and
ends in something to read.

1. **Open a workspace.** D-pad to it, `A`. If you have more than one host, pick
   the second one — that path did not exist before `004`.
2. **Prompt the agent.** `R3` and speak, or open the right-stick wheel and commit
   a reply. Both paths should work; try the wheel even if dictation does, because
   it is the one that works when dictation does not.
3. **Answer what it asks.** D-pad up/down to move the cursor, `A` to choose,
   D-pad right for Next or Send, `B` to dismiss. The cursor is outlined in blue;
   the chosen option is filled.
4. **Approve a tool call.** `A` allows, `B` dismisses.
5. **Read the result.** `LB`/`RB` to the diff or file tab, `L2`/`R2` to scroll.
6. **Stop something on purpose.** `X` mid-turn, so you have seen it work when you
   need it rather than when you are testing it.

11. **opencode.** Hold `R2` and `L2` in an opencode terminal with a long transcript: it must
    scroll both ways, as Antigravity's does.
12. **Text entry.** With the pad attached the terminal's input bar and the chat's composer are
    hidden. Show them from the wheel, hide them again. Dictate into a chat: the composer must appear
    with the words and go once `A` sends them.
13. **Editing a draft.** In a chat draft the D-pad moves a block caret, `B` deletes a word, and a
    second dictation lands at the caret. In a terminal with the strip shown, `B` deletes a word and
    the arrows move the prompt's caret. With the strip hidden `B` is Escape again.
14. **Sheets.** From the header (`X`), open Filter, Sort and Group, and a tab's long-press sheet:
    the pad must land on a control at once, the D-pad must move a visible ring, `A` must press, `B`
    must close. Note any sheet where it landed somewhere odd or raised the keyboard.
15. **The host header.** `X` on the workspace list reaches the header; every button in it can be
    pressed; `B` returns to the list.
16. **A screen with no bindings.** On settings, accounts or tasks, `B` should go back. Record how
    far the D-pad gets you, because those screens are still touch-only.

## What to write down

Beyond the BIND-T10 columns:

- **Where you reached for the screen.** The most valuable line in the record.
- **Whether the hint bar told you what you needed**, or whether you guessed. If
  you guessed right, the hints are incomplete; if you guessed wrong, they are
  misleading, which is worse.
- **How the mostly-disabled wheel felt** off the chat screen — informative, or
  broken?
- **Whether `A` ever did something you did not intend.** Particularly on a prompt
  card, where a cursor and a selection are different things.

## Filing it

Use the BIND-T10 schema with `touch: 'not used'` in every observation. A run that
needed the screen is still evidence — record what it needed and why, and leave
`worked: false` with the reason.

## The decision this run ratifies

`docs/decisions/controller-contract/001-dpad-navigation-is-contract.md` changed a
PRD position on evidence from a static audit. This run is where it earns a human
yes: if the task completes without the screen, the change did its job. If
navigation still feels wrong, the decision is reversible and the record says so.

---

# Appendix: the usability pass (`005`)

`005` answers the first device session, which called the app "nowhere near a usable
experience". Everything in it is proved through the composed screen with a fake pad, and
none of it has been seen on a real one. This is the run that ratifies it or sends it back.

## Before you start

Rebuild. The native module gained two calls since the last build, and a stale APK would
validate the old behaviour:

- `setInputCaptured` keeps an open wheel from letting Android's focus move beneath it
  (it compiles, and has never run on a device);
- `requestNativeFocus` moves Android's own focus onto the element under the cursor.

```bash
pnpm --dir mobile apk:android --abi arm64-v8a
adb install -r mobile/android/app/build/outputs/apk/release/app-release.apk
adb logcat -s OrcaGamepad
```

Both calls compile under `./gradlew :orca-gamepad:compileDebugKotlin`. If the full build still fails in `OrcaGamepadModule.kt`, that is the finding: nothing below can run.

## What to check

Do these with the pad, and note every time you reach for the screen.

1. **Held scroll.** Hold `R2` for a second in each of: a terminal at a shell prompt with
   scrollback; a full-screen program in the alternate screen (`less`, `vim`); a program with
   mouse tracking on; an agent chat transcript; a long file list. Scrolling must continue the
   whole second and stop at both ends. Note whether `L2`/`R2` log as an axis or as buttons.
2. **The cursor is visible.** Walk the D-pad over the header, the tabs, the shortcut keys, the
   file explorer, the workspace list, the host list and an agent's question. The ring must be
   obvious at arm's length on the Retroid's screen, on a dark background. Note anything
   where you had to look for it.
3. **Android's focus agrees.** Where the cursor is, Android's own focus highlight should be
   on the same element. A second highlight somewhere else is a finding. In the agent zone
   Android's highlight may wander on a D-pad press; record how visible it is.
4. **Zones.** Press `X`: agent, shortcuts, header (and panels when one is open). The zone's
   border and its name in the hint bar must make it unmistakable where you are. `B` in a row
   zone returns to the agent. Open the files panel with `A` on its header button: the cursor
   must move into the panel, and `B` must close it and return to the agent.
5. **The agent zone.** In a terminal agent with a menu, the D-pad moves it, `A` is Enter and
   `B` is Escape. In a chat, the D-pad scrolls, `A` answers a permission, and `A` sends a
   draft once there is one.
6. **Dictation.** Tap `Y`: it starts. Tap `Y` again: it stops. `Y` held with `L1`/`R1` must
   not toggle it. `R3` must do nothing. With nowhere for the words to go, the refusal must be
   visible. After dictating into a chat, `A` should send it.
7. **Tabs.** `L1`/`R1` cycle the tabs from every zone, wrap, and do nothing with one tab.
8. **Left wheel.** Two segments. Back to menu lands on this host's workspace list; New
   worktree opens the new-worktree form.
9. **Right wheel.** Five segments. Launch agent opens a second wheel of the agents the
   new-tab drawer offers; `L2` steps back a level. Chat / terminal switches the tab's view and
   says where it goes; Show / hide input shows or hides the text-entry strip. Stop interrupts the
   turn; Close closes the agent's tab. These two are destructive: try them on something you can
   afford to lose, and note whether you ever landed on one by accident.
10. **Capture.** Open a wheel and try everything else: the other stick, `A`, `B`, the D-pad,
    `L1`/`R1`, `X`, `Y`, and a finger on the screen. `R2` selects and `L2` cancels; both are named
    in the bottom corners. A trigger pulled under the wheel must not scroll once it has closed. Nothing underneath may react and
    Android's focus highlight must not move. Press a button while it is open, then close it:
    the button must not act. Unplug or switch off the pad with a wheel open: it must close.

## What to write down

Beyond the BIND-T10 columns:

- **Where you reached for the screen**, and why. This is still the most useful line.
- **Whether the zone you were in was ever unclear.** If it was, the border is too quiet.
- **Whether a native highlight and the ring ever disagreed**, and where.
- **Whether the wheel's destructive segments felt safe**: did you ever land on Stop or
  Close by accident?
- **How long a `Y` tap took to start dictation**, since a tap is only known on release.

## Filing it

BIND-T10 schema with `touch: 'not used'` in every observation. A step that needed the screen
is evidence too: record what it needed and leave `worked: false` with the reason.

## The decisions this run ratifies

`docs/decisions/controller-contract/` 002 through 006 each changed a position on the product
owner's instruction. If a step above feels wrong on the device, the decision behind it is the
thing to reopen, and each record says what reversing it would cost.
