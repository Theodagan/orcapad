import { useCallback, useState } from 'react'
import { useTransientToast } from '../../components/TransientToast'

export type DeckNotification = {
  readonly id: string
  readonly title: string
  readonly body: string
  readonly hostId: string
  readonly worktreeId: string | null
  readonly paneKey: string | null
}

export function useDeckNotifications() {
  const [notifications, setNotifications] = useState<readonly DeckNotification[]>([])
  const toast = useTransientToast()
  const dismiss = useCallback((id: string) => {
    setNotifications((current) => current.filter((entry) => entry.id !== id))
  }, [])
  const present = useCallback(
    (notification: DeckNotification) => {
      setNotifications((current) =>
        [notification, ...current.filter((entry) => entry.id !== notification.id)].slice(0, 20)
      )
      toast.showToast(`${notification.title}: ${notification.body}`)
    },
    [toast.showToast]
  )
  return { notifications, toastMessage: toast.message, dismiss, present }
}
