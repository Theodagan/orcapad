# 003 - Existing Surface Bindings - Tasks

- [x] **BIND-T1 - Pairing and home bindings**

  Register focus and controller navigation around the existing pair scan,
  confirmation, home, and host-list actions. Do not add screens, pairing decode,
  pairing RPCs, transport, credentials, or host stores.

  **Needs:** CTRL-T5

  Bindings live in `mobile/src/gamepad/bindings/`. Each screen passes the
  callbacks it is currently rendering, so `A` and `B` reach the same function the
  button's `onPress` does (BIND-AC3) and an action that is not on screen is not
  accepted rather than accepted and ignored. Home holds a selected id — never a
  second catalog — and only while a controller is attached, so touch is unchanged
  (BIND-AC10). `home.pair-desktop` is the first wheel action id (BIND-R10).

  This is also where the CTRL-T4 fallback finding was actioned: the window tap
  now consumes `BUTTON_A` and `BUTTON_B`, so a bound `B` no longer navigates
  twice. See
  [`docs/evidence/controller-input/android-input-findings.md`](../../evidence/controller-input/android-input-findings.md).

  **Verify:** `pnpm --dir mobile test src/transport/pairing.test.ts src/transport/pre-profile-pairing-coordinator.test.ts src/home/mobile-home-connection-state.test.ts`

- [x] **BIND-T2 - Workspace bindings**

  Bind scroll, confirm/back, workspace cycling, and provisional D-pad selection
  to the current host-screen controller and rendered ordering.

  **Needs:** CTRL-T5

  Selection walks the rendered sections, flattened, so it follows sort, filter,
  search, grouping and collapse rather than a second ordering (BIND-AC4).
  Cycling moves the selection and does not open as it goes — a cycle that
  activated each workspace it passed would fire a `worktree.activate` per step —
  which also gives the PRD contract a way to move through a list without the
  experimental D-pad. Scroll reuses the existing `sectionListRef`. The row's
  controller highlight is deliberately a different colour from `isActive`: where
  the pad is and what the desktop is on are often different rows.

  **Verify:** `pnpm --dir mobile test src/worktree/workspace-list-sections.test.ts src/worktree/mobile-worktree-activation-source.test.ts src/worktree/worktree-catalog-snapshot-client.test.ts`

- [x] **BIND-T3 - Session bindings**

  Bind LB/RB cycling, scroll, back, and active-session focus to
  `use-mobile-session-controller.ts` and `MobileSessionSurface.tsx`. Add no new
  session list, route, subscription, or session store.

  **Needs:** CTRL-T5, BIND-T2

  Cycling activates as it goes, unlike the list bindings: a tab strip already has
  an active item and LB/RB is how the PRD changes it, so there is no selection to
  confirm. It wraps, because a tab strip is a ring; the lists clamp, because they
  are columns. The existing `switchSessionTab` does the work, so the host
  notification and subscription handover are untouched, and cycling to the tab
  already active is skipped rather than replaying one.

  The target is named for its session, which is the active-session identity `X`
  needs: BIND-T4's stop handler answers for the focused session because it is
  mounted inside this target, not because anything keeps a second record.

  Scroll is **not** bound here. The scrollable things are inside the tab — the
  transcript (BIND-T4) and the terminal scrollback (BIND-T6) — and both own their
  own scrollers, so a session-level one would fight them.

  **Verify:** `pnpm --dir mobile test src/session/mobile-session-tab-activation.test.ts src/session/mobile-tab-close-selection.test.ts`

- [x] **BIND-T4 - Agent bindings**

  Bind transcript scroll, intervention `A/B`, focused-session `X`, composer text
  target, and non-destructive wheel action ids through existing native-chat
  callbacks.

  **Needs:** CTRL-T5, BIND-T3, WHEEL-T4

  Precedence mirrors `MobileNativeChatPromptCard` exactly — ask, then permission,
  then question — because the controller has to agree with the one card on
  screen. `A` accepts only a permission, whose affirmative the card renders
  first; an ask and a question are lists of peers with no default, and picking
  one could answer "Delete everything?" with whatever the agent listed first. `B`
  reaches each card's own dismiss. `X` is the existing stop, offered only while
  the view's `canStop` says the turn can be stopped.

  `003` §5 rule 3 — neither input also commits a wheel action — turned out to be
  structural rather than enforced: the provider consults the wheel first and
  stops when it takes the intent. A test now drives that through the reader to
  prove the structure holds with a real binding underneath.

  Two things this exposed. The focus registry's code did not match its own
  comment: a newly mounted target never took focus, so an inner surface could
  never answer for itself. It does now, without stealing focus on a re-render.
  And `dispatchIntent` from context goes straight to the registry, skipping the
  wheel — documented, because a test written through it silently proves nothing.

  **Not bound:** the composer text target. That is BIND-T5's, which owns the
  dictation sink it belongs to.

  **Verify:** `pnpm --dir mobile test src/session/MobileNativeChatView.test.ts src/session/MobileNativeChatQuestion.test.tsx src/session/use-mobile-structured-agent-session-prompt-cancel.test.tsx`

