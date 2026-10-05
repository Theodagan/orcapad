import { useEffect, useState, type ReactNode } from 'react'
import { ControllerScreenGate } from '../gamepad/focus/screen-focus-gate'

type FocusableNavigation = {
  readonly isFocused: () => boolean
  readonly addListener: (event: 'focus' | 'blur', listener: () => void) => () => void
}

/**
 * Tells the controller layer whether the screen it wraps is the one being looked at. A navigator
 * keeps the screens beneath the top one mounted, and with fall-through dispatch an intent nothing
 * on top accepts would otherwise reach their bindings: `A` on a session could open whatever the
 * workspace list underneath had highlighted.
 *
 * It takes the navigation object as a prop rather than reading it from context, because a
 * navigator's `screenLayout` renders outside the screen's own context and only hands it over here.
 */
export function NavigatorScreenGate({
  navigation,
  children
}: {
  readonly navigation: FocusableNavigation
  readonly children?: ReactNode
}): ReactNode {
  const [focused, setFocused] = useState(() => navigation.isFocused())

  useEffect(() => {
    setFocused(navigation.isFocused())
    const offFocus = navigation.addListener('focus', () => setFocused(true))
    const offBlur = navigation.addListener('blur', () => setFocused(false))
    return () => {
      offFocus()
      offBlur()
    }
  }, [navigation])

  return <ControllerScreenGate active={focused}>{children}</ControllerScreenGate>
}
