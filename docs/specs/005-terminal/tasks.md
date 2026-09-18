# 005 — Terminal & Activity — Tasks

- [ ] **TERM-T1 — Port**

  `activity-stream-port.ts` per `tech.md` §1.

  **Verify:** `pnpm typecheck`

- [ ] **TERM-T2 — Capability handshake**

  `src/adapters/orca/rpc/terminal-subscribe-operation.ts` building the
  `TerminalSubscribe` params per §2.1 and reading the echoed capabilities.

  **Verify:** `pnpm test …/terminal-capability-handshake.test.ts`

- [ ] **TERM-T3 — Frame decoding to domain**

  `src/adapters/orca/mapping/activity-frame-mapping.ts` over the existing
  `terminal-stream-protocol.ts` decoder; opcode → `ActivityFrame`, unknown opcode
  counted and logged once.

  **Verify:** `pnpm test …/activity-frame-mapping.test.ts`

- [ ] **TERM-T4 — Snapshot assembly**

  `src/adapters/orca/transport/terminal-snapshot-assembly.ts` per §2.3.

  **Verify:** `pnpm test …/snapshot-assembly.test.ts` (TERM-AC1)

- [ ] **TERM-T5 — Backpressure**

  `src/adapters/orca/transport/terminal-output-backpressure.ts` per §2.4, with
  the elision notice.

  **Verify:** `pnpm test …/terminal-backpressure.test.ts` (TERM-AC2)

- [ ] **TERM-T6 — Read-only fallback**

  `src/adapters/orca/transport/terminal-polled-fallback.ts` per §2.5.

  **Verify:** `pnpm test …/terminal-read-only-fallback.test.ts` (TERM-AC5)

- [ ] **TERM-T7 — Viewport**

  `resize` / `restoreHostViewport` over `terminal.resizeForClient`, with a test
  asserting `ClaimViewport` is never sent.

  **Verify:** `pnpm test …/terminal-viewport-mode.test.ts` (TERM-AC4)

- [ ] **TERM-T8 — Terminal surface**

  `TerminalSurface.tsx` feeding the existing WebView engine from
  `ActivityFrame`s. No protocol knowledge crosses the bridge.

  **Verify:** `pnpm run check:code-quality:changed`;
  `pnpm test src/features/terminal`

- [ ] **TERM-T9 — Accessory keys with host-platform labels**

  Migrate `terminal-accessory-*` and `terminal-key-definitions.ts` into the
  feature; drive labels from `hostPlatform`.

  **Verify:** `pnpm test …/accessory-key-host-platform.test.ts` (TERM-AC3, AC7)

- [ ] **TERM-T10 — Input gate**

  `terminal-input-gate.ts` implementing the §6 precedence, wired to opcode 17.

  **Verify:** `pnpm test …/terminal-input-gate.test.ts` (TERM-AC6)

- [ ] **TERM-T11 — Quick commands**

  Migrate `quick-commands.ts`; sending a quick command goes through the same
  input path as typing.

  **Verify:** `pnpm test src/features/terminal/components`

- [ ] **TERM-T12 — Path tap**

  Wire `terminal-path-tap.ts` to `files.resolveTerminalPath` and the `007-files`
  preview route, with the unresolvable path message.

  **Verify:** `pnpm test …/terminal-path-tap.test.ts` (TERM-AC10)

- [ ] **TERM-T13 — Loss and detach**

  Stream-close verdict, clean unsubscribe, viewport restore on leave.

  **Verify:** `pnpm test …/terminal-stream-loss.test.ts` (TERM-AC8, AC9)

- [ ] **TERM-T14 — Device checks**

  Per `AGENTS.md`: background launch, hidden renderer, CDP screenshots only.

    1. `Ctrl-C` interrupts a running process (TERM-AC3).
    2. Attach from phone while the desktop shows the same terminal (TERM-AC4).
    3. Rotation preserves buffer and scroll (TERM-AC11).
    4. A Windows host and a macOS host, key labels compared (TERM-AC7).
