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

  **Verify:** `pnpm --dir mobile test src/gamepad/zones src/gamepad/bindings/use-file-explorer-controller-binding.test.tsx`

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

  **Verify:** `pnpm --dir mobile test src/gamepad/bindings/use-terminal-controller-binding.test.tsx src/gamepad/bindings/use-agent-controller-binding.test.tsx src/gamepad/bindings/use-composer-send-binding.test.tsx src/gamepad/bindings/use-prompt-option-binding.test.tsx`

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

  Implemented. Launch agent, Open web page, Stop agent and Close agent. A wheel can open a
  wheel: the reducer descends and ascends without being able to run anything; a long list
  pages with a More segment; loading, empty and failed menus are shown. Ports come from a
  validated RPC operation. Hand off is out of scope (decision 006).

  **Needs:** USE-T9

  **Verify:** `pnpm --dir mobile test src/gamepad/wheel src/session/use-session-wheel-actions.test.tsx src/session/session-wheel-menus.test.ts src/session/workspace-ports-operations.test.ts`

- [ ] **USE-T11 - An open wheel captures all input**

  Implemented. The wheel takes every intent; a press that began under it never acts after;
  the overlay takes touches; the native module stops forwarding pad keys and motion to the
  view tree while a wheel is open; a pad that disconnects mid-gesture cancels the wheel.

  **Needs:** USE-T10

  **Verify:** `pnpm --dir mobile test src/gamepad/wheel/use-wheel-controller.test.tsx src/gamepad/wheel/WheelOverlay.test.tsx src/gamepad/wheel/use-cancel-wheel-on-disconnect.test.tsx`

  **Not verified:** the Kotlin capture compiles (`./gradlew :orca-gamepad:compileDebugKotlin`) but has not run on a device. It needs a rebuilt APK.

- [ ] **USE-T12 - Hints tell the truth**

  Implemented. The zone chip, `X` naming its destination, the wording of whichever target
  would answer, and the wheel's own `A` and `B` while one is open.

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
