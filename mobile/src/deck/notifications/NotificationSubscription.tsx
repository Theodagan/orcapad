import { useEffect } from 'react'
import type { RpcClient } from '../../transport/rpc/rpc-client-contract'
import { lenientNumber, lenientRecord, lenientText } from '../host/lenient-host-data'
import type { DeckNotification } from './use-deck-notifications'

export function NotificationSubscription({
  hostId,
  client,
  onPresent,
  onDismiss
}: {
  hostId: string
  client: RpcClient
  onPresent: (notification: DeckNotification) => void
  onDismiss: (id: string) => void
}): null {
  useEffect(() => {
    const unsubscribe = client.subscribe(
      'notifications.subscribe',
      { includeDesktopSuppressed: true },
      (raw) => {
        const event = lenientRecord(raw)
        if (event.type === 'dismiss') {
          onDismiss(lenientText(event.notificationId))
          return
        }
        if (event.type !== 'notification') {
          return
        }
        const title = lenientText(event.title)
        const body = lenientText(event.body)
        if (!title && !body) {
          return
        }
        onPresent({
          id:
            lenientText(event.notificationId) ||
            `${hostId}:${lenientNumber(event.notificationSeq, Date.now())}`,
          title,
          body,
          hostId,
          worktreeId: lenientText(event.worktreeId) || null,
          paneKey: lenientText(event.paneKey) || null
        })
      }
    )
    return unsubscribe
  }, [client, hostId, onDismiss, onPresent])
  return null
}
