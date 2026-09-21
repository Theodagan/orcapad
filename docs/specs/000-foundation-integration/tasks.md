# 000 - Foundation and Integration - Tasks

- [x] **FND-T1 - Reconcile existing controller source**

  Inspect every file under `mobile/src/gamepad/` and add a disposition table to
  the implementation PR description: retain, simplify, replace, or remove, with
  the replacement requirement that justifies retained code.

  **Verify:** `git diff -- mobile/src/gamepad mobile/tsconfig.extraction.json mobile/package.json`

- [x] **FND-T2 - Remove speculative foundation code**

  Remove remote-domain copies, unused broad ports, protocol/capability wrappers,
  transport bindings, and extraction-only scaffolding that no requirement in
  `001` or `002` consumes. Preserve unrelated upstream code.

  **Needs:** FND-T1

  **Verify:** `pnpm --dir mobile typecheck`

- [ ] **FND-T3 - Replace the broad boundary ratchet**

  Rewrite `mobile/src/gamepad/gamepad-boundary.test.ts` to enforce the narrow
  rules in `tech.md` section 6 without banning composition with existing Orca
  Mobile controllers, hooks, and components.

  **Needs:** FND-T1

  **Verify:** `pnpm --dir mobile test src/gamepad/gamepad-boundary.test.ts`

- [ ] **FND-T4 - Add duplicate-infrastructure ratchets**

  Add source checks for new socket/reconnect, pairing, notification, speech,
  terminal-protocol, and file-RPC orchestration under `mobile/src/gamepad/`.
  Allow exact existing-action imports documented by `003`.

  **Needs:** FND-T3

  **Verify:** `pnpm --dir mobile test src/gamepad/gamepad-boundary.test.ts`

- [ ] **FND-T5 - Establish the controller provider**

  Add the smallest shell-level provider needed to own controller reader
  lifecycle, intent dispatch, focus registration, and wheel overlay mounting.
  Do not add a remote state store or adapter registry.

  **Needs:** FND-T2, FND-T3

  **Verify:** `pnpm --dir mobile typecheck`; `pnpm --dir mobile test src/gamepad`

- [ ] **FND-T6 - Run changed-code gates**

  Confirm the reconciled implementation follows repository quality and design
  constraints.

  **Needs:** FND-T4, FND-T5

  **Verify:** `pnpm run check:code-quality:changed`; `pnpm --dir mobile lint`; `pnpm --dir mobile typecheck`
