package expo.modules.orcagamepad

import android.graphics.drawable.Drawable
import android.graphics.drawable.GradientDrawable
import android.view.View
import android.view.ViewTreeObserver
import java.util.WeakHashMap

/**
 * A visible focus ring for views in a window the controller layer does not draw for.
 *
 * The app window's cursor is drawn by JavaScript. A React Native `Modal` is a separate Dialog
 * window, where nothing is drawn and Android's own highlight is a faint wash, so a pad moving
 * through a sheet would not be able to see where it is. The ring is the same accent as the
 * JavaScript one: a stroke around the focused view and a light tint inside it.
 *
 * It is a foreground drawable, put on the view that takes focus and handed back when focus leaves,
 * so whatever the view already drew over itself (a ripple) comes back untouched.
 */
object NativeFocusRing {
  private const val ACCENT = 0xFF3B82F6.toInt()
  private const val TINT = 0x2E3B82F6
  private const val STROKE_DP = 3
  private const val RADIUS_DP = 8

  private val watched = WeakHashMap<View, ViewTreeObserver.OnGlobalFocusChangeListener>()
  private val displaced = WeakHashMap<View, Drawable?>()

  /** Starts ringing focus changes in the window this view is in. Safe to call for every request. */
  fun watch(view: View) {
    val root = view.rootView ?: return
    if (watched.containsKey(root)) {
      return
    }
    val listener = ViewTreeObserver.OnGlobalFocusChangeListener { lost, gained ->
      lost?.let { release(it) }
      gained?.let { ring(it) }
    }
    root.viewTreeObserver.addOnGlobalFocusChangeListener(listener)
    watched[root] = listener
  }

  private fun ring(view: View) {
    if (!displaced.containsKey(view)) {
      displaced[view] = view.foreground
    }
    val density = view.resources.displayMetrics.density
    view.foreground = GradientDrawable().apply {
      setColor(TINT)
      setStroke((STROKE_DP * density).toInt(), ACCENT)
      cornerRadius = RADIUS_DP * density
    }
  }

  private fun release(view: View) {
    if (displaced.containsKey(view)) {
      view.foreground = displaced.remove(view)
    }
  }
}
