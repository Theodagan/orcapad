# Upstream candidates

Gaps this fork cannot close without changing the desktop host or adding a declaration. Each entry
names the evidence in this checkout, what it blocks, and what upstream would have to add. Ordered by
how much of the delivery it unblocks.

1. **Mobile routes for `workspacePorts.probePage/kill/killHost`** — blocks opening and stopping ports (T86), not the list (T54).
   - `scan` and `scanHost` are now mobile-routed in the fork. The other methods remain registered workspace methods without phone routes.
   - `rpc-caller-scope.ts` refuses a method missing from the route table with `Method '<name>' is not available to mobile clients`.
   - Opening/stopping also needs the execution-host declaration policy checked before the deck claims per-host coverage.
2. **Declared host CPU/RAM/bandwidth fields** — blocks host metrics in Overview (OVR-1).
   - `stats.summary` is now mobile-routed in the fork, but its reply is `runtime.getStatsSummary() ?? {}` with no published metric shape.
   - The deck needs declared fields before drawing values. Battery and network are read from the device and are available.
3. **A declared Revert for an agent message** (MSG-3, T89). The delivery shows Revert disabled with
   its reason; nothing in the native-chat surface declares a revertible message.
4. **A host-provided deny-feedback suggestion** (SAFE-2, T62). Prompt payloads carry no suggestion
   field, so deny-with-feedback offers the composer only and never invents wording.
5. **A query for Android's `canRequestPackageInstalls`** (DECK-R45, T18). The pinned Expo SDK exposes
   no such query, so the update flow handles the platform's own refusal (its message, a settings
   action and a retry with the download kept) instead of pre-checking the grant.
