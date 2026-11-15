import { useState, type ReactNode } from 'react'
import { useRouter } from 'expo-router'
import { MobileStateView } from '../../components/MobileStateView'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import { CarouselShell } from '../collections/CarouselShell'
import { CardsLayout } from '../collections/layouts/CardsLayout'
import { GridLayout } from '../collections/layouts/GridLayout'
import { KanbanLayout } from '../collections/layouts/KanbanLayout'
import { ListLayout } from '../collections/layouts/ListLayout'
import { useDeckSessions } from './use-deck-sessions'

export function DeckSessions(): ReactNode {
  const t = useMobileTranslation()
  const router = useRouter()
  const data = useDeckSessions()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [layout, setLayout] = useState<'cards' | 'kanban' | 'list' | 'grid'>('cards')
  const selected = data.sessions.some((session) => session.id === selectedId)
    ? selectedId
    : (data.sessions[0]?.id ?? null)
  const openSession = (id: string): void => {
    const session = data.sessions.find((candidate) => candidate.id === id)
    if (!session) {
      return
    }
    setSelectedId(id)
    const path = `/deck/s/${encodeURIComponent(session.hostId)}/${encodeURIComponent(session.worktreeId)}?sessionId=${encodeURIComponent(session.sessionId)}&projectId=${encodeURIComponent(session.projectId ?? '')}`
    router.push(path)
  }

  if (data.error) {
    return (
      <MobileStateView
        title={t('deck.sessions.error', 'Couldn’t load sessions')}
        message={data.error}
      />
    )
  }
  if (data.loading && data.sessions.length === 0) {
    return <MobileStateView loading title={t('deck.sessions.loading', 'Loading sessions…')} />
  }
  if (data.sessions.length === 0) {
    return (
      <MobileStateView
        title={t('deck.sessions.empty.title', 'No live sessions')}
        message={t(
          'deck.sessions.empty.body',
          'Start an agent on a paired desktop to see it here.'
        )}
      />
    )
  }

  const layoutProps = { items: data.sessions, selectedId: selected, onSelectItem: openSession }
  return (
    <CarouselShell
      items={data.sessions}
      selectedId={selected}
      onSelectItem={setSelectedId}
      layout={layout}
      onLayoutChange={setLayout}
    >
      {() => {
        if (layout === 'kanban') {
          return <KanbanLayout {...layoutProps} />
        }
        if (layout === 'list') {
          return <ListLayout {...layoutProps} />
        }
        if (layout === 'grid') {
          return <GridLayout {...layoutProps} />
        }
        return <CardsLayout {...layoutProps} />
      }}
    </CarouselShell>
  )
}
