# Context Wheel product-default decisions (WHEEL-T9)

One `*.json` file per promotion, matching `ProductDefaultDecision` in
[`mobile/src/gamepad/wheel/wheel-product-default-gate.ts`](../../../mobile/src/gamepad/wheel/wheel-product-default-gate.ts).

`002` does not perform any promotion, so this directory is empty by design. The
gate in `wheel-product-default-gate.test.ts` is live regardless: the moment a
preset stops carrying `contractual: false`, it fails unless a decision here names
that preset, the `candidate` trial behind it, and the person who accepted it.

`candidate` is the best a trial can say on its own. A machine reading good
numbers is not the same as a person deciding to ship them.
