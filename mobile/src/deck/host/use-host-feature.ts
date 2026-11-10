import { useHostClient } from '../../transport/connection/host-client-hooks'
import { useHostStatusGates } from '../../transport/connection/host-status-gates'
import {
  resolveHostFeature,
  type DeckHostFeature,
  type HostFeatureAvailability
} from './host-feature'

/** Reads the host's declared capabilities for one host; an absent host is simply not connected. */
export function useHostFeature(
  feature: DeckHostFeature,
  hostId: string | undefined
): HostFeatureAvailability {
  const { client, state } = useHostClient(hostId)
  const gates = useHostStatusGates({ hostId, client, connState: state })
  return resolveHostFeature({
    feature,
    capabilities: gates.hostCapabilities,
    connected: hostId !== undefined && state === 'connected' && client !== null,
    statusReadable: gates.statusReadable && !gates.statusPending
  })
}
