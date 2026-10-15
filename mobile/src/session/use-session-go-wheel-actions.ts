import { useMemo, useRef } from 'react'
import { GO_ACTION_IDS } from '../gamepad/bindings/wheel-action-ids'
import { useWheelActions } from '../gamepad/bindings/use-wheel-actions'
import type { WheelBinding } from '../gamepad/wheel/wheel-registry'
import type { MobileSessionController } from './use-mobile-session-controller'

/**
 * GO's session slots (`012`): Files, Changes and History, over the header's own panel taps and
 * history action, so the wheel and the header open the same thing the same way.
 */
export function useSessionGoWheelActions(controller: MobileSessionController): void {
  const { showAgentSessionHistoryAction } = controller
  // The panel handlers are rebuilt each render; read them at run time, not as dependencies.
  const live = useRef(controller)
  live.current = controller

  const bindings = useMemo<readonly WheelBinding[]>(
    () => [
      {
        id: GO_ACTION_IDS.files,
        label: 'Files',
        availability: 'available',
        run: () => live.current.handlePanelTap('files')
      },
      {
        id: GO_ACTION_IDS.changes,
        label: 'Changes',
        availability: 'available',
        run: () => live.current.handlePanelTap('sourceControl')
      },
      {
        id: GO_ACTION_IDS.history,
        label: 'History',
        availability: showAgentSessionHistoryAction ? 'available' : 'unavailable',
        reason: 'No agent history here',
        run: () => live.current.openAgentSessionHistory()
      }
    ],
    [showAgentSessionHistoryAction]
  )

  useWheelActions(bindings)
}
