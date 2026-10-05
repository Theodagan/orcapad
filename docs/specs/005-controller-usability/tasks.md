# 005 - Controller Usability Pass - Tasks

Checkboxes are left for a human to tick after the device run. Each task states whether it
is implemented and how it is verified; none has been run on the Retroid. `USE-T15` is the
run itself and is the only task that cannot be closed from a desk.

Verification commands run from the repository root, e.g.
`pnpm --dir mobile test src/gamepad/zones`.

- [ ] **USE-T1 - A held input keeps acting**

  Implemented. The reader republishes a held trigger, stick or D-pad direction from live
  device state every 16 ms; scroll becomes speed over time; the resolver carries elapsed
  time and the first-sample flag; a released stick is reported at true centre; a D-pad
  direction repeats after 350 ms at 90 ms.

  **Needs:** -

  **Verify:** `pnpm --dir mobile test src/gamepad/controller-input`

- [ ] **USE-T2 - The surface on screen answers**

  Implemented. Declared priority replaces mount order; an intent falls through the focused
  zone, then the screen's own targets, then the other zones for the intents that mean the
  same everywhere; a handler may decline; a seat survives re-registration; panes nobody is
  looking at register nothing; screens retained under another are gated by the navigator.

  **Needs:** -

  **Verify:** `pnpm --dir mobile test src/gamepad/focus src/gamepad/controller-provider.test.tsx src/navigation`

- [ ] **USE-T3 - Scroll everywhere the controller can see content**

  Implemented. One integrator with a pressure curve. The terminal scrolls its buffer, or
  sends arrows or wheel reports in the alternate screen and under mouse tracking, through
  the router touch uses. Chat and lists scroll from their real offset, and the chat resumes
  following its tail.

  **Needs:** USE-T1, USE-T2

  **Verify:** `pnpm --dir mobile test src/gamepad/bindings/controller-scroll-rate.test.ts src/gamepad/bindings/controller-scroll-tracker.test.ts src/terminal/terminal-webview-controller-scroll.test.ts`

- [ ] **USE-T4 - Zones**

  Implemented. `X` walks agent, shortcuts, header, panels. Header and shortcut stops are
  `ZoneItem`s over the buttons the screen already draws; the item store keeps the cursor and
  turns the D-pad, `A` and `B` into moving, pressing and returning to the agent. The file
  explorer is the panels zone and claims it when opened.

  **Needs:** USE-T2

  **Verify:** `pnpm --dir mobile test src/gamepad/zones src/gamepad/bindings/use-file-explorer-controller-binding.test.tsx src/session/session-controller-zones.test.tsx`

- [ ] **USE-T5 - Focus is always visible, and Android follows**

  Implemented. One `ControllerFocusRing`; a `ZoneFrame` per zone; the ring replaces every
  earlier selection look; the cursor is hidden in a zone the pad is not pointed at;
  selections scroll into view; the element under the cursor also takes Android's input focus
  through a new `requestNativeFocus` call in the gamepad module.

  **Needs:** USE-T4

  **Verify:** `pnpm --dir mobile test src/gamepad/focus src/gamepad/zones src/gamepad/bindings/use-selection-reveal.test.tsx src/gamepad/controller-input/controller-runtime.test.ts src/session/use-horizontal-strip-reveal.test.tsx`

  **Not verified:** the Kotlin call compiles (`./gradlew :orca-gamepad:compileDebugKotlin`) but has not run on a device. It needs a rebuilt APK.

- [ ] **USE-T6 - The agent zone speaks keys**

  Implemented. In a terminal, the D-pad, `A` and `B` send arrows, Enter and Escape through
  the shortcut-key path. In a chat, the D-pad scrolls, a waiting permission or question
  answers `A` and `B`, and otherwise `A` sends the composer's draft.

  **Needs:** USE-T2

  **Verify:** `pnpm --dir mobile test src/gamepad/bindings/use-terminal-controller-binding.test.tsx src/gamepad/bindings/use-agent-controller-binding.test.tsx src/gamepad/bindings/use-composer-send-binding.test.tsx src/gamepad/bindings/use-prompt-option-binding.test.tsx src/session/MobileNativeChatComposer.controller.test.tsx`

