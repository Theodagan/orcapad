# Vim concepts for controller bindings

Decision: **borrow context-sensitive mappings, not a Vim mode**.

The controller already uses declarative button/chord/tap rows in `mobile/src/gamepad/controller-input/controller-bindings.ts`, while `zone-item-store.ts` interprets the same directional intents for the focused surface. Terminal arrows remain terminal input when the agent zone owns the D-pad; X+direction changes zones before any ordinary arrow is dispatched. This provides the useful part of modal editing—context decides what a motion means—without requiring a global normal/insert mode or additional mode indicator.

The chat `/vim` command toggles an agent CLI setting, not Orca's controller bindings. Do not couple the two: a controller's zone and microphone state must stay legible even when the hosted agent changes its own keymap. Revisit a serializable/customizable binding schema only if actual user remapping requirements appear; maintain one source for mapping and derived action hints until then.
