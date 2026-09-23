package expo.modules.orcagamepadprobe

import android.content.Context
import android.hardware.input.InputManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.InputDevice
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.Window
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * CTRL-T1's temporary spike. It answers four questions the official Android documentation
 * cannot answer for the Retroid Pocket Flip: which source and axis codes it actually reports,
 * whether its triggers are analog ranges or digital buttons, what a disconnect looks like, and
 * whether the focused terminal WebView swallows controller events before a decor-level
 * listener sees them.
 *
 * It taps `Window.Callback` rather than a view listener because that is the earliest point the
 * app can observe an event, and because the delegate's return value is exactly the "did the
 * focused view consume it" answer the WebView question needs. Delete this module once CTRL-T4
 * lands the real one; nothing may depend on it.
 */
class OrcaGamepadProbeModule : Module() {
  private var tap: WindowCallbackTap? = null
  private var restoreCallback: Window.Callback? = null
  private var deviceListener: InputManager.InputDeviceListener? = null

  /** Motion arrives at device sample rate; the bridge does not need every frame of it. */
  private var motionIntervalMs: Long = 16
  private var lastMotionAt: Long = 0

  override fun definition() = ModuleDefinition {
    Name("OrcaGamepadProbe")
    Events(EVENT_INPUT, EVENT_DEVICE_CHANGE)

    Function("listDevices") { describeDevices() }

    Function("start") { intervalMs: Int ->
      motionIntervalMs = intervalMs.toLong()
      startTap()
      startDeviceListener()
      true
    }

    Function("stop") {
      stopTap()
      stopDeviceListener()
      true
    }

    OnDestroy {
      stopTap()
      stopDeviceListener()
    }
  }

  private fun startTap() {
    if (tap != null) {
      return
    }
    val window = appContext.currentActivity?.window ?: return
    val delegate = window.callback ?: return
    val installed = WindowCallbackTap(
      delegate = delegate,
      onKey = { event, consumed -> emitKey(event, consumed) },
      onMotion = { event, consumed -> emitMotion(event, consumed) }
    )
    restoreCallback = delegate
    tap = installed
    window.callback = installed
  }

