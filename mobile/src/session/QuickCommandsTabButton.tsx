import type { Ref } from 'react'
import { Pressable, View } from 'react-native'
import { SquareChevronRight } from 'lucide-react-native'

import { ControllerFocusRing } from '../gamepad/focus/ControllerFocusRing'
import { colors } from '../theme/mobile-theme'
import { styles } from './mobile-session-styles'

type Props = {
  disabled: boolean
  onPress: () => void
  /** The controller's cursor is on this button. Never true for a touch user. */
  focused?: boolean
  /** Lets Android's own focus follow the cursor onto this button. */
  focusRef?: Ref<View>
}

export function QuickCommandsTabButton({ disabled, onPress, focused = false, focusRef }: Props) {
  return (
    <>
      <View style={styles.tabActionDivider} />
      <Pressable
        ref={focusRef}
        style={({ pressed }) => [
          styles.newTerminalButton,
          pressed && styles.newTerminalButtonPressed,
          disabled && styles.newTerminalButtonDisabled
        ]}
        disabled={disabled}
        onPress={onPress}
        accessibilityLabel="Quick commands"
      >
        <SquareChevronRight size={16} color={colors.textSecondary} strokeWidth={2.2} />
        {focused ? <ControllerFocusRing radius={8} /> : null}
      </Pressable>
    </>
  )
}
