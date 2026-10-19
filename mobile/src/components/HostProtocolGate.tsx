import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useHostClient } from '../transport/client-context'
import { useHostStatusGates } from '../transport/host-status-gates'
import { colors } from '../theme/mobile-theme'
import { HostStatusGatesContext } from './host-protocol-gates-context'
import { HostVersionNoticeStrip } from './HostVersionNoticeStrip'
import type { BlockedCompatVerdict } from './host-version-notice'

type Props = {
  hostId: string | undefined
  children: ReactNode
}

// Why: single choke point above every /h/[hostId] route. A blocked verdict no longer replaces the
// host UI (the pad fork runs behind the official desktop): it shows a version strip above it.
export function HostProtocolGate({ hostId, children }: Props) {
  const { client, state } = useHostClient(hostId)
  const gates = useHostStatusGates({ hostId, client, connState: state })
  const { compatVerdict, statusPending } = gates
  const resolvedHostIdRef = useRef<string | null>(null)
  const mountedHostIdRef = useRef<string | null>(null)
  const hostKey = hostId ?? null
  const resolvedNow = state === 'connected' && client !== null && !statusPending
  const [stripDismissedFor, setStripDismissedFor] = useState<string | null>(null)
  const stripVerdict =
    compatVerdict.kind === 'blocked' && stripDismissedFor !== hostKey ? compatVerdict : null
  const pending = statusPending && resolvedHostIdRef.current !== hostKey
  const holdBack = pending && mountedHostIdRef.current !== hostKey

  // Why: React can replay or discard a render, so the latches record committed
  // outcomes only — a discarded children render must not count as mounted.
  useEffect(() => {
    if (resolvedNow) {
      resolvedHostIdRef.current = hostKey
    }
    if (!holdBack) {
      mountedHostIdRef.current = hostKey
    }
  })

  if (holdBack) {
    // Why: nothing is mounted yet for this host, so hold the routes back entirely
    // rather than letting them mount (and fire their connect RPCs) pre-verdict.
    return (
      <View style={styles.pending}>
        <ActivityIndicator
          color={colors.textSecondary}
          accessibilityLabel="Checking host compatibility"
        />
      </View>
    )
  }
  // Why: the host sidebar needs the same status fields; sharing the result avoids a second status.get per route.
  return (
    <HostStatusGatesContext.Provider value={gates}>
      <View style={styles.host}>
        {stripVerdict === null ? null : (
          <TopVersionStrip verdict={stripVerdict} onDismiss={() => setStripDismissedFor(hostKey)} />
        )}
        <View
          style={styles.host}
          // Why: the overlay blocks in-tree touches but TalkBack can still walk the covered
          // stack; hide it while pending (Android counterpart of the overlay's iOS modal flag).
          importantForAccessibility={pending ? 'no-hide-descendants' : 'auto'}
        >
          <BelowStrip stripShown={stripVerdict !== null}>{children}</BelowStrip>
        </View>
        {pending ? (
          // Why: once the stack is mounted, unmounting it for a pending status.get destroys
          // in-flight nested navigation, so cover it instead. Mount effects underneath still
          // run — they wait for connState 'connected' and every capability-dependent call
          // re-probes status.get itself, so nothing newer than the baseline fires here.
          <View
            style={styles.pendingOverlay}
            // Why: the fill owns the hit test for in-tree views only — native-Modal-hosted
            // surfaces (bottom drawers) present in a separate window above it and stay live.
            pointerEvents="auto"
            accessibilityViewIsModal
          >
            <ActivityIndicator
              color={colors.textSecondary}
              accessibilityLabel="Checking host compatibility"
            />
          </View>
        ) : null}
      </View>
    </HostStatusGatesContext.Provider>
  )
}

/** The strip takes the status-bar inset, so the screens below it must not pad for it again. */
function TopVersionStrip({
  verdict,
  onDismiss
}: {
  verdict: BlockedCompatVerdict
  onDismiss: () => void
}) {
  const { top } = useSafeAreaInsets()
  return (
    <View style={{ paddingTop: top }}>
      <HostVersionNoticeStrip verdict={verdict} onDismiss={onDismiss} />
    </View>
  )
}

// Always mounted, so the strip coming or going never remounts the routes below it.
function BelowStrip({ stripShown, children }: { stripShown: boolean; children: ReactNode }) {
  const insets = useSafeAreaInsets()
  const below = useMemo(() => (stripShown ? { ...insets, top: 0 } : insets), [insets, stripShown])
  return <SafeAreaInsetsContext.Provider value={below}>{children}</SafeAreaInsetsContext.Provider>
}

const styles = StyleSheet.create({
  pending: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgBase
  },
  // Stays mounted across the overlay toggling so the routes below keep their identity.
  host: {
    flex: 1
  },
  pendingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgBase,
    zIndex: 1000,
    elevation: 1000
  }
})
