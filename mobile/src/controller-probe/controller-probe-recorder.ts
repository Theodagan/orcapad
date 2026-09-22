import type {
  ProbeDevice,
  ProbeDeviceChange,
  ProbeInputEvent
} from '../../modules/orca-gamepad-probe'

/**
 * Holds what CTRL-T1 came to record. Module-level on purpose: the WebView question is answered
 * by starting the tap here, walking to a terminal session, and coming back, so the buffer has
 * to outlive the probe screen.
 */

/** A stable identity for a recorded event: the native payload carries none. */
export type RecordedProbeEvent = ProbeInputEvent & { readonly seq: number }

export type ProbeRecording = {
  readonly startedAt: number
  readonly devices: readonly ProbeDevice[]
  readonly events: readonly RecordedProbeEvent[]
  readonly deviceChanges: readonly ProbeDeviceChange[]
  /** Events the ring buffer discarded, so a truncated record says so rather than lying. */
  readonly droppedEvents: number
}

export type ControllerProbeRecorder = {
  readonly setDevices: (devices: readonly ProbeDevice[]) => void
  readonly record: (event: ProbeInputEvent) => void
  readonly recordDeviceChange: (change: ProbeDeviceChange) => void
  readonly snapshot: () => ProbeRecording
  readonly reset: (startedAt: number) => void
  readonly subscribe: (listener: () => void) => () => void
}

export function createControllerProbeRecorder(capacity: number): ControllerProbeRecorder {
  let startedAt = 0
  let devices: readonly ProbeDevice[] = []
  let events: RecordedProbeEvent[] = []
  let nextSeq = 0
  let deviceChanges: ProbeDeviceChange[] = []
  let droppedEvents = 0
  let current: ProbeRecording = frozen()
  const listeners = new Set<() => void>()

  function frozen(): ProbeRecording {
    return { startedAt, devices, events, deviceChanges, droppedEvents }
  }

  function publish(): void {
    current = frozen()
    for (const listener of listeners) {
      listener()
    }
  }

  return {
    setDevices: (next) => {
      devices = next
      publish()
    },
    record: (event) => {
      events = [...events, { ...event, seq: nextSeq }]
      nextSeq += 1
      if (events.length > capacity) {
        droppedEvents += events.length - capacity
        events = events.slice(events.length - capacity)
      }
      publish()
    },
    recordDeviceChange: (change) => {
      deviceChanges = [...deviceChanges, change]
      devices = change.devices
      publish()
    },
    // Referentially stable between writes, which is what useSyncExternalStore requires.
    snapshot: () => current,
    reset: (at) => {
      startedAt = at
      devices = []
      events = []
      deviceChanges = []
      droppedEvents = 0
      nextSeq = 0
      publish()
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    }
  }
}

/**
 * What is safe to commit. A pad's model name identifies hardware and is the point of the
 * record; the phone's own input devices can carry a user-chosen device name, so those are
 * dropped. Event times are rebased to the recording so an absolute uptime never lands in git.
 * The native side already withholds `InputDevice.getDescriptor()`, which is per-device stable.
 */
export function scrubRecording(recording: ProbeRecording): ProbeRecording {
  const firstEventTime = recording.events[0]?.eventTime ?? 0
  const scrubDevice = (device: ProbeDevice): ProbeDevice =>
    device.isGameController ? device : { ...device, name: 'redacted-non-controller' }

  return {
    startedAt: 0,
    devices: recording.devices.map(scrubDevice),
    events: recording.events.map((event) => ({
      ...event,
      eventTime: event.eventTime - firstEventTime
    })),
    deviceChanges: recording.deviceChanges.map((change) => ({
      ...change,
      devices: change.devices.map(scrubDevice)
    })),
    droppedEvents: recording.droppedEvents
  }
}

export const controllerProbeRecorder = createControllerProbeRecorder(5_000)
