import type { ReactNode } from 'react'
import { Pressable, type PressableProps } from 'react-native'
import { ControllerFocusRing } from '../gamepad/focus/ControllerFocusRing'
import { ZoneItem } from '../gamepad/zones/ZoneItem'

/**
 * One button of the host screen's header, which the pad can land on (`005` round 2). The markup is
 * the `Pressable` it always was; this adds a place in the header zone, and the cursor ring while
 * the pad is on it. Without a pad it is that `Pressable` and nothing else.
 */
export function HostHeaderControl({
  id,
  order,
  row = 0,
  home = false,
  ringRadius = 8,
  onPress,
  disabled,
  children,
  ...pressable
}: Omit<PressableProps, 'onPress' | 'children'> & {
  /** Stable, and unique across the screen's header. */
  readonly id: string
  /** Position along its row, and which row, so the D-pad moves the way the buttons are laid out. */
  readonly order: number
  readonly row?: number
  /** The cursor starts here when the header is entered. */
  readonly home?: boolean
  readonly ringRadius?: number
  readonly onPress: () => void
  readonly children: ReactNode
}): ReactNode {
  return (
    <ZoneItem
      zone="header"
      id={`host:${id}`}
      order={order}
      row={row}
      home={home}
      disabled={disabled === true}
      onActivate={onPress}
    >
      {({ focused, focusRef }) => (
        <Pressable
          ref={focusRef}
          accessibilityRole="button"
          {...pressable}
          disabled={disabled}
          onPress={onPress}
        >
          {children}
          {focused ? <ControllerFocusRing radius={ringRadius} /> : null}
        </Pressable>
      )}
    </ZoneItem>
  )
}
