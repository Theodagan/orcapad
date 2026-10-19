package expo.modules.orcagamepad

import android.app.Activity
import android.os.SystemClock
import android.view.KeyEvent
import android.view.View
import android.widget.EditText

/**
 * D-pad and `A` for screens no JavaScript surface answers for: Android's own focus is moved and
 * pressed instead. A pad whose D-pad is a hat never produces the arrow keys Android navigates by
 * (the tap swallows its motion), so on such a screen nothing would move at all.
 *
 * A key the view tree already handled is not acted on again: a pad that sends real D-pad keys has
 * had Android move focus for it by the time JavaScript asks.
 */
object PadFocusFallback {
  /** How recently a consumed key still counts as the press JavaScript is asking about. */
  private const val SAME_PRESS_MS = 250L

  private val consumedAt = mutableMapOf<Int, Long>()

  fun recordKey(event: KeyEvent, consumed: Boolean) {
    if (event.action == KeyEvent.ACTION_DOWN && consumed) {
      consumedAt[event.keyCode] = SystemClock.uptimeMillis()
    }
  }

  private fun handledAlready(vararg keyCodes: Int): Boolean {
    val now = SystemClock.uptimeMillis()
    return keyCodes.any { code -> consumedAt[code]?.let { now - it < SAME_PRESS_MS } == true }
  }

  fun move(activity: Activity, direction: String): Boolean {
    val (focusDirection, keyCode) = when (direction) {
      "up" -> View.FOCUS_UP to KeyEvent.KEYCODE_DPAD_UP
      "down" -> View.FOCUS_DOWN to KeyEvent.KEYCODE_DPAD_DOWN
      "left" -> View.FOCUS_LEFT to KeyEvent.KEYCODE_DPAD_LEFT
      "right" -> View.FOCUS_RIGHT to KeyEvent.KEYCODE_DPAD_RIGHT
      else -> return false
    }
    if (handledAlready(keyCode)) {
      return false
    }
    val root = activity.window?.decorView ?: return false
    // A sheet is a window of its own above this one, and moves its own focus.
    if (!root.hasWindowFocus()) {
      return false
    }
    val focused = root.findFocus()
    // From touch mode the first press only shows where focus is, as a keyboard's first arrow does.
    if (focused == null || root.isInTouchMode) {
      val content = activity.findViewById<View>(android.R.id.content) ?: return false
      val start = focused ?: NativeFocusRing.firstControlWithin(content) ?: return false
      return start.requestFocusFromTouch().also { if (it) NativeFocusRing.ringPadFocus(start) }
    }
    val next = focused.focusSearch(focusDirection) ?: return false
    return next.requestFocus(focusDirection).also { if (it) NativeFocusRing.ringPadFocus(next) }
  }

  /** Presses the focused control the way a keyboard's centre key would. */
  fun activate(activity: Activity): Boolean {
    if (handledAlready(KeyEvent.KEYCODE_BUTTON_A, KeyEvent.KEYCODE_DPAD_CENTER)) {
      return false
    }
    val root = activity.window?.decorView ?: return false
    val focused = if (root.hasWindowFocus()) root.findFocus() else null
    if (focused == null || focused is EditText) {
      return false
    }
    val now = SystemClock.uptimeMillis()
    val down = KeyEvent(now, now, KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_DPAD_CENTER, 0)
    focused.dispatchKeyEvent(down)
    return focused.dispatchKeyEvent(KeyEvent.changeAction(down, KeyEvent.ACTION_UP))
  }
}
