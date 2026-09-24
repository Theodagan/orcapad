import { useCallback } from 'react'
import { View } from 'react-native'
import { useSessionControllerBinding } from '../gamepad/bindings/use-session-controller-binding'
import { styles } from './mobile-session-styles'
import type { MobileSessionController } from './use-mobile-session-controller'
import { MobileSessionContentRow } from './MobileSessionContentRow'
import { MobileSessionHeader } from './MobileSessionHeader'
import { MobileSessionSheets } from './MobileSessionSheets'

const tabIdOf = (tab: { id: string }): string => tab.id

export function MobileSessionSurface({ controller }: { controller: MobileSessionController }) {
  const { setMobileSessionRootRef } = controller

  const goBack = useCallback(() => controller.router.back(), [controller.router])

  // LB/RB reach the existing tab activation, so a controller switch and a tap on the tab strip
  // are the same handover (BIND-AC3).
  useSessionControllerBinding({
    sessionId: controller.worktreeId,
    tabs: controller.sessionTabs,
    idOf: tabIdOf,
    activeTabId: controller.activeSessionTabId,
    onSwitchTab: controller.switchSessionTab,
    onBack: goBack
  })

  return (
    <View ref={setMobileSessionRootRef} style={styles.container}>
      <View style={styles.kavInner}>
        <MobileSessionHeader controller={controller} />
        {/* Content-row host (KTD2): on wide, content shares this row with the docked panel as the flex-1 left child. */}
        <MobileSessionContentRow controller={controller} />
      </View>
      <MobileSessionSheets controller={controller} />
    </View>
  )
}
