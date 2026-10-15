import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle
} from 'react-native'
import { colors, radii, spacing, typography } from '../theme/mobile-theme'
import { caretCellLength, clampCaret } from './composer-text-editing'

/**
 * The draft as a pad sees it: read-only text with a block caret the D-pad moves. A text input only
 * draws its caret while it has the keyboard, and a pad has no use for the keyboard, so while one is
 * attached this stands in for the input until a touch asks for the real one.
 *
 * A block over the character the caret sits before, as a terminal draws it, so the caret takes no
 * width of its own and the text never reflows as it moves.
 */

export function DraftCaretField({
  value,
  caret,
  placeholder,
  onPress,
  accessibilityLabel,
  testID,
  style,
  textStyle
}: {
  readonly value: string
  readonly caret: number
  readonly placeholder: string
  /** A touch means the user wants the keyboard: hand over to the real input. */
  readonly onPress: () => void
  readonly accessibilityLabel: string
  readonly testID: string
  /** The field it stands in for, so swapping the two does not move the layout. */
  readonly style?: StyleProp<ViewStyle>
  readonly textStyle?: StyleProp<TextStyle>
}): React.JSX.Element {
  const at = clampCaret(value, caret)
  const cell = caretCellLength(value, at)
  const covered = cell === 0 ? '' : value.slice(at, at + cell)
  // A line break or the end has nothing to cover, so the block sits on a space before it.
  const block = covered === '' || covered === '\n' ? ' ' : covered
  const after = value.slice(covered === '\n' ? at : at + cell)

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Tap to type with the keyboard"
      onPress={onPress}
      style={[styles.field, style]}
      testID={testID}
    >
      <Text style={[styles.text, textStyle]}>
        {value.slice(0, at)}
        <Text style={styles.caret}>{block}</Text>
        {value.length === 0 ? <Text style={styles.placeholder}>{placeholder}</Text> : after}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  field: {
    width: '100%',
    maxHeight: 140,
    minHeight: 40,
    backgroundColor: colors.bgRaised,
    borderRadius: radii.input,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm
  },
  text: { color: colors.textPrimary, fontSize: typography.bodySize + 1 },
  caret: { backgroundColor: colors.accentBlue, color: colors.onAccent },
  placeholder: { color: colors.textMuted }
})
