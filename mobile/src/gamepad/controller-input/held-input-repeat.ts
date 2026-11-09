import { PRD_CONTROLLER_BINDINGS } from './controller-bindings'
import type { ControllerReader } from './controller-reader'
import type { ControllerPolicy } from './controller-resolver'
import type { ControllerSample } from './controller-sample'
import { DPAD_NAVIGATION_BINDINGS } from './dpad-navigation-bindings'
import { axisOf, isDown, outsideDeadZone } from './sample-edges'

/**
 * A pad reports changes, not state. A trigger held steady at full, or a stick held out, sends
 * nothing after the first sample, so everything that means "for as long as it is held" (scrolling,
 * a wheel staying open, a D-pad repeating) saw one sample and then silence (`005` USE-R1).
 *
 * This decorates a reader so that, while anything held is past its dead zone, the last sample is
 * published again on a timer. Axes are re-read from the device each time rather than replayed: the
 * native layer paces its own emissions, so a release can be dropped, and a replay of the last
 * sample would keep scrolling after the trigger came up. Buttons are never re-read, which is what
 * guarantees a tick cannot invent an edge.
 */

const HELD_REPEAT_INTERVAL_MS = 16

export type HeldInputRepeatOptions = {
  /** Reads the policy at the time of asking, because it follows the attached hardware. */
  readonly policy: () => ControllerPolicy
  /** False while the app is in the background, where a pad can still read as held. */
  readonly isActive?: () => boolean
  readonly intervalMs?: number
}

/** True while something would keep acting if no new sample arrived. */
export function isInputHeld(sample: ControllerSample, policy: ControllerPolicy): boolean {
  if (!sample.connected) {
    return false
  }
  for (const binding of PRD_CONTROLLER_BINDINGS) {
    if (binding.kind === 'trigger' && axisOf(sample, binding.axis) > policy.triggerDeadZone) {
      return true
    }
    if (binding.kind === 'stick') {
      const [horizontal, vertical] = binding.axes
      if (
        outsideDeadZone(axisOf(sample, horizontal), axisOf(sample, vertical), policy.stickDeadZone)
      ) {
        return true
      }
    }
  }
  return policy.dpadNavigation && DPAD_NAVIGATION_BINDINGS.some((b) => isDown(sample, b.button))
}

export function withHeldInputRepeat(
  reader: ControllerReader,
  options: HeldInputRepeatOptions
): ControllerReader {
  const { policy, isActive, intervalMs = HELD_REPEAT_INTERVAL_MS } = options

  return {
    support: reader.support,
    current: reader.current,
    subscribe: (listener) => {
      let timer: ReturnType<typeof setTimeout> | null = null
      let last: ControllerSample | null = null
      let wasHeld = false
      let disposed = false

      const disarm = (): void => {
        if (timer !== null) {
          clearTimeout(timer)
          timer = null
        }
      }
      const arm = (): void => {
        disarm()
        if (!disposed) {
          timer = setTimeout(tick, intervalMs)
        }
      }
      const observe = (sample: ControllerSample, fromDevice: boolean): void => {
        const held = isInputHeld(sample, policy()) && (isActive?.() ?? true)
        // A release that arrived as an event gets one more tick, so the settle is read from the
        // device. One a tick already read from the device has nothing left to confirm.
        const settling = wasHeld && !held && !fromDevice
        last = sample
        wasHeld = held
        if (held || settling) {
          arm()
        } else {
          disarm()
        }
      }
      const deliver = (sample: ControllerSample, fromDevice: boolean): void => {
        try {
          listener(sample)
        } finally {
          // A throwing listener must not end the chain, or a held trigger would freeze mid-scroll.
          observe(sample, fromDevice)
        }
      }
      function tick(): void {
        timer = null
        if (disposed || last === null) {
          return
        }
        const fresh = reader.current()
        deliver(
          fresh.connected
            ? { ...last, axes: fresh.axes, connected: true, sampledAt: fresh.sampledAt }
            : fresh,
          true
        )
      }

      const unsubscribe = reader.subscribe((sample) => deliver(sample, false))
      return () => {
        disposed = true
        disarm()
        unsubscribe()
      }
    }
  }
}
