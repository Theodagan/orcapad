import { installedAppVersion } from '../app-update/app-update-runtime'
import { useWallAppUpdate } from '../app-update/use-wall-app-update'
import { HostRouteNoticeBanner } from './HostRouteNoticeBanner'
import { hostVersionNoticeMessage, type BlockedCompatVerdict } from './host-version-notice'

export function HostVersionNoticeStrip({
  verdict,
  onDismiss
}: {
  verdict: BlockedCompatVerdict
  onDismiss: () => void
}) {
  const available = useWallAppUpdate()
  const message = hostVersionNoticeMessage({
    verdict,
    available: available?.version ?? null,
    installed: installedAppVersion
  })
  return <HostRouteNoticeBanner message={message} onDismiss={onDismiss} />
}
