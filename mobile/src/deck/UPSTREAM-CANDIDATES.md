# Upstream candidates

Gaps this fork cannot close without changing the desktop host or adding a declaration. Each entry
names the evidence in this checkout, what it blocks, and what upstream would have to add. Ordered by
how much of the delivery it unblocks.

1. **A mobile route for `workspacePorts.*`** — blocks Ports (PRJ-4, T54) and the port rows of
   All open and the workspace item list.
   - Methods exist: `workspacePorts.scan`, `scanHost`, `probePage`, `kill`, `killHost`
     (`src/main/runtime/rpc/methods/workspace-ports/workspace-ports.ts`), permission `workspace`.
   - They are registered (`ALL_RPC_METHODS`) but absent from the phone's route table
     (`EXECUTION_HOST_METHODS` / `MOBILE_RPC_METHOD_ROUTES` in
     `src/main/runtime/rpc/server/runtime-rpc-mobile-method-routing.ts`), and
     `rpc-caller-scope.ts` refuses any method missing from it with
     `Method '<name>' is not available to mobile clients`.
   - Phones already hold the `workspace` permission tier, so the missing piece is the route entries,
     not a new capability. `scanHost`/`killHost` also need the host-declaration policy checked per
     execution host before the deck may claim per-host coverage.
2. **A mobile route for `stats.summary`** — blocks host CPU/RAM in Overview (OVR-1).
   - `stats.summary` exists (`src/main/runtime/rpc/methods/host-management/stats.ts`), permission
     `workspace`, likewise not in the mobile route table.
   - The reply is `runtime.getStatsSummary() ?? {}` with no published shape, so even with a route the
     deck would need declared CPU/RAM fields before drawing them. Battery and network are read from
     the device, not the host, and are already available.
3. **A declared Revert for an agent message** (MSG-3, T89). The delivery shows Revert disabled with
   its reason; nothing in the native-chat surface declares a revertible message.
4. **A host-provided deny-feedback suggestion** (SAFE-2, T62). Prompt payloads carry no suggestion
   field, so deny-with-feedback offers the composer only and never invents wording.
5. **A query for Android's `canRequestPackageInstalls`** (DECK-R45, T18). The pinned Expo SDK exposes
   no such query, so the update flow handles the platform's own refusal (its message, a settings
   action and a retry with the download kept) instead of pre-checking the grant.
