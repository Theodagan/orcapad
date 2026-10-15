# X moves among visual zones with an arrow

The previous controller contract gave a bare X press the next zone in a cyclic list (`002`). Feedback replaces this with a **held X modifier**: X plus a D-pad direction moves to a visible neighboring zone in that direction; a bare X press/release does nothing. There is no wrap and no arrow-key or list-movement intent from the same chord. The terminal still receives unmodified D-pad arrows.

Evidence: a cyclic zone order makes header/panel/agent navigation unpredictable on screen and sends unintended input when an arrow is held over a terminal. Zone movement now precedes focused-surface dispatch. Only mounted zones can receive focus; action hints label the gesture `X+D-pad`. This supersedes the X behavior in `002` without changing its wheel Stop decision.
