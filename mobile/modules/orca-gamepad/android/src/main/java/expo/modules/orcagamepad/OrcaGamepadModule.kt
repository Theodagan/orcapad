package expo.modules.orcagamepad

import android.content.Context
import android.hardware.input.InputManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.InputDevice
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.Window
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
  private var focusedView = "none"

  /** Motion arrives at device sample rate; the bridge is paced, button edges never are. */
  private var minimumIntervalMs: Long = 8
  private var lastEmitAt: Long = 0

  override fun definition() = ModuleDefinition {
    Name("OrcaGamepad")
    Events(EVENT_SAMPLE, EVENT_DEVICES)

    Function("listControllers") { describeControllers() }
    Function("currentSample") { sampleBundle() }

    Function("start") { intervalMs: Int ->
      minimumIntervalMs = intervalMs.toLong()
      resetState()
      startTap()
      startDeviceListener()
      true
    }

    Function("stop") {
      stopTap()
      stopDeviceListener()
      resetState()
      true
    }

    OnDestroy {
      stopTap()
      stopDeviceListener()
    }
  }

  private fun resetState() {
    // A disconnect must not leave a button held forever, so neutral is the only safe baseline.
    for (button in ALL_BUTTONS) {
      buttons[button] = 0f
    }
    for (axis in ALL_AXES) {
      axes[axis] = 0f
    }
    activeDeviceId = connectedControllers().firstOrNull()?.id
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
    val listener = object : InputManager.InputDeviceListener {
      override fun onInputDeviceAdded(deviceId: Int) = onDevicesChanged()
      override fun onInputDeviceRemoved(deviceId: Int) {
        if (deviceId == activeDeviceId) {
          // Buttons held at the moment the pad vanished would otherwise stay held.
          resetState()
          emit(force = true)
        }
        onDevicesChanged()
      }

      override fun onInputDeviceChanged(deviceId: Int) = onDevicesChanged()
    }
    deviceListener = listener
    manager.registerInputDeviceListener(listener, Handler(Looper.getMainLooper()))
  }

  private fun stopDeviceListener() {
    val listener = deviceListener ?: return
    inputManager()?.unregisterInputDeviceListener(listener)
    deviceListener = null
  }

  private fun onDevicesChanged() {
    val controllers = connectedControllers()
    Log.d(TAG, "controllers: " + controllers.joinToString { "${it.name}#${it.id}" }.ifEmpty { "none" })
    // MVP keeps the first controller active; a second pad connecting does not steal the session.
    if (activeDeviceId == null || controllers.none { it.id == activeDeviceId }) {
      activeDeviceId = controllers.firstOrNull()?.id
    }
    sendEvent(EVENT_DEVICES, Bundle().apply {
      putParcelableArrayList("controllers", ArrayList(controllers.map { describe(it) }))
    })
  }

  private fun onKeyEvent(event: KeyEvent, consumed: Boolean) {
    if (!isControllerSource(event.source)) {
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
    activeDeviceId = event.deviceId
    consumedByViewTree = consumed
    focusedView = focusedViewName()
    if (button != null) {
      buttons[button] = pressed
      Log.d(TAG, "button $button=$pressed consumed=$consumed focus=$focusedView")
    }
    // Only when the pad declares no trigger axis: otherwise the axis is authoritative and this
    // key event is the same press counted twice.
    if (digitalTrigger != null && resolveAxis(deviceOf(event.deviceId), digitalTrigger) == null) {
      axes[digitalTrigger] = pressed
    }
    emit(force = true)
  }

  private fun onMotionEvent(event: MotionEvent, consumed: Boolean) {
    if (!isControllerSource(event.source)) {
      return
    }
    activeDeviceId = event.deviceId
    consumedByViewTree = consumed
    focusedView = focusedViewName()
    val device = deviceOf(event.deviceId)
    for (axis in ALL_AXES) {
      axes[axis] = axisValue(event, device, axis)
    }
    hatDirections(event, device)?.forEach { (direction, value) -> buttons[direction] = value }
    emit(force = false)
  }

  private fun focusedViewName(): String =
    appContext.currentActivity?.window?.currentFocus?.javaClass?.simpleName ?: "none"

  private fun emit(force: Boolean) {
    val now = System.currentTimeMillis()
    if (!force && now - lastEmitAt < minimumIntervalMs) {
      return
    }
    lastEmitAt = now
    sendEvent(EVENT_SAMPLE, sampleBundle())
  }

  private fun sampleBundle(): Bundle {
    val buttonBundle = Bundle().apply { buttons.forEach { (name, value) -> putFloat(name, value) } }
    val axisBundle = Bundle().apply { axes.forEach { (name, value) -> putFloat(name, value) } }
    return Bundle().apply {
      putBoolean("connected", activeDeviceId != null)
      putBundle("buttons", buttonBundle)
      putBundle("axes", axisBundle)
      putDouble("sampledAt", System.currentTimeMillis().toDouble())
      putBoolean("consumedByViewTree", consumedByViewTree)
      putString("focusedView", focusedView)
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
    private val onKey: (KeyEvent, Boolean) -> Unit,
    private val onMotion: (MotionEvent, Boolean) -> Unit
  ) : Window.Callback by delegate {
    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
      val consumed = delegate.dispatchKeyEvent(event)
      onKey(event, consumed)
      // Reporting what the view tree did is the tap's job; suppressing Android's fallback is the
      // one place it has to act. An unconsumed `BUTTON_B` comes back as `KEYCODE_BACK`, so a
      // bound `B` would navigate twice. `001` §7 makes an unhandled intent a no-op, which is the
      // behaviour this preserves — not the system's guess at what the button meant.
      return consumed || (isControllerSource(event.source) && event.keyCode in FALLBACK_KEY_CODES)
    }

    override fun dispatchGenericMotionEvent(event: MotionEvent): Boolean {
      val consumed = delegate.dispatchGenericMotionEvent(event)
      onMotion(event, consumed)
      return consumed
    }
  }

  private companion object {
    const val TAG = "OrcaGamepad"
    const val EVENT_SAMPLE = "onControllerSample"
    const val EVENT_DEVICES = "onControllerDevices"
  }
}
