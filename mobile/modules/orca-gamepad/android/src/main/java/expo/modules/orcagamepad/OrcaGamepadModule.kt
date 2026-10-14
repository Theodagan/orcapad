package expo.modules.orcagamepad

import android.content.Context
import android.hardware.input.InputManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.Log
import android.view.InputDevice
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.View
import android.view.Window
import android.widget.EditText
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Controller input for Android. It reports device truth in the controller layer's vocabulary and
 * nothing about Orca: dead zones, mappings, chords and focus stay in TypeScript, where they are
 * tested without hardware.
 *
 * It taps `Window.Callback` rather than a view listener because that is the earliest point the
 * app can observe an event, and because the delegate's return value says whether the focused view
 * — a terminal WebView, for instance — consumed it. That answer is published on every sample, so
 * a surface that swallows controller input is visible as data rather than as a silent dead zone.
 */
class OrcaGamepadModule : Module() {
  private var tap: WindowCallbackTap? = null
  private var restoreCallback: Window.Callback? = null
  private var deviceListener: InputManager.InputDeviceListener? = null

  private val buttons = mutableMapOf<String, Float>()
  private val axes = mutableMapOf<String, Float>()
  private var activeDeviceId: Int? = null
  private var consumedByViewTree = false
  /** Attached game controllers and their resolved axes, refreshed when the device set changes. */
  private val axesByDevice = mutableMapOf<Int, DeviceAxes>()

  /** Motion arrives at device sample rate; the bridge is paced, button edges never are. */
  private var minimumIntervalMs: Long = 8
  private var lastEmitAt: Long = 0
  private val mainHandler = Handler(Looper.getMainLooper())
  private var trailingEmitPending = false
  // A throttled sample is sent once the interval is up, so the last motion before a stop is never lost.
  private val trailingEmit = Runnable {
    trailingEmitPending = false
    emit(force = true)
  }

  /**
   * True while an open wheel owns the pad. Controller events are then reported and never forwarded
   * to the view tree, so Android's own focus traversal and a focused WebView cannot react to a pad
   * that is steering a menu (`005` USE-R11). Set from JavaScript, which is where the wheel lives.
   */
  @Volatile private var inputCaptured = false

  override fun definition() = ModuleDefinition {
    Name("OrcaGamepad")
    Events(EVENT_SAMPLE, EVENT_DEVICES)

    Function("listControllers") { describeControllers() }
    Function("currentSample") { sampleBundle(withFocus = true) }

    // Synchronous for JavaScript, but the work runs on the main thread, where every input event
    // is handled, so the held state is only ever touched from one thread.
    Function("start") { intervalMs: Int ->
      // Here rather than posted, so a `setInputCaptured` call right after start is not undone.
      inputCaptured = false
      mainHandler.post {
        minimumIntervalMs = intervalMs.toLong()
        resetState()
        startTap()
        startDeviceListener()
      }
      true
    }

    Function("stop") {
      // Nothing is owning the pad across a restart either.
      inputCaptured = false
      mainHandler.post {
        mainHandler.removeCallbacks(trailingEmit)
        trailingEmitPending = false
        stopTap()
        stopDeviceListener()
        resetState()
      }
      true
    }

    Function("setInputCaptured") { captured: Boolean ->
      inputCaptured = captured
      true
    }

    // Moves Android's input focus to the view with this React tag, so the platform's own focus
    // highlight and scroll-into-view follow the controller's cursor (`005` USE-R6). React Native
    // 0.83 only honours `View.focus()` behind a feature flag that is off, and its accessibility
    // focus call announces without moving anything. Answers false for a view that cannot take
    // focus, which is a normal outcome rather than an error.
    AsyncFunction("requestNativeFocus") { viewTag: Int ->
      appContext.findView<View>(viewTag)?.requestFocus() ?: false
    }.runOnQueue(Queues.MAIN)

    // A sheet is a window of its own with nothing focused in it. Focusing its container would
    // leave the D-pad nowhere to go, since everything it could reach is inside, so this goes to
    // the first control that has no other control inside it. Focus in a sheet is drawn by a ring
    // from here, because nothing else draws it in a window of its own.
    AsyncFunction("requestNativeFocusWithin") { viewTag: Int ->
      val container = appContext.findView<View>(viewTag)
      if (container == null) {
        false
      } else {
        NativeFocusRing.watch(container)
        (NativeFocusRing.firstControlWithin(container) ?: container).requestFocusFromTouch()
      }
    }.runOnQueue(Queues.MAIN)

    // Hides or reveals Android status and navigation/gesture bars. Transient bars appear
    // on edge swipe and retreat automatically.
    AsyncFunction("setImmersive") { enabled: Boolean ->
      val window = appContext.currentActivity?.window ?: return@AsyncFunction false
      val controller = WindowInsetsControllerCompat(window, window.decorView)
      if (enabled) {
        controller.hide(WindowInsetsCompat.Type.systemBars())
        controller.systemBarsBehavior =
          WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
      } else {
        controller.show(WindowInsetsCompat.Type.systemBars())
      }
      true
    }.runOnQueue(Queues.MAIN)

    // A backgrounded app gets no release for a button held as it left.
    OnActivityEntersBackground {
      if (tap != null) {
        releaseHeldInput()
      }
    }

    OnDestroy {
      mainHandler.removeCallbacks(trailingEmit)
      stopTap()
      stopDeviceListener()
    }
  }

