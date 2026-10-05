# 005 - Controller Usability Pass - Technical Specification

The mechanisms behind `product.md`. Everything here is an amendment to `001`,
`002` or `003`, not a replacement; where a rule changed, the decision record is
named.

## 1. Why the first pass failed

The device found four defects, and each had a cause that a green suite could not
see. (Round 2 found a fifth of the same kind, in section 14.)

| Symptom | Cause |
| --- | --- |
| `L2`/`R2` scrolled nothing | Sampling was event-driven, and a held trigger sends no event while it is unchanged; the chat integrated against an absolute offset it had remembered; the terminal scrolled a buffer the WebView was not showing |
| The wrong surface answered | A parent's focus target outranked the screen inside it, hidden terminal panes registered targets, and a re-render looked like a new mount |
| Dictation did nothing | A start required a text target on the active focus target, and nothing declared one; a structured chat has no PTY, so "can send" was false |
| A wheel could not be closed | A held stick never re-armed it, and a pad whose dead zone was wider than the wheel's never reached centre |

The common cause is that each piece was proved alone. The fixes below are proved
through the composed tree: the real provider, the real bindings in their real
nesting, and a pad driving them across time.

## 2. The input pipeline

```text
Kotlin WindowCallbackTap -> TS reader -> withHeldInputRepeat -> intent resolver
   -> ControllerProvider -> wheel -> dictation -> focus registry
```

**Held input.** `withHeldInputRepeat` re-publishes the reader's sample every 16 ms
while anything is held, re-reading axes from the live reader and never re-reading
buttons. A settle tick that fires after the device already reported a release is
suppressed, so a release is never undone. Held analog input therefore keeps
producing intents without the device resending it (USE-R1).

**Resolver.** One resolver per pad, rebuilt when the set of pads changes so edge
state cannot outlive a disconnect. Scroll intents carry `elapsedMs` and `begins`;
a released stick is reported as a true centre (0, 0); the D-pad repeats after
350 ms at 90 ms; and a binding row is `press` or `tap`.

**Tap.** `Y` is a tap: pressed and released within 500 ms with no other button
pressed in between and not captured. Anything else disarms it, which is what lets
`Y` double as the worktree chord modifier without toggling dictation.

## 3. Resolution order

Amends `001` §7. For each intent the provider asks, in order:

1. **An open wheel** takes every intent (decision 004).
2. **Dictation** takes `toggle-dictation` while a session has registered one.
3. **The focus registry** (§4).

An intent nothing accepts is a no-op, as before.

## 4. Focus registry

An intent goes down a chain and the first target that accepts it takes it:

1. the targets of the focused zone;
2. the screen's own targets (those with no zone);
3. the other zones, but only for the intents that mean the same everywhere:
   `scroll`, `cycle-tab`, `cycle-workspace` (`ZONE_AGNOSTIC_INTENTS`).

Within each step a higher declared priority answers first (`FOCUS_PRIORITY`:
`screen` 0, `surface` 1, `card` 2), and the newest seat breaks a tie. Priority is
declared rather than inferred from mount order, because React runs child effects
before parents' and "newest wins" handed focus to exactly the wrong surface.

- A handler may return `DECLINED` to fall through to the next target. A sentinel
  rather than `false`, because plenty of handlers are arrow functions that happen
  to return a boolean.
- A seat survives same-id re-registration, so React's cleanup-then-setup does not
  read as a new mount.
- `snapshot()` is referentially stable until something changes, so
  `useSyncExternalStore` can read it; the hint bar and the frames subscribe to it
  and a press never re-renders the surfaces it is aimed at.
- `switch-zone` is the registry's own: it cycles the zones that currently have a
  target, in `FOCUS_ZONES` order.
- A hook (`useControllerFocus`) registers once per (id, zone, priority, accepted
  intents, labels) and reads handlers through a ref, so a re-render with fresh
  props neither re-registers nor leaves a stale callback.
