import { useCallback } from 'react'

/** The composer's send, plus what the view does around a delivered message. */
export function useMobileNativeChatSendHandler(args: {
  onSend: (text: string) => Promise<boolean>
  onClearSendError?: () => void
  jumpToTail: () => void
}): (text: string) => Promise<boolean> {
  const { onSend, onClearSendError, jumpToTail } = args
  return useCallback(
    async (text: string): Promise<boolean> => {
      const accepted = await onSend(text)
      if (!accepted) {
        return false
      }
      // The route-owned banner outlives this send; a success must retire it too,
      // or a stale "Message not sent" sits above the delivered message.
      onClearSendError?.()
      // Always jump to the newest message when the user sends.
      jumpToTail()
      return true
    },
    [onSend, onClearSendError, jumpToTail]
  )
}