  /** Leaves `inputCaptured` alone: it is reset synchronously, and this runs posted after it. */
  private fun resetState() {
    clearHeldInput()
    refreshControllers()
    activeDeviceId = axesByDevice.keys.firstOrNull()
  }

  /** A disconnect must not leave a button held forever, so neutral is the only safe baseline. */
  private fun clearHeldInput() {
    for (button in ALL_BUTTONS) {
      buttons[button] = 0f
    }
    for (axis in ALL_AXES) {
      axes[axis] = 0f
    }
  }

  /** For when releases can no longer reach the tap: capture and the active pad are kept. */
  private fun releaseHeldInput() {
    clearHeldInput()
    emit(force = true)
  }

  private fun refreshControllers(): List<InputDevice> {
    val controllers = connectedControllers()
    axesByDevice.clear()
    for (device in controllers) {
      axesByDevice[device.id] = deviceAxesOf(device)
    }
    return controllers
  }

  private fun axesOf(deviceId: Int): DeviceAxes {
    axesByDevice[deviceId]?.let { return it }
    val device = deviceOf(deviceId)
    val resolved = deviceAxesOf(device)
    // An unknown device is not cached, so it is resolved properly once Android knows it.
    if (device != null) {
      axesByDevice[deviceId] = resolved
    }
    return resolved
  }

  /**
   * The pad that last spoke is the active one. Not filtered by device: some handhelds report
   * their buttons and their sticks as two input devices, and both are the same pad.
   */
  private fun acceptsDevice(deviceId: Int): Boolean {
    activeDeviceId = deviceId
    return true
  }

  private fun connectedControllers(): List<InputDevice> =
    InputDevice.getDeviceIds().toList().mapNotNull { InputDevice.getDevice(it) }
      .filter { isGameController(it) }

  private fun deviceOf(id: Int?): InputDevice? = if (id == null) null else InputDevice.getDevice(id)

  private fun startTap() {
    if (tap != null) {
      return
    }
    val window = appContext.currentActivity?.window ?: return
    val delegate = window.callback ?: return
    val installed = WindowCallbackTap(
      delegate = delegate,
      isCaptured = { inputCaptured },
      // A sheet is a window of its own: releases go there, never through this tap.
      onFocusLost = { releaseHeldInput() },
      focusedTextInput = {
        TextInputWordDelete.visibleField(appContext.currentActivity?.currentFocus)
      },
      onKey = { event, consumed -> onKeyEvent(event, consumed) },
      onMotion = { event, consumed -> onMotionEvent(event, consumed) }
    )
    restoreCallback = delegate
    tap = installed
    window.callback = installed
  }

  private fun stopTap() {
    val window = appContext.currentActivity?.window
    val original = restoreCallback
    // Only restore when nothing else wrapped us since; clobbering a later tap would break it.
    if (window != null && original != null && window.callback === tap) {
      window.callback = original
    }
    tap = null
    restoreCallback = null
  }

  private fun inputManager(): InputManager? =
    appContext.reactContext?.getSystemService(Context.INPUT_SERVICE) as? InputManager

  private fun startDeviceListener() {
    if (deviceListener != null) {
      return
    }
    val manager = inputManager() ?: return
    // Keyboards, mice and sensors come and go too; only a game controller is news here.
    val listener = object : InputManager.InputDeviceListener {
      override fun onInputDeviceAdded(deviceId: Int) {
        if (InputDevice.getDevice(deviceId)?.let { isGameController(it) } == true) {
          onDevicesChanged()
        }
      }

      override fun onInputDeviceRemoved(deviceId: Int) {
        if (!axesByDevice.containsKey(deviceId)) {
          return
        }
        if (deviceId == activeDeviceId) {
          // Buttons held at the moment the pad vanished would otherwise stay held.
          clearHeldInput()
          activeDeviceId = null
          onDevicesChanged(forceEmit = true)
        } else {
          onDevicesChanged()
        }
      }

      override fun onInputDeviceChanged(deviceId: Int) {
        if (axesByDevice.containsKey(deviceId) ||
          InputDevice.getDevice(deviceId)?.let { isGameController(it) } == true
        ) {
          onDevicesChanged()
        }
      }
    }
    deviceListener = listener
    manager.registerInputDeviceListener(listener, Handler(Looper.getMainLooper()))
  }

