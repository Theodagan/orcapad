# Deck coverage ledger

One row per area the deck shows. The tier says where the data comes from; the "served by" column
names the Orca module or RPC that actually answers for it, checked in this checkout.

- **R** — rebuilt in the deck from the data API: Orca exposes the data, the deck draws it.
- **N** — native Orca module the deck embeds as-is.
- **H** — host-only: nothing in the data API answers for it, so the deck shows it disabled with a
  reason (DECK-R37, DECK-R41) and it is proposed upstream in `UPSTREAM-CANDIDATES.md`.
- **P** — proposed upstream, not built here.

The private PRD's §6 table is not readable from this repository, so the areas below are this
brief's own features. Every "served by" path is a file in this checkout; `pnpm deck:upstream-check`
re-checks the imports on each merge.

| Area                        | Rules                  | Tier | Status | Served by (verified)                                                                                                     | Owning deck file                  |
| --------------------------- | ---------------------- | ---- | ------ | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------- |
| Project / workspace context | DECK-R4, UXA-R23       | R    | done   | `mobile/src/worktree/use-workspace-sections.ts`                                                                          | `context/deck-context.ts`         |
| Sessions and tabs           | SES-0, SES-6, IH-10    | R    | done   | `mobile/src/worktree/worktree-list-snapshot.ts`                                                                          | `sessions/use-deck-sessions.ts`   |
| Agent / tool activity       | IH-9, COL-3            | R    | done   | `mobile/src/components/WorktreeAgentRow.tsx`, `mobile/src/terminal/session/mobile-terminal-tab-agent.ts`                 | `collections/collection-model.ts` |
| Agent transcript            | SES-1, SES-9           | R    | done   | `mobile/src/session/native-chat/use-mobile-native-chat-controller.ts`                                                    | `session/DeckTranscript.tsx`      |
| Prompts and responses       | SAFE-1, SAFE-2, SAFE-7 | R    | done   | `mobile/src/session/native-chat/input/use-mobile-native-chat-prompts.ts`                                                 | `approvals/PromptStrip.tsx`       |
| Approvals inbox             | SAFE-5                 | R    | done   | the per-session prompt hook above; see `approvals/inbox-source.md` (D5)                                                  | `approvals/use-deck-approvals.ts` |
| Terminal / output (TUI)     | SES-1, SCR-11          | N    | done   | `mobile/src/terminal/session/TerminalPaneView.tsx`                                                                       | `session/DeckTerminal.tsx`        |
| File tree                   | FILE-1                 | R    | done   | `mobile/src/files/MobileFileExplorerPanel.tsx`                                                                           | `review/DeckFileItem.tsx`         |
| Files and code              | FILE-1, FILE-2         | R    | done   | `mobile/src/files/MobileFilePreviewBody.tsx`                                                                             | `review/DeckFileItem.tsx`         |
| Diffs                       | FILE-2, FILE-3         | R    | done   | `mobile/src/components/MobileDiffReviewScreenView.tsx`, `mobile/src/source-control/review/mobile-diff-review-loaders.ts` | `review/DeckFileItem.tsx`         |
| Source control              | FILE-5, DECK-R30       | R    | done   | `mobile/src/source-control/MobileSourceControlContent.tsx`                                                               | `review/DeckSourceControl.tsx`    |
| Browser tabs                | WEB-1, WEB-2           | R    | done   | `mobile/src/browser/MobileBrowserPaneView.tsx`                                                                           | `review/DeckBrowserItem.tsx`      |
| Voice / dictation           | MIC-1…4                | N    | done   | `mobile/src/hooks/use-mobile-dictation.ts`                                                                               | `dictation/DictationNotch.tsx`    |
| Notifications and Needs you | SD-4, SD-8, DIAL-14    | R    | done   | `mobile/src/notifications/desktop-notification-events.ts`                                                                | `notifications/`                  |
| Session log                 | SES-3                  | R    | done   | `mobile/src/agent-history/` (history read path)                                                                          | `session/SessionLogPanel.tsx`     |
| Agent launch                | DIAL-17, DIAL-28       | R    | done   | `mobile/src/session/agent-launch/mobile-agent-launch-availability.ts`                                                    | `wheels/right-wheel.ts`           |
| Account usage               | OVR-1                  | N    | done   | `mobile/src/components/AccountUsage.tsx`                                                                                 | `overview/`                       |
| Settings and hosts          | SET-1…7                | R/N  | done   | `mobile/src/settings/`, the pairing routes                                                                               | `settings/`                       |
| In-app updates              | DECK-R46, R47, R49     | R    | done   | `mobile/src/app-update/app-update-source.ts` + `updates/fork-release-update-source.ts`                                   | `updates/`                        |
| Ports                       | PRJ-4                  | H    | done   | no workspace-ports RPC in `src/main/runtime/rpc/methods` (searched: none)                                                | `ports/use-deck-ports.ts`         |
| Host CPU / RAM / bandwidth  | OVR-1                  | H    | done   | no host-stats RPC in `src/main/runtime/rpc/methods` (searched: none)                                                     | `overview/`                       |

## Strict parsers

Audited in T12. The deck reads every host reply through `host/lenient-host-data.ts`; the schemas
below are the ones behind the R rows, with what each one does to a field this build does not know.

| Schema                                             | Shape                      | What an unknown field or value gets              |
| -------------------------------------------------- | -------------------------- | ------------------------------------------------ |
| `transport/hosts/host-status-reply-schema.ts`      | `looseObject` + salvage    | kept; capabilities read as declared              |
| `worktree/worktree-catalog-reply-schema.ts`        | `looseObject` + salvage    | kept                                             |
| `agent-history/agent-history-reply-schema.ts`      | `looseObject` + salvage    | kept                                             |
| `source-control/git-status-reply-schema.ts`        | `looseObject` + `openEnum` | kept; unknown entry kind maps to a neutral value |
| `source-control/worktree-metadata-reply-schema.ts` | `z.object`                 | **stripped** — the deck re-reads it leniently    |
| `automations/automation-reply-schema.ts`           | `z.object`                 | **stripped** — not on a deck R row today         |

The two `z.object` rows never fail a parse, so they cannot blank a screen; they do drop fields, so a
deck screen that needs one of them reads the raw reply through the helpers above.
