import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const native = readFileSync(
  new URL(
    '../../../modules/orca-gamepad/android/src/main/java/expo/modules/orcagamepad/OrcaGamepadModule.kt',
    import.meta.url
  ),
  'utf8'
)

describe('Android gamepad motion ownership', () => {
  it('samples controller motion without forwarding it to the focused terminal', () => {
    const motion = native.slice(
      native.indexOf('override fun dispatchGenericMotionEvent'),
      native.indexOf('\n  }', native.indexOf('override fun dispatchGenericMotionEvent'))
    )
    expect(motion).toContain('if (isControllerEvent(event))')
    expect(motion).toContain('onMotion(event, false)')
    expect(motion.indexOf('onMotion(event, false)')).toBeLessThan(
      motion.indexOf('delegate.dispatchGenericMotionEvent(event)')
    )
    expect(motion).toContain('delegate.dispatchGenericMotionEvent(event)')
  })
})