  private fun stopDeviceListener() {
    val listener = deviceListener ?: return
    inputManager()?.unregisterInputDeviceListener(listener)
    deviceListener = null
  }

  private fun onDevicesChanged(forceEmit: Boolean = false) {
    val wasConnected = activeDeviceId != null
    val controllers = refreshControllers()
    Log.d(TAG, "controllers: " + controllers.joinToString { "${it.name}#${it.id}" }.ifEmpty { "none" })
    // MVP keeps the first controller active; a second pad connecting does not steal the session.
    if (activeDeviceId == null || controllers.none { it.id == activeDeviceId }) {
      activeDeviceId = controllers.firstOrNull()?.id
    }
    sendEvent(EVENT_DEVICES, Bundle().apply {
      putParcelableArrayList("controllers", ArrayList(controllers.map { describe(it) }))
    })
    // A pad that reconnects is reported now, not at its first button press.
    if (forceEmit || wasConnected != (activeDeviceId != null)) {
      emit(force = true)
    }
  }

  private fun onKeyEvent(event: KeyEvent, consumed: Boolean) {
    if (!isControllerEvent(event)) {
      return
    }
    if (event.repeatCount > 0) {
      return
    }
    val pressed = if (event.action == KeyEvent.ACTION_DOWN) 1f else 0f
    val button = BUTTON_BY_KEY_CODE[event.keyCode]
    val digitalTrigger = TRIGGER_AXIS_BY_KEY_CODE[event.keyCode]
    if (button == null && digitalTrigger == null) {
      // A controller key this build has no name for. Logged rather than dropped silently: an
      // unrecognised code is the first thing to look at when a pad behaves oddly.
      Log.d(TAG, "unmapped ${KeyEvent.keyCodeToString(event.keyCode)} (${event.keyCode})")
      return
    }
    if (!acceptsDevice(event.deviceId)) {
      return
    }
    consumedByViewTree = consumed
    if (button != null) {
      buttons[button] = pressed
      Log.d(TAG, "button $button=$pressed consumed=$consumed")
    }
    // Only when the pad declares no trigger axis: otherwise the axis is authoritative and this
    // key event is the same press counted twice.
    if (digitalTrigger != null && axesOf(event.deviceId).idOf(digitalTrigger) == NO_AXIS) {
      axes[digitalTrigger] = pressed
    }
    emit(force = true)
  }

  private fun onMotionEvent(event: MotionEvent, consumed: Boolean) {
    if (!isControllerEvent(event) || !acceptsDevice(event.deviceId)) {
      return
    }
    consumedByViewTree = consumed
    val resolved = axesOf(event.deviceId)
    for (index in ALL_AXES.indices) {
      val id = resolved.ids[index]
      axes[ALL_AXES[index]] = if (id == NO_AXIS) 0f else event.getAxisValue(id)
    }
    var hatChanged = false
    if (resolved.hasHat) {
      val x = event.getAxisValue(MotionEvent.AXIS_HAT_X)
      val y = event.getAxisValue(MotionEvent.AXIS_HAT_Y)
      hatChanged = setHat("dpad-left", hatPressure(x, negative = true)) or
        setHat("dpad-right", hatPressure(x, negative = false)) or
        setHat("dpad-up", hatPressure(y, negative = true)) or
        setHat("dpad-down", hatPressure(y, negative = false))
    }
    // A hat D-pad is a button: its edges are never paced away, a release least of all.
    emit(force = hatChanged)
  }

  /** Whether the pressure changed. */
  private fun setHat(direction: String, value: Float): Boolean {
    if (buttons[direction] == value) {
      return false
    }
    buttons[direction] = value
    return true
  }

  private fun focusedViewName(): String =
    appContext.currentActivity?.window?.currentFocus?.javaClass?.simpleName ?: "none"

  private fun emit(force: Boolean) {
    val now = SystemClock.uptimeMillis()
    val wait = minimumIntervalMs - (now - lastEmitAt)
    if (!force && wait > 0) {
      if (!trailingEmitPending) {
        trailingEmitPending = true
        mainHandler.postDelayed(trailingEmit, wait)
      }
      return
    }
    if (trailingEmitPending) {
      mainHandler.removeCallbacks(trailingEmit)
      trailingEmitPending = false
    }
    lastEmitAt = now
    sendEvent(EVENT_SAMPLE, sampleBundle(withFocus = false))
  }

