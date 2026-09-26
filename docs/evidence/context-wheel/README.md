# Context Wheel device trials (WHEEL-T8)

One `*.json` file per trial, matching `WheelTrialRecord` in
[`mobile/src/gamepad/wheel/wheel-trial-records.ts`](../../../mobile/src/gamepad/wheel/wheel-trial-records.ts).
`wheel-trial-records.test.ts` validates every file here, and refuses a
`candidate` disposition from a trial that saw a wrong commit or a failed cancel.

No trials are filed yet: the measurements need a controller-capable device and a
person to run the presets. The schema and validator are live, and the coverage
check (a smoke preset and a real-action preset) turns on with the first record.
