import { useLocalSearchParams } from 'expo-router'
import { MobileAccountsScreen } from '../../../src/accounts/MobileAccountsScreen'
import { MobileWebShellScreen } from '../../../src/mobile-web-shell/MobileWebShellScreen'
import { shellScreenRoute } from '../../../src/mobile-web-shell/shell-screen-route'
import { shellSwitchDecision } from '../../../src/mobile-web-shell/shell-switch-decision'
import { firstParam } from '../../../src/navigation/route-param-reader'

/** The shell's switch for the host's agent accounts, in `tasks.tsx`'s shape. */
export default function MobileAccountsRoute() {
  const params = useLocalSearchParams<{ hostId?: string | string[] }>()
  const hostId = firstParam(params.hostId)
  const native = <MobileAccountsScreen />

  const route = hostId
    ? shellScreenRoute({ pathname: `/h/${encodeURIComponent(hostId)}/accounts` })
    : null
  const decision = shellSwitchDecision(route)

  if (decision.kind === 'native') {
    return native
  }
  // Keyed on the host: a session keeps the grants it opened with, so a new host is a remount.
  return <MobileWebShellScreen key={hostId} hostId={hostId} route={decision.route} />
}
