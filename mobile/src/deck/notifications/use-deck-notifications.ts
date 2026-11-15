import { useEffect, useState } from 'react'
import { useTransientToast } from '../../components/TransientToast'
import { lenientNumber, lenientRecord, lenientText } from '../host/lenient-host-data'
import type { DeckHostData } from '../host/use-deck-host-data'

export type DeckNotification = {
  readonly id: string
  readonly title: string
  readonly body: string
  readonly hostId: string
  readonly worktreeId: string | null
  readonly paneKey: string | null
}

export function useDeckNotifications(data: DeckHostData) {
  const [notifications, setNotifications] = useState<readonly DeckNotification[]>([])
  const toast = useTransientToast()
  const clientsKey = data.allClients
    .map((entry) => `${entry.hostId}:${entry.client.getGeneration?.() ?? 0}`)
    .join('|')
  useEffect(() => {
    const subscriptions = data.allClients.map(({ hostId, client }) =>
      client.subscribe('notifications.subscribe', { includeDesktopSuppressed: true }, (raw) => {
        const event = lenientRecord(raw)
        if (event.type === 'dismiss') {
          const id = lenientText(event.notificationId)
          setNotifications((current) => current.filter((entry) => entry.id !== id))
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
        const id =
          lenientText(event.notificationId) ||
          `${hostId}:${lenientNumber(event.notificationSeq, Date.now())}`
        const notification: DeckNotification = {
          id,
          title,
          body,
          hostId,
          worktreeId: lenientText(event.worktreeId) || null,
          paneKey: lenientText(event.paneKey) || null
        }
        setNotifications((current) =>
          [notification, ...current.filter((entry) => entry.id !== id)].slice(0, 20)
        )
        toast.showToast(`${title}: ${body}`)
      })
    )
    return () => subscriptions.forEach((unsubscribe) => unsubscribe())
  }, [clientsKey, data.allClients, toast.showToast])
  return { notifications, toastMessage: toast.message }
}