- Screens kept under the top one in the navigator never answer: they are gated by
  `ControllerScreenGate`, fed by the navigator's own layout.

## 5. Zones

`FOCUS_ZONES` is `agent`, `shortcuts`, `header`, `panels`, which is also the order
`X` walks. A zone exists while something mounted has declared it.

**Row zones.** The header and the shortcut keys are rows of buttons, and their
screens already own the buttons. `ZoneItem` is a render-prop wrapper that says what
an item is and what pressing it does, and hands its children `{ focused, focusRef }`:

- the **item store** (`zones/zone-item-store.ts`) holds the items and where the
  cursor is, and registers one navigator target per zone that has an enabled item,
  withdrawing it with the last;
- the **grid** (`zones/zone-grid.ts`) turns D-pad directions into moves over rows
  and positions, skipping disabled items;
- the **item** draws nothing. Its children draw the ring, so each surface keeps its
  own markup and a touch user's screen is unchanged;
- `A` calls the same function the touch handler calls.

| Zone | Entry | Wraps | `A` label |
| --- | --- | --- | --- |
| Header | starts at the active tab each time | no | Open |
| Shortcuts | remembers the cursor | yes | Press |
| Panels | remembers the cursor | no | Open |

`B` in a row zone returns to the agent zone when there is one, and otherwise
declines, so on a screen with no agent it leaves the screen.

**The panel zone** is the file explorer's own binding. It claims the zone when it
mounts with a pad attached, draws its cursor only while the zone is focused
(`useZoneFocused`), and `B` closes the panel.

**Drawing.** `ControllerFocusRing` is the cursor, defined once: a 3 px accent
border with a faint wash and a 1 px light line inside it, absolutely placed inside
the element it marks so it moves nothing and cannot be clipped. `ZoneFrame` is the
zone's 2 px accent border, shown only with a pad attached and at least two zones.
The existing selection looks (a left border on worktree rows, a recoloured card
border, a tinted explorer row, an outlined prompt option) were replaced by the ring
so there is one look for "where the pad is", and the colours that mean something
else (the desktop-active row, a chosen option) stay as they were.

**Scroll into view.** A move reveals its target. Horizontal rows use the tab strip's
own offset rule (`useHorizontalStripReveal` over `resolveTabStripScrollOffset`);
lists use `useSelectionReveal`, which tracks which rows are viewable and, only when
the selection is not one of them, asks the list to centre it. Stick and touch
scrolling move the list without moving the selection, so neither is fought. A jump
the list cannot place yet is retried once it has measured, and a failure this hook
did not ask for is left to the list's other handler.

## 6. Native focus

`View.focus()` is a no-op in React Native 0.83 unless a native feature flag is on,
and `AccessibilityInfo.setAccessibilityFocus` only sends an event; neither moves
Android's input focus. So the gamepad module gained one call:

```kotlin
AsyncFunction("requestNativeFocus") { viewTag: Int ->
  appContext.findView<View>(viewTag)?.requestFocus() ?: false
}.runOnQueue(Queues.MAIN)
```

`createControllerRuntime()` wraps it (Android only, tolerant of a build without it)
and the provider carries it as `requestNativeFocus`. Presentational components never
import the native module: they call `useNativeFocus(active)`, which returns the ref to
put on the cursor's element and asks when `active` turns on.

The A button's `KEYCODE_DPAD_CENTER` fallback is already consumed by the tap, so
giving a view native focus cannot make `A` activate it twice.

What this does not do: the D-pad still reaches Android's focus traversal when no
wheel is open. In a row zone, a list or a panel the cursor pulls native focus back
to where it is. In the agent zone nothing does, so a native highlight can wander
there. Consuming the D-pad natively while a surface owns it is the follow-up, and it
is not taken here because every screen without bindings relies on that traversal.

## 7. Scroll

One integrator turns pressure and elapsed time into whole units, carrying the
remainder, with a squared pressure curve so a light touch is fine control and a full
pull is fast, and a minimum first step so a tap always moves.

