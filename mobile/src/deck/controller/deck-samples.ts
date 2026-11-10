import {
  neutralSample,
  type ControllerAxis,
  type ControllerButton,
  type ControllerSample
} from '../../gamepad/controller-input/controller-sample'

/** A sample with exactly these buttons and axes down: the input to a chord test. */
export function sampleWith(
  down: readonly ControllerButton[],
  sampledAt: number,
  options: {
    readonly connected?: boolean
    readonly axes?: Partial<Record<ControllerAxis, number>>
  } = {}
): ControllerSample {
  const base = neutralSample(sampledAt)
  const buttons = new Map(base.buttons)
  for (const button of down) {
    buttons.set(button, 1)
  }
  const axes = new Map(base.axes)
  for (const [axis, value] of Object.entries(options.axes ?? {})) {
    if (value !== undefined) {
      axes.set(axis as ControllerAxis, value)
    }
  }
  return { ...base, buttons, axes, connected: options.connected ?? true }
}

/** Feeds a sequence of samples to one matcher and collects every intent it produces. */
export function intentsOver(
  matcher: (previous: ControllerSample, next: ControllerSample) => readonly string[],
  steps: readonly ControllerSample[]
): string[] {
  let previous = sampleWith([], 0)
  const intents: string[] = []
  for (const next of steps) {
    intents.push(...matcher(previous, next))
    previous = next
  }
  return intents
}
