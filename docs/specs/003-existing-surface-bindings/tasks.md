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

- [ ] **BIND-T3 - Session bindings**

  Bind LB/RB cycling, scroll, back, and active-session focus to
  `use-mobile-session-controller.ts` and `MobileSessionSurface.tsx`. Add no new
  session list, route, subscription, or session store.

  **Needs:** CTRL-T5, BIND-T2

  **Verify:** `pnpm --dir mobile test src/session/mobile-session-tab-activation.test.ts src/session/mobile-tab-close-selection.test.ts`

- [ ] **BIND-T4 - Agent bindings**

  Bind transcript scroll, intervention `A/B`, focused-session `X`, composer text
  target, and non-destructive wheel action ids through existing native-chat
  callbacks.

  **Needs:** CTRL-T5, BIND-T3, WHEEL-T4

  **Verify:** `pnpm --dir mobile test src/session/MobileNativeChatView.test.ts src/session/MobileNativeChatQuestion.test.tsx src/session/use-mobile-structured-agent-session-prompt-cancel.test.tsx`

- [ ] **BIND-T5 - Dictation binding**

  Route `R3` to the existing `useMobileDictation` start/stop behavior and route
  transcripts to the focused existing text target. Derive the listening
  indicator from the existing hook status. Add no speech descriptors or audio
  pipeline.

  **Needs:** CTRL-T5, BIND-T3

  **Verify:** `pnpm --dir mobile test src/hooks/use-mobile-dictation-source.test.ts src/hooks/mobile-dictation-desktop-start.test.ts src/terminal/terminal-live-dictation-routing.test.ts`

- [ ] **BIND-T6 - Terminal binding**

  Bind analog scroll, existing control keys, quick commands, text/dictation
  target, and path opening to `TerminalPaneView` and existing terminal modules.
  Resolve the WebView interception result from CTRL-T1 without changing the
  terminal protocol.

  **Needs:** CTRL-T5, BIND-T3, BIND-T5

  **Verify:** `pnpm --dir mobile test src/terminal/terminal-webview-scroll-routing.test.ts src/terminal/terminal-accessory-keys.test.ts src/terminal/quick-commands.test.ts src/session/mobile-terminal-stream-subscribe.test.ts`

- [ ] **BIND-T7 - File and diff bindings**

  Bind scroll, open/back, and provisional selection/hierarchy behavior to the
  existing explorer, preview, markdown, and diff entry points. Preserve current
  compatibility fallback and editing behavior.

  **Needs:** CTRL-T5, BIND-T3

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