- **Terminal.** 40 lines a second at full pressure, sent to the WebView as
  `controllerScrollLines`. In the normal buffer that is a clamped `scrollLines`; in
  the alternate screen or with mouse tracking on, the same router touch uses sends
  arrow keys or wheel reports, so a full-screen program scrolls the way a finger
  would make it.
- **Lists and the chat.** 900 points a second, moved from the list's real offset
  (`createScrollTracker` records offset, content and viewport from the list's own
  events), so there is no remembered position to disagree with a finger or with new
  messages. The chat resumes following the tail when it reaches the bottom.

## 8. The agent zone

**Terminal.** The D-pad is the arrow keys, `A` is Enter, `B` is Escape, through the
raw path the shortcut keys use. Not the gesture gate touch scrolling uses: that gate
exists to stop a stray swipe typing into a shell, and it drops Enter and Escape.

**Chat.** The D-pad scrolls the transcript. `A` and `B` answer a waiting permission or
question through the card's own callbacks. With nothing waiting `A` is offered by the
composer, at the lowest priority, so a draft is sent only when no agent is waiting on
you, and only while the composer's own `canSend` is true.

**Prompt cards** register at the highest priority while mounted, so a prompt takes the
buttons from the chat beneath it and gives them back when it closes.

## 9. Dictation

`Y` is a tap (§2). The session registers an `ActiveDictation { activity, toggle,
canStart, onUnavailable }`. The provider toggles it at step 2 of the resolution
order: a stop always goes through; a start goes through only when the words have
somewhere to land, and otherwise says so out loud through `onUnavailable` rather than
doing nothing. The toggle is the existing mic button's, so setup, permission and the
desktop's native dictation are reused as they were. A structured chat counts as a place
to dictate (`chatCanDictate`), which is what the first pass missed.

## 10. The wheels

**State.** `closed { spent }` or `open { wheel, path, locked }`. An outcome is a value
the dispatcher decides to act on, so the mechanics cannot invoke anything:

| Outcome | Meaning |
| --- | --- |
| `commit` | run the locked segment's action |
| `descend` | the locked segment opens a menu: nothing runs, the segments change |
| `ascend` | `B` inside a menu steps back one level |
| `cancel` | close with no effect |

`spent` is the wheel whose stick has acted and not yet returned to centre, so a held
stick does not reopen the wheel it just closed and `B` can close anything. A wheel
whose menu has no segments yet tolerates motion rather than cancelling on a jiggle.

**Menus.** A segment can open a menu whose entries a surface supplies when the wheel
opens (`WheelMenuBinding.menu()`), so loading, empty and failed are states the wheel
shows in its centre. Eight segments is the most a thumb can tell apart; past that the
last becomes "More…", one more level, and `B` steps back a page the way it steps back a
menu.

**Presets.** The left wheel is Back to menu (west), New worktree (east) and, from a session, Focus mode
(north) and Shortcuts (south). The right
wheel is five fifths of a turn: Launch agent (north), Chat / terminal, Stop agent, Show / hide
input, Close agent, so a harmless choice sits between stop and close and they never touch. Both
are experiment data (`wheel/experiments/`), and the agent preset declares `includes-destructive`
as WHEEL-R7 asks.

| Segment | Reaches |
| --- | --- |
| Back to menu | `router.dismissTo` the host's workspace list |
| New worktree | `router.dismissTo` the host's new-worktree route |
| Launch agent | the new-tab drawer's agent options (`loadMobileNewTabAgentOptions`), then `handleCreateTerminal(agent)` |
| Chat / terminal | `toggleTabChatView` for the active terminal tab, when `resolveMobileNativeChat` offers a chat |
| Show / hide input | the input-visibility store's toggle (section 13) |
| Stop agent | the focused surface's stop (the chat's, or Escape in a terminal) |
| Close agent | `handleCloseSessionTab` on the active agent tab |

