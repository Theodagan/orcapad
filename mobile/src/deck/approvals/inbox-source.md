# D5 — the source the Approvals inbox reads (T63)

Decision recorded 2026-11-13 for run 4, from the code in this checkout. T64 builds on it.

## What exists

- **Prompts are derived per session, not subscribed to.** `session/use-mobile-native-chat-prompt-controller.ts`
  gives the chat its permission, question and ask cards by calling
  `useMobileNativeChatPrompts` (`session/native-chat/input/use-mobile-native-chat-prompts.ts`) with
  that session's own `status: AgentStatusEntry`, its `messages`, and `transcriptLoading`. The module
  is pure derivation (`scanPendingAsks`, `resolveNativeChatInteractivePromptCard`): it opens no
  subscription of its own, so there is nothing app-wide to reuse as a list.
- **The host's agent status is the widest feed the phone already holds.** The Agents list builds
  `AgentListRow`s across paired desktops from `AgentListInput` (`agents/agent-list-rows.ts`):
  `hosts`, `hostStates` (connection per desktop) and `worktreeInfo` (`HostWorktreeInfo` per host).
  Each row carries the agent's `RuntimeWorktreeAgentRow`, whose status already says whether the
  agent is waiting on the user (`agentStatusGroup` → `needs-you`, `rowNeedsYou`). That feed is
  host-wide and is already read for Home and the deck's Overview, so listing "which sessions need
  me" costs no new RPC traffic.
- **The exact request is per session.** The permission's text, its options and its prompt id come
  from that session's transcript and status; there is no host-wide payload carrying the request
  body (the transcript read is `session/native-chat/agent-session/mobile-native-chat-page-read-operations.ts`,
  and a structured chat answers through its own session journal).

## The choice

**T64 reads the host-wide agent-status feed for the list, and the per-session prompt controller for
the one prompt it opens.** Concretely: the inbox's rows are `AgentListRow`s filtered by
`rowNeedsYou` (or `agentStatusGroup(...) === 'needs-you'`), grouped by host; a row that is selected
opens its session with `requestId` bound to that prompt's identity, and the exact request shown there
comes from `useMobileNativeChatPromptController` for that session — the same data the chat screen
shows inline (T60). A decision is then sent by T61's confirmation, which is bound to the request id
it shows.

## Why this one, and what it costs

- **Cost of the chosen source:** no new subscription for the list. One transcript read per session
  the user actually opens. The list can be stale by the status feed's own staleness, which the deck
  already shows as a stale row rather than a claim (`stale`, `offline` on `AgentListRow`).
- **The alternative — a per-session subscription for every open session — is rejected.** It would
  need one live session object per agent across all paired desktops just to know whether a prompt
  exists, which is the transcript cost of the app paid continuously to fill a list. It also breaks
  the deck behind a closed screen: `deck/` must not hold session state it does not show.
- **What it does not give:** a prompt whose agent status says it does not need the user is not
  listed even if a transcript still holds an unanswered ask. That is deliberate — the deck lists what
  the host declares (`DECK-R37`), and `scanPendingAsks` only treats an unsettled ask as pending when
  the transcript is not loading.

## What T64 still has to build

1. `approvals/use-deck-approvals.ts` over `AgentListInput` (from the same sources Home reads), not
   over `home/use-mobile-home-data.ts`: that hook imports the web-shell module, which the deck
   boundary (`deck-boundary.test.ts`, DECK-R40) forbids.
2. The row → session route hand-off with the prompt identity, so T61's confirmation is bound to the
   request the row named.
3. Documentation fields Orca has no equivalent for (the plan's "H"), shown disabled with their reason.

## Not verified here

No desktop or device was reachable from the worker, so this note is a reading of the code, not a
run against a live host. The per-session prompt derivation is the part to re-check first when T64
starts: if a newer host adds a host-wide pending-prompt feed, it supersedes this and the inbox should
read it instead.
