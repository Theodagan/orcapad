package expo.modules.orcagamepad

import android.view.KeyEvent
import android.view.View
import android.widget.EditText

/**
 * `B` deletes the word before the caret in a text field the user can see (`005` round 3). Without it
 * `B` in a field is the system's Back, which leaves the screen with the keyboard still up, and the
 * pad has no other way to take a word back.
 *
 * It edits the field's own text, so React Native's change events fire as if it had been typed, and
 * the word is what Ctrl+W takes in a terminal: the spaces before the caret, then the run before
 * them. A selection is deleted whole. A field the user cannot see is not theirs to edit: the live
 * terminal input is a transparent pixel that mirrors keys to a PTY, and `B` there is JavaScript's.
 */
object TextInputWordDelete {
  private const val HIDDEN_ALPHA = 0.05f
  private const val HIDDEN_SIZE_PX = 4

  /** The field with focus, when it is one the user can see and edit. */
  fun visibleField(focused: View?): EditText? {
    val field = focused as? EditText ?: return null
    val seen = field.alpha > HIDDEN_ALPHA && field.width > HIDDEN_SIZE_PX && field.isEnabled
    return if (seen) field else null
  }

  fun deleteWordBefore(field: EditText) {
    val text = field.text ?: return
    val start = field.selectionStart
    val end = field.selectionEnd
    if (start < 0 || end < 0) {
      return
    }
    if (start != end) {
      text.delete(minOf(start, end), maxOf(start, end))
      return
    }
    var from = end
    while (from > 0 && text[from - 1].isWhitespace()) {
      from -= 1
    }
    while (from > 0 && !text[from - 1].isWhitespace()) {
      from -= 1
    }
    if (from < end) {
      text.delete(from, end)
    }
  }

  /**
   * For a window the controller tap is not attached to (a sheet is a Dialog of its own): the field
   * takes `B` itself, and consuming it there stops the system turning it into a Back that closes
   * the sheet.
   */
  val keyListener = View.OnKeyListener { view, keyCode, event ->
    if (keyCode != KeyEvent.KEYCODE_BUTTON_B || !isControllerSource(event.source)) {
      return@OnKeyListener false
    }
    val field = visibleField(view) ?: return@OnKeyListener false
    if (event.action == KeyEvent.ACTION_DOWN) {
      deleteWordBefore(field)
    }
    true
  }
}