Back to menu and New worktree are registered by the root layout, the one place that
owns the router and sees every screen. The agent actions belong to the session or to
the surface in front of it. A binding's own label wins over the preset's, which is how the
two toggles say where they go ("Chat view" / "Terminal view", "Show input" / "Hide input").

**Triggers steer an open wheel.** `wheel-trigger-steering.ts` sits after the resolver's other rules.
While the pad is captured it drops `A`, `B` and scroll, and turns a trigger's crossing of half
travel into `confirm` (`R2`) or `back` (`L2`), which the wheel already understands. It remembers
which triggers were pulled under a wheel and holds their scroll back until they are released, and a
trigger held when the wheel opened never crosses upward, so it never fires. The overlay's two cues
read their names from the same module, because raw control names live only under `controller-input/`.

**Capture** (decision 004). From the sample that opens a wheel to the one that closes
it:

- the wheel's `intercept` returns true for every intent, so no focus target sees one;
- the resolver is told the pad is captured, so a button pressed under a wheel never
  acts once it closes, and the D-pad repeater and the tap tracker drop their holds;
- `onOpenChange` calls `setInputCaptured` in the gamepad module, which reports pad keys
  and motion to JavaScript and forwards neither to the view tree, so Android's own focus
  traversal and a focused WebView cannot react. A key the view tree already saw go down
  still gets its release, or it would stay pressed beneath the wheel;
- the overlay takes touches (`pointerEvents="auto"` with responder handlers) so a finger
  cannot reach what is beneath;
- a pad that disconnects mid-gesture cancels the wheel (`useCancelWheelOnDisconnect`), because
  a resolver emits nothing for a disconnected sample and the wheel would otherwise stay open
  over a screen nothing could reach.

## 11. Hints

Derived from the registry, never authored. The chip names the focused zone when there is
more than one, `X` names where it goes, `A` and `B` carry the wording of whichever target
would answer them, and while a wheel is open the bar shows what `R2` and `L2` do to the wheel.
No hint shows a control name as its own label.

## 12. Verification

- Behaviour is proved through the composed provider with a fake reader and the real
  bindings, not through one binding in isolation.
- `mobile-session-route-parity.test.ts` pins the session route's hooks, callbacks, strings
  and JSX. The zone work re-pinned it twice, each time after a probe diffed the facts against
  `HEAD` and showed the only differences were the zone items, the focus refs and rings, the
  strip-reveal props, the agent and shortcut frames, and the extraction of the shortcut row
  into `MobileSessionAccessoryKeys`. The probe is a copy of the test that records what it
  hashes, run in a scratch worktree of `HEAD` and in the working tree; hashing the `HEAD`
  record must reproduce the existing pins, which is what shows the probe is honest.
- The reachability audit of `004` was updated to the new contract and still fails when a
  step becomes unreachable.
- Not provable here: anything that needs the pad, the Retroid's trigger classification, or
  the rebuilt native module. `docs/evidence/manual-validation-plan.md` lists the run.

## 13. Round 2: text entry, caret and sheets

**Input visibility.** `gamepad/input-visibility/input-visibility-store.ts` holds one of three
modes (`auto`, `shown`, `hidden`) and whether the strip holds anything. It is visible when `shown`,
or `auto` with content; the wheel's toggle flips what is on screen now, and a new draft after the
strip was put away returns it to `auto`. The provider owns the store, and `useInputVisibility`
reads it as always visible when no pad is attached, so a touch user's screen is unchanged. The
terminal's dock hides its input bar with `display: none` (the route parity pins changed by one host
element and one string, diffed against the previous pin), and the chat view mounts its composer only
while it is visible; a raised keyboard keeps either up.

