# Surface binding device validation (BIND-T10)

One `*.json` file per device run, matching `ControllerBindingEvidence` in
[`mobile/src/gamepad/bindings/controller-binding-evidence.ts`](../../../mobile/src/gamepad/bindings/controller-binding-evidence.ts).

Every one of the eight bound surfaces must appear, each with what the controller
did *and* what touch still does — BIND-AC10 is half the claim, and a record that
only proves the controller works proves half of it. A failure is evidence too,
provided it is described.

`terminalWebViewConsumedInput` is the CTRL-T4 checkpoint: whether a focused
terminal WebView takes controller input before the app sees it. BIND-T6 made
either answer safe, but the record still has to say which one is true.
