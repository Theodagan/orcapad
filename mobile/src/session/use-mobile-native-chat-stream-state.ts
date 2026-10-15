import type { MobileNativeChatTab } from './mobile-native-chat-eligibility'
import { mobileNativeChatStreamPreview } from './mobile-native-chat-streaming-gate'
import { useThrottledLatestValue } from './use-throttled-latest-value'

const NATIVE_CHAT_STREAM_THROTTLE_MS = 50

/** Whether the agent is streaming, and the throttled text of the bubble it streams into. */
export function useMobileNativeChatStreamState(args: {
  structured: boolean
  structuredWorking: boolean
  tabAgentWorking: boolean
  resolved: boolean
  status: MobileNativeChatTab['agentStatus'] | null
}) {
  const { structured, structuredWorking, tabAgentWorking, resolved, status } = args
  // Deliberately not gated on the chat view being visible: the streaming gate
  // has to tell "hidden mid-turn" from "the turn ended".
  const nativeChatStreamLive = structured ? structuredWorking : tabAgentWorking
  const nativeChatAgentWorking = nativeChatStreamLive && (structured || resolved)
  // Throttle the streaming bubble: OpenCode emits a status frame per streamed
  // part, and each one re-renders and re-parses the whole accumulated markdown.
  const nativeChatStreamingText = useThrottledLatestValue(
    structured ? undefined : mobileNativeChatStreamPreview(status, nativeChatAgentWorking),
    NATIVE_CHAT_STREAM_THROTTLE_MS
  )
  return {
    nativeChatStreamLive,
    nativeChatAgentWorking,
    nativeChatStreamingText
  }
}
