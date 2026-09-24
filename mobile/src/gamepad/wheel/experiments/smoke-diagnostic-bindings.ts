import type { WheelActionBinding, WheelActionBindingId, WheelRegistry } from '../wheel-registry'
import type { SegmentAvailability } from '../wheel-segment'

/**
 * Bindings that do nothing to Orca. WHEEL-R7 keeps early trials safe, so a smoke binding's whole
 * job is to record that it ran: nothing it touches can be stopped, closed, forgotten or deleted,
 * and a trial can be repeated as often as the tester likes.
 *
 * It does have to be *visible*, though. A commit and a cancel both just close the wheel, so a
 * silent no-op would leave a device trial unable to tell them apart — which is precisely what
 * WHEEL-T8 counts (`wrongCommitCount`, `cancelFailureCount`). Each run therefore re-registers its
 * binding under a label carrying the run count, so reopening the wheel shows what landed without
 * any trial-only UI to build and then remove.
 */

export type SmokeBindingSpec = {
  readonly id: WheelActionBindingId
  readonly label: string
  readonly availability: SegmentAvailability
}

/**
 * One spec per diagnostic slot, plus the two states a preset needs to exercise: a refused
 * binding, which must render and cancel rather than vanish, and an unproven one, which commits
 * and lets the action report its own result (`002` §6).
 */
export const SMOKE_BINDING_SPECS: readonly SmokeBindingSpec[] = [
  { id: 'smoke.slot-1', label: 'Slot 1', availability: 'available' },
  { id: 'smoke.slot-2', label: 'Slot 2', availability: 'available' },
  { id: 'smoke.slot-3', label: 'Slot 3', availability: 'available' },
  { id: 'smoke.slot-4', label: 'Slot 4', availability: 'available' },
  { id: 'smoke.slot-5', label: 'Slot 5', availability: 'available' },
  { id: 'smoke.slot-6', label: 'Slot 6', availability: 'available' },
  { id: 'smoke.refused', label: 'Refused', availability: 'unavailable' },
  { id: 'smoke.unproven', label: 'Unproven', availability: 'unknown' }
]

export type SmokeDiagnosticRun = {
  readonly bindingId: WheelActionBindingId
  /** `Date.now()` at invocation. A trial wants the order and the gaps, not wall-clock precision. */
  readonly at: number
}

export type SmokeDiagnostics = {
  /** Registers every spec and returns the one call that retracts all of them. */
  readonly register: (registry: WheelRegistry) => () => void
  /** What has run, oldest first. This is the trial's raw evidence (WHEEL-T8). */
  readonly runs: () => readonly SmokeDiagnosticRun[]
  readonly clear: () => void
}

function registerCounting(
  spec: SmokeBindingSpec,
  registry: WheelRegistry,
  runs: SmokeDiagnosticRun[]
): () => void {
  let count = 0
  let retract: () => void = () => {}

  function place(): void {
    const binding: WheelActionBinding = {
      id: spec.id,
      label: count === 0 ? spec.label : `${spec.label} x${count}`,
      availability: spec.availability,
      run: () => {
        runs.push({ bindingId: spec.id, at: Date.now() })
        count += 1
        // Replaces itself under the same id, so the next open shows the new count. The registry
        // holds one entry per id, which is why this swaps rather than accumulates.
        place()
      }
    }
    retract = registry.register(binding)
  }

  place()
  return () => retract()
}

export function createSmokeDiagnostics(): SmokeDiagnostics {
  const runs: SmokeDiagnosticRun[] = []
  return {
    register: (registry) => {
      const retractions = SMOKE_BINDING_SPECS.map((spec) => registerCounting(spec, registry, runs))
      return () => {
        for (const retract of retractions) {
          retract()
        }
      }
    },
    runs: () => [...runs],
    clear: () => {
      runs.length = 0
    }
  }
}
