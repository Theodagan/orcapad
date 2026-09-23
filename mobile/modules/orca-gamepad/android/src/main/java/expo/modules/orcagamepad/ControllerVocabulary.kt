package expo.modules.orcagamepad

import android.view.InputDevice
import android.view.KeyEvent
import android.view.MotionEvent

/**
 * The translation from Android's input contract to the controller layer's vocabulary.
 *
 * Deliberately not a per-device table. Android's own guidance is to key off `KEYCODE_*` and
 * `AXIS_*` rather than a device name or vendor id, because those stay constant across physical
 * layouts — which is what makes any conforming pad work, not just the one on the desk.
 *
 * What does vary is documented and small, and all of it is handled here: a trigger may arrive as
 * `AXIS_LTRIGGER`, as the racing-wheel alias `AXIS_BRAKE`, or as nothing but a digital
 * `KEYCODE_BUTTON_L2`; a D-pad may arrive as a hat axis or as key codes; and a right stick may
 * sit on `AXIS_Z`/`AXIS_RZ` or on `AXIS_RX`/`AXIS_RY`.
 */

/** Button names the controller layer knows. Anything unmapped is dropped, never guessed at. */
val BUTTON_BY_KEY_CODE: Map<Int, String> = mapOf(
  KeyEvent.KEYCODE_BUTTON_A to "a",
  KeyEvent.KEYCODE_BUTTON_B to "b",
  KeyEvent.KEYCODE_BUTTON_X to "x",
  KeyEvent.KEYCODE_BUTTON_Y to "y",
  KeyEvent.KEYCODE_BUTTON_L1 to "lb",
  KeyEvent.KEYCODE_BUTTON_R1 to "rb",
  KeyEvent.KEYCODE_BUTTON_THUMBL to "l3",
  KeyEvent.KEYCODE_BUTTON_THUMBR to "r3",
  KeyEvent.KEYCODE_DPAD_UP to "dpad-up",
  KeyEvent.KEYCODE_DPAD_DOWN to "dpad-down",
  KeyEvent.KEYCODE_DPAD_LEFT to "dpad-left",
  KeyEvent.KEYCODE_DPAD_RIGHT to "dpad-right"
)

/** A pad with no trigger axis reports L2/R2 here instead; the axis is then digital. */
val TRIGGER_AXIS_BY_KEY_CODE: Map<Int, String> = mapOf(
  KeyEvent.KEYCODE_BUTTON_L2 to "l2",
  KeyEvent.KEYCODE_BUTTON_R2 to "r2"
)

val ALL_BUTTONS: List<String> = listOf(
  "a", "b", "x", "y", "lb", "rb", "l3", "r3",
  "dpad-up", "dpad-down", "dpad-left", "dpad-right"
)

val ALL_AXES: List<String> = listOf("left-x", "left-y", "right-x", "right-y", "l2", "r2")

/** Candidate Android axes per controller axis, in preference order. */
private val AXIS_CANDIDATES: Map<String, List<Int>> = mapOf(
  "left-x" to listOf(MotionEvent.AXIS_X),
  "left-y" to listOf(MotionEvent.AXIS_Y),
  "right-x" to listOf(MotionEvent.AXIS_Z, MotionEvent.AXIS_RX),
  "right-y" to listOf(MotionEvent.AXIS_RZ, MotionEvent.AXIS_RY),
  "l2" to listOf(MotionEvent.AXIS_LTRIGGER, MotionEvent.AXIS_BRAKE),
  "r2" to listOf(MotionEvent.AXIS_RTRIGGER, MotionEvent.AXIS_GAS)
)

fun isGameController(device: InputDevice): Boolean =
  device.supportsSource(InputDevice.SOURCE_GAMEPAD) ||
    device.supportsSource(InputDevice.SOURCE_JOYSTICK)

/**
 * The first candidate axis the device actually declares. Reading an undeclared axis returns 0,
 * which is indistinguishable from a centred stick — so the declaration, not the value, decides.
 */
fun resolveAxis(device: InputDevice?, name: String): Int? {
  val candidates = AXIS_CANDIDATES[name] ?: return null
  if (device == null) {
    return candidates.first()
  }
  return candidates.firstOrNull { axis -> device.getMotionRange(axis) != null }
}

/** True when the pad declares a real trigger axis; otherwise L2/R2 can only ever be 0 or 1. */
fun hasAnalogTriggers(device: InputDevice): Boolean =
  resolveAxis(device, "l2") != null || resolveAxis(device, "r2") != null

/** The device's own declared flat zone, which is the only dead zone it can vouch for. */
fun flatOf(device: InputDevice?, name: String): Float {
  val axis = resolveAxis(device, name) ?: return 0f
  return device?.getMotionRange(axis)?.flat ?: 0f
}

fun axisValue(event: MotionEvent, device: InputDevice?, name: String): Float {
  val axis = resolveAxis(device, name) ?: return 0f
  return event.getAxisValue(axis)
}

/**
 * A hat-reported D-pad, as button pressures. Returns null when the pad has no hat, in which case
 * it is sending `KEYCODE_DPAD_*` instead and the key path already covers it.
 */
fun hatDirections(event: MotionEvent, device: InputDevice?): Map<String, Float>? {
  if (device != null && device.getMotionRange(MotionEvent.AXIS_HAT_X) == null &&
    device.getMotionRange(MotionEvent.AXIS_HAT_Y) == null
  ) {
    return null
  }
  val x = event.getAxisValue(MotionEvent.AXIS_HAT_X)
  val y = event.getAxisValue(MotionEvent.AXIS_HAT_Y)
  return mapOf(
    "dpad-left" to if (x < -0.5f) 1f else 0f,
    "dpad-right" to if (x > 0.5f) 1f else 0f,
    "dpad-up" to if (y < -0.5f) 1f else 0f,
    "dpad-down" to if (y > 0.5f) 1f else 0f
  )
}