- [x] **BIND-T5 - Dictation binding**

  Route `R3` to the existing `useMobileDictation` start/stop behavior and route
  transcripts to the focused existing text target. Derive the listening
  indicator from the existing hook status. Add no speech descriptors or audio
  pipeline.

  **Needs:** CTRL-T5, BIND-T3

  `R3` is step 2 of `001` §7, so it registers rather than being dispatched to:
  the provider now implements that step between the wheel and the focused
  surface. Stopping works wherever focus has gone, including while a wheel is
  open — a live microphone the user cannot reach is the failure worth designing
  against. Starting needs a focused text target, because a microphone with
  nowhere to put the words is one left running for nothing; that is what
  `FocusTarget.textTarget` has been for since CTRL-T5, and the composer now
  declares itself as one using the existing append rule.

  Transcript routing is **not** reimplemented. The existing router still decides
  composer versus terminal (BIND-R6); the focused text target gates whether a
  start is sensible rather than replacing the route. The listening state is
  `dictation.status` read through `dictationActivityOf`, which folds `error` to
  idle — a failed session holds no microphone.

  Adding a hook to the session chain tripped the route-parity ratchet. Re-pinned
  deliberately, after diffing: the only delta was `useDictationBinding`, with
  nothing removed and callbacks and effects unchanged.

  **Verify:** `pnpm --dir mobile test src/hooks/use-mobile-dictation-source.test.ts src/hooks/mobile-dictation-desktop-start.test.ts src/terminal/terminal-live-dictation-routing.test.ts`

- [ ] **BIND-T6 - Terminal binding**

  Bind analog scroll, existing control keys, quick commands, text/dictation
  target, and path opening to `TerminalPaneView` and existing terminal modules.
  Resolve the WebView interception result from CTRL-T1 without changing the
  terminal protocol.

  **Needs:** CTRL-T5, BIND-T3, BIND-T5

  **Verify:** `pnpm --dir mobile test src/terminal/terminal-webview-scroll-routing.test.ts src/terminal/terminal-accessory-keys.test.ts src/terminal/quick-commands.test.ts src/session/mobile-terminal-stream-subscribe.test.ts`

- [x] **BIND-T7 - File and diff bindings**

  Bind scroll, open/back, and provisional selection/hierarchy behavior to the
  existing explorer, preview, markdown, and diff entry points. Preserve current
  compatibility fallback and editing behavior.

  **Needs:** CTRL-T5, BIND-T3

  `A` means what the row means: a folder toggles, a file previews, a failed
  folder retries, and a loading placeholder does nothing. Hierarchy sits on the
  horizontal provisional axis because `A` on a folder is already spoken for —
  right opens a closed folder, left closes an open one, and left on anything else
  steps out to the parent.

  Three non-destructive wheel ids (`explorer.preview-selected`,
  `explorer.collapse-all`, `explorer.reload-selected`), which is what WHEEL-T7
  references. Deliberately not prefixed `files.`: that namespace is reserved for
  the file RPC layer a binding must never become, and the boundary ratchet
  enforces it.

  Binding the panel first made seven of its own tests throw, because
  `useController` demanded a provider. The controller layer is additive, so
  `useControllerBinding` is inert when no shell is above — matching what the
  absent reader already does for the native module — and a test now holds that
  line.

  **Verify:** `pnpm --dir mobile test src/files/MobileFileExplorerPanel.test.ts src/files/MobileFilePreviewScreen.test.ts src/files/file-list-fallback.test.ts src/session/mobile-diff-hunks.test.ts src/session/mobile-diff-lines.test.ts`

- [ ] **BIND-T8 - Notification and root regression**

  Prove controller integration leaves the existing home route, push
  registration, catch-up, dismissal, and notification navigation ownership
  unchanged. Add no controller dashboard.

  **Needs:** BIND-T1, BIND-T2, BIND-T3, BIND-T4

  **Verify:** `pnpm --dir mobile test src/home/mobile-home-connection-state.test.ts src/notifications/push-registration.test.ts src/notifications/push-dismissal-reconciliation.test.ts src/notifications/notification-routing.test.ts`

- [ ] **BIND-T9 - Controller/touch equivalence suite**

  For each binding, drive controller and touch entry points through the same
  authoritative action spy and assert one effect. Cover unmount cleanup and
  unavailable targets.

  **Needs:** BIND-T1, BIND-T2, BIND-T3, BIND-T4, BIND-T5, BIND-T6, BIND-T7, BIND-T8

  **Verify:** `pnpm --dir mobile test src/gamepad/bindings`

- [ ] **BIND-T10 - Device validation**

  On a controller-capable Android device, record pairing navigation,
  workspace/session cycling, agent `A/B/X`, dictation target selection,
  terminal scrolling/control input, file navigation, and continued touch use.
  Add a schema test covering both platforms and every required surface.

  **Needs:** BIND-T9, WHEEL-T7

  **Verify:** `pnpm --dir mobile test src/gamepad/bindings/controller-binding-evidence.test.ts`
