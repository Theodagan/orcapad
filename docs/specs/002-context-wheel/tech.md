# 002 - Context Wheel - Technical Specification

## 1. Domain

```ts
type WheelId = 1 | 2
type WheelSegmentId = string

type WheelSegment = {
  readonly id: WheelSegmentId
  readonly label: string
  readonly centerAngle: number
  readonly halfWidth: number
  readonly availability: 'available' | 'unavailable' | 'unknown'
  readonly bindingId: string
}

type WheelState =
  | { readonly kind: 'closed' }
  | { readonly kind: 'open'; readonly wheel: WheelId; readonly locked: WheelSegmentId | null }

type WheelOutcome =
  | { readonly kind: 'state'; readonly state: WheelState }
  | { readonly kind: 'commit'; readonly wheel: WheelId; readonly segmentId: WheelSegmentId }
  | { readonly kind: 'cancel' }
```

Geometry is total: any vector and segment set returns a segment id or `null`.
Angles and widths are preset data, not feature code.

## 2. State transitions

| Current | Input | Result |
| --- | --- | --- |
| closed | Wheel 1 vector outside dead zone | open Wheel 1 and select by angle |
| closed | Wheel 2 vector outside dead zone | open Wheel 2 and select by angle |
| open | active vector enters valid segment | update lock |
| open | active vector centers or enters dead arc | cancel and close |
| open | `A` with available/unknown lock | emit commit and close |
| open | `A` with no lock or unavailable lock | cancel and close |
| open | `B` or controller disconnect | cancel and close |
| open | inactive-stick movement | no change |

Only the dispatcher handling `commit` resolves `bindingId` and invokes an
existing action.

## 3. Registry and presets

The registry contains action bindings contributed by `003`. A preset references
bindings by id and supplies layout data. Removing a surface unregisters its
binding; the preset remains inspectable but the segment becomes unavailable.

Presets live in a dedicated experiment directory and carry
`contractual: false` as literal data. A boundary test rejects a default or
contractual preset until an explicit product-decision record exists.

## 4. Rendering

Use React Native Reanimated 4 shared values/worklets for input-rate needle and
highlight updates where profiling shows a benefit. Keep lock and open/closed
state synchronized with the pure machine.

Official documentation:

- shared values and worklets:
  <https://docs.swmansion.com/react-native-reanimated/docs/guides/worklets>;
- Reanimated 4 requires the Worklets Babel plugin:
  <https://docs.swmansion.com/react-native-reanimated/docs/reanimated-babel-plugin/about>.

The documentation does not guarantee a sample frequency or Orca's end-to-end
latency. Device measurements remain authoritative.

## 5. Trial record

```ts
type WheelTrialRecord = {
  readonly trialId: string
  readonly testedAt: string
  readonly device: string
  readonly controller: string
  readonly presetId: string
  readonly sampleCount: number
  readonly openLatencyP95Ms: number
  readonly accidentalOpenCount: number
  readonly wrongCommitCount: number
  readonly cancelFailureCount: number
  readonly notes: string
  readonly disposition: 'reject' | 'iterate' | 'candidate'
}
```

Human acceptance remains separate from `candidate` trial status.

## 6. Failure behavior

| Condition | Behavior |
| --- | --- |
| Empty preset | open with no lock; `A` cancels |
| Binding unavailable | render disabled; `A` cancels |
| Binding unknown | keep stable position; commit delegates and surfaces existing action result |
| Binding unmounts while locked | clear lock; no action |
| Action throws after commit | wheel stays closed; existing surface owns error reporting |
| Controller disconnects | cancel and close |