  /**
   * `withFocus` reads the focused view, which only the interception check asks for: reading it on
   * every motion sample was work nobody used.
   */
  private fun sampleBundle(withFocus: Boolean): Bundle {
    val buttonBundle = Bundle().apply { buttons.forEach { (name, value) -> putFloat(name, value) } }
    val axisBundle = Bundle().apply { axes.forEach { (name, value) -> putFloat(name, value) } }
    return Bundle().apply {
      putBoolean("connected", activeDeviceId != null)
      putBundle("buttons", buttonBundle)
      putBundle("axes", axisBundle)
      putDouble("sampledAt", SystemClock.uptimeMillis().toDouble())
      putBoolean("consumedByViewTree", consumedByViewTree)
      putString("focusedView", if (withFocus) focusedViewName() else UNSAMPLED_FOCUS)
    }
  }

  private fun describeControllers(): List<Bundle> = connectedControllers().map { describe(it) }

  private fun describe(device: InputDevice): Bundle {
    val flats = Bundle().apply {
      for (axis in ALL_AXES) {
        putFloat(axis, flatOf(device, axis))
      }
    }
    return Bundle().apply {
      putInt("id", device.id)
      putString("name", device.name)
      putInt("vendorId", device.vendorId)
      putInt("productId", device.productId)
      putBoolean("hasAnalogTriggers", hasAnalogTriggers(device))
      putBundle("flat", flats)
      // `descriptor` is withheld: it is a stable per-device identifier and nothing needs it.
    }
  }

  private class WindowCallbackTap(
    private val delegate: Window.Callback,
    private val isCaptured: () -> Boolean,
    private val onFocusLost: () -> Unit,
    /** The text field with focus that the user can see, if any: `B` edits it instead of going back. */
    private val focusedTextInput: () -> EditText?,
    private val onKey: (KeyEvent, Boolean) -> Unit,
    private val onMotion: (MotionEvent, Boolean) -> Unit
  ) : Window.Callback by delegate {
    /** Keys the view tree saw go down, so a release that arrives under a wheel is still delivered. */
    private val forwardedKeys = mutableSetOf<Int>()

    override fun onWindowFocusChanged(hasFocus: Boolean) {
      delegate.onWindowFocusChanged(hasFocus)
      if (!hasFocus) {
        onFocusLost()
      }
    }

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
      val fromPad = isControllerEvent(event)
      if (fromPad && isCaptured()) {
        // Reported to JavaScript, not forwarded. A key the view tree already saw go down still
        // gets its release, or it would stay pressed beneath the wheel.
        if (event.action == KeyEvent.ACTION_UP && forwardedKeys.remove(event.keyCode)) {
          delegate.dispatchKeyEvent(event)
        }
        onKey(event, false)
        return true
      }
      if (fromPad && event.keyCode == KeyEvent.KEYCODE_BUTTON_B) {
        val field = focusedTextInput()
        if (field != null) {
          // The press is neither forwarded nor reported: JavaScript would take it for Back and leave
          // the screen. The release is reported, so a `B` that went down elsewhere does not stay held.
          if (event.action == KeyEvent.ACTION_DOWN) {
            TextInputWordDelete.deleteWordBefore(field)
          } else if (event.action == KeyEvent.ACTION_UP) {
            onKey(event, true)
          }
          return true
        }
      }
      val consumed = delegate.dispatchKeyEvent(event)
      if (fromPad) {
        if (event.action == KeyEvent.ACTION_DOWN) {
          forwardedKeys.add(event.keyCode)
        } else if (event.action == KeyEvent.ACTION_UP) {
          forwardedKeys.remove(event.keyCode)
        }
      }
      onKey(event, consumed)
      // Reporting what the view tree did is the tap's job; suppressing Android's fallback is the
      // one place it has to act. An unconsumed `BUTTON_B` comes back as `KEYCODE_BACK`, so a
      // bound `B` would navigate twice. `001` §7 makes an unhandled intent a no-op, which is the
      // behaviour this preserves — not the system's guess at what the button meant.
      return consumed || (fromPad && event.keyCode in FALLBACK_KEY_CODES)
    }

    override fun dispatchGenericMotionEvent(event: MotionEvent): Boolean {
      if (isControllerEvent(event)) {
        // The sample owns gamepad axes; WebViews must never translate a stick into arrow keys.
        onMotion(event, false)
        return true
      }
      val consumed = delegate.dispatchGenericMotionEvent(event)
      onMotion(event, consumed)
      return consumed
    }
  }

  private companion object {
    const val TAG = "OrcaGamepad"
    const val EVENT_SAMPLE = "onControllerSample"
    const val EVENT_DEVICES = "onControllerDevices"
    /** Pushed samples skip the focus lookup; `currentSample` reads it on demand. */
    const val UNSAMPLED_FOCUS = "unsampled"
  }
}