- [ ] **USE-T7 - Dictation on Y**

  Implemented. `Y` is a tap; the session decides whether dictation can start, in a
  structured chat as well as a terminal, and refuses out loud when it cannot. `R3` is
  unassigned.

  **Needs:** USE-T1

  **Verify:** `pnpm --dir mobile test src/gamepad/controller-input src/gamepad/bindings/dictation-resolution-order.test.tsx src/gamepad/bindings/active-dictation.test.ts`

- [ ] **USE-T8 - Tabs from every zone**

  Implemented through USE-T2: `cycle-tab` is zone-agnostic, so `L1`/`R1` reach the session
  from the header, the shortcuts and the panels. Panels are not in the ring.

  **Needs:** USE-T2

  **Verify:** `pnpm --dir mobile test src/gamepad/bindings/use-session-controller-binding.test.tsx src/gamepad/focus/focus-registry.test.ts`

- [ ] **USE-T9 - The left wheel**

  Implemented. Back to menu (the host's workspace list) and New worktree, registered by the
  root layout. The six placeholders are gone.

  **Needs:** USE-T2

  **Verify:** `pnpm --dir mobile test src/gamepad/wheel/experiments`

- [ ] **USE-T10 - The right wheel and the wheels it opens**

  Implemented. Launch agent, Chat / terminal, Stop agent, Show / hide input and Close agent
  (round 2 replaced Open web page with the two toggles, decision 007). A wheel can open a
  wheel: the reducer descends and ascends without being able to run anything; a long list
  pages with a More segment; loading, empty and failed menus are shown. Hand off is out of
  scope (decision 006).

  **Needs:** USE-T9

  **Verify:** `pnpm --dir mobile test src/gamepad/wheel src/session/use-session-wheel-actions.test.tsx src/session/session-wheel-menus.test.ts`

- [ ] **USE-T11 - An open wheel captures all input**

  Implemented. The wheel takes every intent; a press that began under it never acts after;
  the overlay takes touches; the native module stops forwarding pad keys and motion to the
  view tree while a wheel is open; a pad that disconnects mid-gesture cancels the wheel.

  **Needs:** USE-T10

  **Verify:** `pnpm --dir mobile test src/gamepad/wheel/use-wheel-controller.test.tsx src/gamepad/wheel/WheelOverlay.test.tsx src/gamepad/wheel/use-cancel-wheel-on-disconnect.test.tsx`

  **Not verified:** the Kotlin capture compiles (`./gradlew :orca-gamepad:compileDebugKotlin`) but has not run on a device. It needs a rebuilt APK.

- [ ] **USE-T12 - Hints tell the truth**

  Implemented. The zone chip, `X` naming its destination, the wording of whichever target
  would answer, and the wheel's own `R2` and `L2` while one is open.

  **Needs:** USE-T4

  **Verify:** `pnpm --dir mobile test src/gamepad/ActionHintBar.test.tsx src/gamepad/controller-input/action-hints.test.ts`

- [ ] **USE-T13 - The reachability audit follows the contract**

  Implemented. The audit of `004` was updated to the new bindings and still fails when a
  step becomes unreachable.

  **Needs:** USE-T6, USE-T7, USE-T10

  **Verify:** `pnpm --dir mobile test src/gamepad/loop`

- [ ] **USE-T14 - The session route keeps its pins**

  Implemented. The shortcut row moved into `MobileSessionAccessoryKeys` to keep the dock
  inside its size budget. The parity pins were re-pinned after a probe diffed them against
  `HEAD` and showed only the intended differences, and two source-reading tests were
  updated to follow the code (offline compose, quick-commands stability).

  **Needs:** USE-T4, USE-T5

  **Verify:** `pnpm --dir mobile test src/session src/terminal/terminal-input-connection-gate.test.ts`

- [ ] **USE-T15 - Device run**

  Not done. Run the section "Appendix: the usability pass (`005`)" of
  `docs/evidence/manual-validation-plan.md` on the Retroid Pocket Flip with a rebuilt APK,
  and record it against the BIND-T10 schema.

  **Needs:** USE-T1 through USE-T14

  **Verify:** `pnpm --dir mobile test src/gamepad/bindings/controller-binding-evidence.test.ts`

## Round 2 (the second device session, decision 007)

- [ ] **USE-T16 - A terminal that asks what the terminal knows still scrolls**

  Implemented. The generated engine no longer throws on a mode query (esbuild's lowering of
  `||=` plus syntax minification dropped a declaration in xterm's `requestMode`), so opencode's
  first write reaches the alternate screen with the mouse on. Verified against a real opencode
  transcript in headless Chrome, where `scroll-lines` now produces SGR wheel reports.

  **Needs:** USE-T3

  **Verify:** `pnpm --dir mobile test src/terminal/terminal-webview-engine-mode-queries.test.ts src/terminal/terminal-webview-payload-hash.test.ts`

- [ ] **USE-T17 - The triggers steer a wheel**

  Implemented. `R2` selects and `L2` cancels or backs out on a firm pull; `A`, `B` and scroll are
  spent under a wheel; a trigger held across the wheel's opening or closing never fires or
  scrolls. The overlay names the two in the bottom corners and leaves the middle empty; the hint
  bar says the same.

  **Needs:** USE-T11, USE-T12

  **Verify:** `pnpm --dir mobile test src/gamepad/controller-input/wheel-trigger-steering.test.ts src/gamepad/wheel/WheelOverlay.test.tsx src/gamepad/ActionHintBar.test.tsx`

  **Not verified:** trigger travel on the Retroid (the firm-pull threshold is half travel).

- [ ] **USE-T18 - The right wheel loses the web page and gains two toggles**

  Implemented. Open web page and the ports scan behind it are removed; Chat / terminal and
  Show / hide input are added. Stop and close are never adjacent.

  **Needs:** USE-T10, USE-T19

  **Verify:** `pnpm --dir mobile test src/gamepad/wheel/experiments src/session/use-session-wheel-actions.test.tsx src/session/session-wheel-menus.test.ts`

- [ ] **USE-T19 - Text entry is hidden until wanted**

  Implemented. A store in the controller layer decides whether the strip is on screen (hidden
  by default while a pad is attached; pinned by the wheel; opened by a draft). The terminal's
  input bar is hidden with `display: none` rather than unmounted, and the chat composer is not
  mounted until wanted.

  **Needs:** USE-T9

  **Verify:** `pnpm --dir mobile test src/gamepad/input-visibility src/session/use-session-wheel-actions.test.tsx src/session/mobile-session-route-parity.test.ts`

- [ ] **USE-T20 - A draft is edited by caret**

  Implemented. Pure caret rules (`composer-text-editing.ts`), a caret kept above the composer
  next to its draft, a block-caret field drawn while a pad is attached, a binding above the
  transcript's scroll for the D-pad and `B`, dictation at the caret, and `B` as Ctrl+W in a
  terminal while the strip is up.

  **Needs:** USE-T19

  **Verify:** `pnpm --dir mobile test src/session/composer-text-editing.test.ts src/session/MobileNativeChatComposer.controller.test.tsx src/gamepad/bindings/use-composer-edit-binding.test.tsx src/gamepad/bindings/use-terminal-controller-binding.test.tsx`

- [ ] **USE-T21 - Sheets take the pad, and the host screen has a header zone**

  Implemented. A sheet focuses the first control inside it (`requestNativeFocusWithin`), and
  focus in a sheet is ringed natively; the host screen's header is a zone of `HostHeaderControl`
  stops with the workspace list as the `list` zone; a root fallback makes `B` go back where
  nothing claims it. Sheets and the header were run on the Android emulator.

  **Needs:** USE-T4, USE-T5

  **Verify:** `pnpm --dir mobile test src/gamepad/focus src/gamepad/zones src/host-screen src/gamepad/bindings/use-root-back-binding.test.tsx src/gamepad/controller-input/controller-runtime.test.ts`

  **Not verified:** the same on the Retroid.

- [ ] **USE-T22 - Focus mode and a hideable shortcut row**

  Implemented (the first slice was written by Antigravity and reviewed; the rest by hand). A
  session-chrome store and hook (effective values are false without a pad), `setImmersive` in the
  gamepad module, a four-segment left wheel, a hint bar that renders nothing in focus mode, system
  bars tied to focus mode and restored when it ends, the one-line header (built from the same tab strip
  and buttons, placed beside the title), and the shortcut row and its zone removed while hidden.

  **Needs:** USE-T9, USE-T12

  **Verify:** `pnpm --dir mobile test src/gamepad/session-chrome src/gamepad/ActionHintBar.test.tsx src/gamepad/wheel/experiments src/session/use-session-wheel-actions.test.tsx src/session/session-controller-zones.test.tsx src/session/mobile-session-route-parity.test.ts`

  **Not verified:** on a device or the emulator: the system bars and the one-line header have only been
  proven by composed tests and a Kotlin compile.
