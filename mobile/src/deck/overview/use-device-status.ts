import { useEffect, useState } from 'react'
import { addBatteryLevelListener, getBatteryLevelAsync } from 'expo-battery'
import { addNetworkStateListener, getNetworkStateAsync, NetworkStateType } from 'expo-network'

export function useDeviceStatus(): {
  readonly batteryPercent: number | null
  readonly network: string | null
  readonly offline: boolean
} {
  const [batteryPercent, setBatteryPercent] = useState<number | null>(null)
  const [network, setNetwork] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  useEffect(() => {
    void getBatteryLevelAsync().then((level) => setBatteryPercent(Math.round(level * 100)))
    const subscription = addBatteryLevelListener(({ batteryLevel }) => {
      setBatteryPercent(Math.round(batteryLevel * 100))
    })
    return () => subscription.remove()
  }, [])
  useEffect(() => {
    const apply = (state: { type?: NetworkStateType; isConnected?: boolean }): void => {
      setNetwork(state.type ?? null)
      setOffline(state.type === NetworkStateType.NONE || state.isConnected === false)
    }
    void getNetworkStateAsync().then(apply)
    const subscription = addNetworkStateListener(apply)
    return () => subscription.remove()
  }, [])
  return { batteryPercent, network, offline }
}