**Caret.** `session/composer-text-editing.ts` is pure: clamp, step by character (never into a
surrogate pair), step by line, delete the word before the caret (Ctrl+W's rule), and set a dictated
phrase at the caret with the spacing it needs. The caret lives in
`use-mobile-native-chat-composer-caret.ts`, above the composer beside its draft, so a hidden or
remounted composer keeps its place; it defaults to the end, so nothing changes for anyone who never
moves it, and without a pad dictation still appends. With a pad attached the composer draws
`MobileNativeChatComposerCaretField` (a block over the character after the caret, so nothing
reflows) instead of the text input, and a touch swaps the real input in with a controlled
selection at the caret. `use-composer-edit-binding.ts` registers the D-pad and `B` in the agent
zone at card priority, above the transcript's scroll, only while there is a draft and no prompt is
waiting; its `B` declines when there is nothing to delete. Terminal: `use-terminal-controller-binding`
sends Ctrl+W for `B` while the strip is up.

**Sheets.** Every sheet is a `Modal` (a Dialog window), which the controller tap, attached to the
activity's window, never sees. `useModalNativeFocus` asks, after the sheet has had a moment to show,
for `requestNativeFocusWithin` on a non-flattened view that holds the sheet's controls. The Kotlin
side picks the first focusable view with no focusable view inside it (a scroll view is focusable
too, and focus on a container leaves the D-pad nowhere to go) and asks from touch mode, which the
first pad press has not left. `NativeFocusRing` draws a ring as that window's foreground on whatever
takes focus and gives the old foreground back, including when the view leaves the window, because
React Native recycles native views. The backdrop is `focusable={false}`.

**Host screen.** `list` joins `FOCUS_ZONES` ahead of `agent` (no screen has both). The workspace list
registers as `list`, the header's buttons are `HostHeaderControl` stops in `header`, and a zone's `B`
returns to whichever of `agent` and `list` is present, labelled with its name. `use-root-back-binding`
goes back where nothing else claims `B`.

## 14. Round 2: the engine's mode queries

esbuild 0.25 lowers `x ||= {}` for `chrome74`; with syntax minification it dropped `let x` and kept
the assignment, so `requestMode` threw `i is not defined` inside the parser. xterm then lost the rest
of the write, and opencode sends its mode queries (`CSI ? Ps $ p`) in the same write as the switch
to the alternate screen and the mouse modes. The pane never learned it was in a TUI with the mouse
on, so controller scroll had nothing to route. Found by running the generated page in headless Chrome
against a transcript captured from the real opencode in a pty: with the queries present the page
posted no `modes` message and no wheel reports; without them it posted `any`/SGR and the reports.
`build-terminal-webview-engine.mjs` keeps whitespace and identifier minification and turns syntax
minification off, `terminal-webview-engine-mode-queries.test.ts` runs the engine, and the payload
pin was refreshed. The generated file is untracked, so the fix lives in the build script.

## 15. Focus mode

`gamepad/session-chrome/` mirrors the input-visibility store: a store the provider owns (two booleans
and their toggles), and `useSessionChrome`, which returns both false without a pad, so a touch user
never sees a difference. The session registers the two wheel actions (`use-session-wheel-actions.ts`)
and resets the store when it unmounts, so the state ends with the session. `useFocusModeSystemBars`,
mounted by the root layout, calls the runtime's `setImmersive`, which reaches the gamepad module's
`setImmersive` (`WindowInsetsControllerCompat`, system bars, transient on swipe); the effect's cleanup
restores the bars, which is what covers the toggle, the session and the pad going away.

The header builds its tab strip and pinned buttons once and places them either in their own row or in
the top bar between the title and the icon buttons. The header zone's stops take `row` and `order`
from the layout (`tabRow`, `tabBase`, `iconBase`), so one row is walked in the order it is drawn and
the stops of the normal layout are unchanged. The shortcut row returns null while hidden (and a pad is
attached, and no keyboard is up), which removes its `ZoneItem`s and so the zone. The hint bar returns
null in focus mode before it looks at the wheel. The route parity pins and the quick-commands source
guard were updated after a probe; `section 12` describes the technique.
