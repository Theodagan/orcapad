import type { ComponentType, Ref } from 'react'
import { Pressable, type View } from 'react-native'
import { ControllerFocusRing } from '../gamepad/focus/ControllerFocusRing'
import { colors } from '../theme/mobile-theme'
import { styles } from './mobile-session-styles'

type HeaderIconProps = {
  size?: number
  color?: string
  strokeWidth?: number
}

type MobileSessionHeaderIconButtonProps = {
  active?: boolean
  accessibilityLabel: string
  icon: ComponentType<HeaderIconProps>
  onPress: () => void
  /** The controller's cursor is on this button. Never true for a touch user. */
  focused?: boolean
  /** Lets Android's own focus follow the cursor onto this button. */
  focusRef?: Ref<View>
}

export function MobileSessionHeaderIconButton({
  active = false,
  accessibilityLabel,
  icon: Icon,
  onPress,
  focused = false,
  focusRef
}: MobileSessionHeaderIconButtonProps) {
  return (
    <Pressable
      ref={focusRef}
      style={({ pressed }) => [
        styles.filesButton,
        pressed && styles.filesButtonPressed,
        active && styles.filesButtonActive
      ]}
      onPress={onPress}
      hitSlop={8}
      accessibilityLabel={accessibilityLabel}
    >
      <Icon size={18} color={colors.textSecondary} strokeWidth={2.1} />
      {focused ? <ControllerFocusRing radius={8} /> : null}
    </Pressable>
  )
}
