import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import type { DeckScreenKind } from '../context/deck-context'
import { disabledReasonText } from '../host/disabled-reason'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import { useDeckTheme } from '../theme/deck-theme'
import { columnVisible, panelColumnsLayout } from './panel-columns'
import { panelsForSide, type DeckPanel } from './panel-registry'

/**
 * DECK-R3: three columns that split the width; a column with no width is not rendered at all.
 * `renderPanel` is how a panel with content of its own draws it; a panel it does not answer for
 * keeps its title and its disabled reason instead of looking like an empty list.
 */
export function PanelColumns({
  screen,
  windowWidth,
  renderPanel,
  children
}: {
  screen: DeckScreenKind
  windowWidth: number
  renderPanel?: (panel: DeckPanel) => ReactNode | undefined
  children: ReactNode
}): ReactNode {
  const theme = useDeckTheme()
  const left = panelsForSide(screen, 'left')
  const right = panelsForSide(screen, 'right')
  const layout = panelColumnsLayout(windowWidth, { left: left.length > 0, right: right.length > 0 })
  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: theme.color.base }}>
      {columnVisible(layout.left) ? (
        <PanelColumn panels={left} width={layout.left} renderPanel={renderPanel} />
      ) : null}
      <View style={{ width: layout.main, flexGrow: 1 }}>{children}</View>
      {columnVisible(layout.right) ? (
        <PanelColumn panels={right} width={layout.right} renderPanel={renderPanel} />
      ) : null}
    </View>
  )
}

function PanelColumn({
  panels,
  width,
  renderPanel
}: {
  panels: readonly DeckPanel[]
  width: number
  renderPanel?: (panel: DeckPanel) => ReactNode | undefined
}): ReactNode {
  const t = useMobileTranslation()
  const theme = useDeckTheme()
  return (
    <View
      style={{
        width,
        backgroundColor: theme.color.panel,
        borderRightWidth: 1,
        borderRightColor: theme.color.hair,
        padding: theme.space.sm,
        gap: theme.space.xs
      }}
    >
      {panels.map((panel) => (
        <View key={panel.id} style={{ gap: theme.space.xs }}>
          <Text style={{ color: theme.color.text1, fontSize: theme.text.body }}>
            {t(panel.titleKey, panel.titleKey)}
          </Text>
          {renderPanel?.(panel) ??
            (panel.disabledReason === null ? null : (
              <Text style={{ color: theme.color.text3, fontSize: theme.text.meta }}>
                {disabledReasonText(t, panel.disabledReason)}
              </Text>
            ))}
        </View>
      ))}
    </View>
  )
}
