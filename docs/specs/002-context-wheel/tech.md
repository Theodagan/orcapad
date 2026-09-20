# 002 — Context Wheel — Technical Specification

## 1. Layout

```text
src/gamepad/
├── domain/
│   └── wheel.ts                      # Wheel, WheelSegment, geometry, selection
├── application/
│   ├── wheel-registry.ts             # features contribute segments here
│   └── use-cases/drive-wheel.ts      # the §3 state machine, pure
└── features/wheel/
    ├── components/WheelOverlay.tsx
    ├── components/WheelSegmentArc.tsx
    └── hooks/use-wheel.ts
```

Geometry and the machine are domain and application, because WHEEL-AC1 requires
each of §3's rules to be testable without rendering anything.

## 2. Domain

```ts
// wheel.ts
export type WheelSegmentId = BrandedId<'WheelSegmentId'>

export type WheelSegment = {
  readonly id: WheelSegmentId
  readonly label: string
  /** Centre of the segment's arc, degrees clockwise from up. */
  readonly angleDeg: number
  readonly availability: Capability
}

export type Wheel = {
  readonly stick: StickSide
  readonly segments: readonly WheelSegment[]
  /**
   * Half-width of every segment's arc. Directions further than this from any
   * segment centre select nothing — which is what makes §3 rule 5's "leaving
   * the valid segment" distinct from "returning to centre".
   */
  readonly arcHalfWidthDeg: number
}
```

A wheel does not have to cover the circle. Four segments at 45° half-width leave
four dead arcs, and pointing into one is a real state: the wheel is open, nothing
is locked, and `A` cancels. Covering the circle is a choice a registry makes, not
an invariant of the geometry.

```ts
/** Null when the vector points at no segment, or is inside the dead zone. */
export function selectSegment(wheel: Wheel, vector: StickVector | null): WheelSegmentId | null
```

`selectSegment` is total and pure: given a wheel and a vector it always answers,
including for an empty wheel (WHEEL-AC5) and for `null` (centre).

## 3. The state machine

```ts
// drive-wheel.ts
export type WheelState =
  | { readonly status: 'closed' }
  | {
      readonly status: 'open'
      readonly stick: StickSide
      readonly locked: WheelSegmentId | null
    }

export type WheelEvent =
  | { readonly kind: 'stick-motion'; readonly stick: StickSide; readonly vector: StickVector | null }
  | { readonly kind: 'confirm' }

export type WheelOutcome =
  | { readonly kind: 'none' }
  | { readonly kind: 'commit'; readonly segment: WheelSegmentId }

export function driveWheel(
  state: WheelState,
  event: WheelEvent,
  wheels: WheelsByStick
): { readonly state: WheelState; readonly outcome: WheelOutcome }
```

The transition table, with the §3 rule each row implements:

| State | Event | Next state | Outcome | Rule |
| ----- | ----- | ---------- | ------- | ---- |
| closed | motion, vector ≠ null | open, locked = `selectSegment(…)` | none | 1, 6 |
| closed | motion, vector = null | closed | none | — |
| closed | confirm | closed | none | 3 |
| open | motion, same stick, vector ≠ null | open, locked re-selected | none | 2, 3 |
| open | motion, same stick, vector = null | closed | none | 5 |
| open | motion, other stick | open, unchanged | none | 4 (WHEEL-R4) |
| open | confirm, locked ≠ null, available | closed | commit | 4 |
| open | confirm, locked ≠ null, unavailable | open, unchanged | none | WHEEL-R5 |
| open | confirm, locked = null | closed | none | 5 |

`driveWheel` is a pure reducer, so WHEEL-AC7 is provable by driving it with fake
timers that are never advanced: a machine that needs a timer cannot pass.

Note the one asymmetry: committing an `unavailable` segment leaves the wheel
**open**. Closing it would read as "that worked"; staying open with the segment
visibly disabled is the honest answer, and the user can move to another segment
or return to centre.

## 4. Registry

```ts
// wheel-registry.ts
export type WheelSegmentRegistration = {
  readonly segment: WheelSegment
  readonly run: () => void
}

export type WheelRegistry = {
  readonly register: (stick: StickSide, registration: WheelSegmentRegistration) => Unsubscribe
  readonly wheelFor: (stick: StickSide) => Wheel
  readonly runSegment: (id: WheelSegmentId) => void
}
```

`run` is a closure a feature owns, which is why it lives in the application layer
and not the domain. The registry is the only thing that ever calls it, and only
from a `commit` outcome — that single call site is what makes WHEEL-R2 auditable
rather than a promise.

Registration returns an `Unsubscribe` so a segment leaves the ring when the
feature that contributed it unmounts. A feature whose action is contextual
registers once and reports `availability`, rather than adding and removing
itself — the ring's shape has to stay stable for muscle memory (WHEEL-R5).

## 5. Rendering

State is split by how often it changes, because the sticks report at input rate
and React must not:

| What | Where it lives | Changes |
| ---- | -------------- | ------- |
| Needle angle, segment highlight sweep | Reanimated shared value, UI thread | every sample (~60 Hz) |
| Locked segment id | React state | when the stick crosses an arc boundary |
| Open / closed | React state | once per wheel use |

`react-native-reanimated@4.3.4` and `react-native-gesture-handler@2.31.2` are
already dependencies; this feature adds none.

The overlay renders above the focused pane and does not unmount it (WHEEL-R7).

## 6. Failure modes

| Condition | Behaviour |
| --------- | --------- |
| Wheel opens with no segments | opens, locks nothing, `A` cancels (WHEEL-AC5) |
| A segment's `run` throws | the wheel still closes; the error surfaces through the contributing feature, never as a wheel error |
| Controller disconnects while open | the wheel closes as a cancel — zero side effect |
| A feature unmounts while its segment is locked | the segment leaves the ring and the lock clears; `A` then cancels |
| Two features register the same `WheelSegmentId` | a programmer error — it throws at registration, not at commit |

## 7. Testing

| Level | Location | What it proves |
| ----- | -------- | -------------- |
| Geometry | `domain/wheel.test.ts` | angle → segment, dead arcs, empty wheel, wrap across 0° |
| Machine | `application/use-cases/drive-wheel.test.ts` | §3's six rules, one named test each (WHEEL-AC1); the §3 table row by row |
| Side-effect freedom | same | WHEEL-AC2 — a registry of recording segments stays empty across open/lock/cancel |
| Registry | `application/wheel-registry.test.ts` | unsubscribe removes a segment; duplicate id throws; `run` is called only from commit |
| Render | `features/wheel/components/WheelOverlay.test.tsx` | locked segment renders locked; `unavailable` renders disabled |

## 8. Open questions

1. **Segment count.** Four, six or eight per wheel is a feel question that the
   experiment is meant to answer. Geometry is count-agnostic, so this is a
   registry decision, not a schema change.
2. **Re-opening after commit.** If the user commits while still deflecting the
   stick, does the wheel re-open on the next sample, or must the stick return to
   centre first? The table above re-opens; hardware testing may say otherwise,
   and it is one row to change.
3. **Wheel 1 and Wheel 2 assignments.** Deliberately unanswered — PRD §3 leaves
   them TBD and §8 forbids settling them before experimentation.