  private fun stopTap() {
    val window = appContext.currentActivity?.window
    val original = restoreCallback
    // Only restore if nothing else wrapped us in the meantime; clobbering a later tap would
    // break whatever installed it.
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
      override fun onInputDeviceAdded(deviceId: Int) = emitDeviceChange("added", deviceId)
      override fun onInputDeviceRemoved(deviceId: Int) = emitDeviceChange("removed", deviceId)
      override fun onInputDeviceChanged(deviceId: Int) = emitDeviceChange("changed", deviceId)
    }
    deviceListener = listener
    manager.registerInputDeviceListener(listener, Handler(Looper.getMainLooper()))
  }

  private fun stopDeviceListener() {
    val listener = deviceListener ?: return
    inputManager()?.unregisterInputDeviceListener(listener)
    deviceListener = null
  }

  private fun focusedViewName(): String =
    appContext.currentActivity?.window?.currentFocus?.javaClass?.simpleName ?: "none"

  private fun emitKey(event: KeyEvent, consumed: Boolean) {
    sendEvent(
      EVENT_INPUT,
      Bundle().apply {
        putString("kind", "key")
        putString("action", keyActionName(event.action))
        putInt("keyCode", event.keyCode)
        putString("keyCodeName", KeyEvent.keyCodeToString(event.keyCode))
        putInt("scanCode", event.scanCode)
        putInt("repeatCount", event.repeatCount)
        putInt("deviceId", event.deviceId)
        putInt("source", event.source)
        putStringArrayList("sourceNames", ArrayList(sourceNames(event.source)))
        putLong("eventTime", event.eventTime)
        putBoolean("consumedByViewTree", consumed)
        putString("focusedView", focusedViewName())
      }
    )
  }

  private fun emitMotion(event: MotionEvent, consumed: Boolean) {
    val now = event.eventTime
    if (now - lastMotionAt < motionIntervalMs) {
      return
    }
    lastMotionAt = now
    val axes = Bundle()
    // Read through the device's declared ranges rather than a fixed axis list: an axis this
    // pad reports under an unexpected code is precisely what the spike is looking for.
    InputDevice.getDevice(event.deviceId)?.motionRanges?.forEach { range ->
      axes.putFloat(MotionEvent.axisToString(range.axis), event.getAxisValue(range.axis))
    }
    sendEvent(
      EVENT_INPUT,
      Bundle().apply {
        putString("kind", "motion")
        putString("action", MotionEvent.actionToString(event.action))
        putInt("deviceId", event.deviceId)
        putInt("source", event.source)
        putStringArrayList("sourceNames", ArrayList(sourceNames(event.source)))
        putBundle("axes", axes)
        putLong("eventTime", event.eventTime)
        putBoolean("consumedByViewTree", consumed)
        putString("focusedView", focusedViewName())
      }
    )
  }

  private fun emitDeviceChange(change: String, deviceId: Int) {
    sendEvent(
      EVENT_DEVICE_CHANGE,
      Bundle().apply {
        putString("change", change)
        putInt("deviceId", deviceId)
        putParcelableArrayList("devices", ArrayList(describeDevices()))
      }
    )
  }

  private fun describeDevices(): List<Bundle> =
    InputDevice.getDeviceIds().toList().mapNotNull { InputDevice.getDevice(it) }.map { describe(it) }

  private fun describe(device: InputDevice): Bundle {
    val ranges = ArrayList<Bundle>()
    device.motionRanges.forEach { range ->
      ranges.add(
        Bundle().apply {
          putInt("axis", range.axis)
          putString("axisName", MotionEvent.axisToString(range.axis))
          putInt("source", range.source)
          putFloat("min", range.min)
          putFloat("max", range.max)
          putFloat("flat", range.flat)
          putFloat("fuzz", range.fuzz)
          putFloat("resolution", range.resolution)
        }
      )
    }
    return Bundle().apply {
      putInt("id", device.id)
      putString("name", device.name)
      putInt("vendorId", device.vendorId)
      putInt("productId", device.productId)
      putInt("sources", device.sources)
      putStringArrayList("sourceNames", ArrayList(sourceNames(device.sources)))
      putBoolean("isVirtual", device.isVirtual)
      putInt("controllerNumber", device.controllerNumber)
      putBoolean("isGameController", isGameController(device.sources))
      // Derived here so the recorded evidence states the trigger form rather than implying it.
      putString("triggerForm", triggerForm(device))
      putParcelableArrayList("motionRanges", ranges)
      // `descriptor` is deliberately absent: it is a stable per-device identifier and the
      // record is committed to git.
    }
  }

  /**
   * Analog only when the pad declares a trigger axis. A pad that reports L2/R2 as buttons has
   * no range to declare, which is the distinction CTRL-R5 turns into a scroll-velocity decision.
   */
  private fun triggerForm(device: InputDevice): String {
    val analogAxes = listOf(
      MotionEvent.AXIS_LTRIGGER,
      MotionEvent.AXIS_RTRIGGER,
      MotionEvent.AXIS_BRAKE,
      MotionEvent.AXIS_GAS
    )
    val declared = device.motionRanges.map { it.axis }.toSet()
    return if (analogAxes.any { declared.contains(it) }) "analog" else "digital-or-absent"
  }

  private fun isGameController(sources: Int): Boolean =
    sources and InputDevice.SOURCE_GAMEPAD == InputDevice.SOURCE_GAMEPAD ||
      sources and InputDevice.SOURCE_JOYSTICK == InputDevice.SOURCE_JOYSTICK

  private fun sourceNames(sources: Int): List<String> {
    val names = mutableListOf<String>()
    KNOWN_SOURCES.forEach { (mask, name) ->
      if (sources and mask == mask) {
        names.add(name)
      }
    }
    return names
  }

  private fun keyActionName(action: Int): String = when (action) {
    KeyEvent.ACTION_DOWN -> "down"
    KeyEvent.ACTION_UP -> "up"
    else -> "action-$action"
  }

  private class WindowCallbackTap(
    private val delegate: Window.Callback,
    private val onKey: (KeyEvent, Boolean) -> Unit,
    private val onMotion: (MotionEvent, Boolean) -> Unit
  ) : Window.Callback by delegate {
    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
      val consumed = delegate.dispatchKeyEvent(event)
      onKey(event, consumed)
      return consumed
    }

    override fun dispatchGenericMotionEvent(event: MotionEvent): Boolean {
      val consumed = delegate.dispatchGenericMotionEvent(event)
      onMotion(event, consumed)
      return consumed
    }
  }

  private companion object {
    const val EVENT_INPUT = "onInputEvent"
    const val EVENT_DEVICE_CHANGE = "onDeviceChange"

    val KNOWN_SOURCES = listOf(
      InputDevice.SOURCE_GAMEPAD to "gamepad",
      InputDevice.SOURCE_JOYSTICK to "joystick",
      InputDevice.SOURCE_DPAD to "dpad",
      InputDevice.SOURCE_KEYBOARD to "keyboard",
      InputDevice.SOURCE_TOUCHSCREEN to "touchscreen",
      InputDevice.SOURCE_MOUSE to "mouse"
    )
  }
}
