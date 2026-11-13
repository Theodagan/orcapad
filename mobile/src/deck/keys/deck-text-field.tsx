import type { ReactNode, RefObject } from 'react'
import { TextInput, type TextInput as TextInputHandle, type TextInputProps } from 'react-native'
import { useDeckTheme } from '../theme/deck-theme'

/**
 * KEY-9/DECK-R13: the deck's one text field. The Android IME never opens over a deck screen — the
 * pad's split keys (KEY-2…4) and the phone's own hardware keys type instead — so every deck field is
 * this wrapper, and `ime-guard.test.ts` fails if any other module in `src/deck/` names a raw
 * `TextInput`. A touch user still gets a caret, a selection and the system's paste menu.
 */
export function DeckTextField({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  testID,
  onSubmitEditing,
  editable,
  multiline,
  onSelectionChange,
  forwardedRef
}: {
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
  accessibilityLabel?: string
  testID?: string
  onSubmitEditing?: () => void
  editable?: boolean
  multiline?: boolean
  onSelectionChange?: TextInputProps['onSelectionChange']
  forwardedRef?: RefObject<TextInputHandle | null>
}): ReactNode {
  const theme = useDeckTheme()
  return (
    <TextInput
      ref={forwardedRef}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.color.text3}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      onSubmitEditing={onSubmitEditing}
      editable={editable}
      multiline={multiline}
      onSelectionChange={onSelectionChange}
      showSoftInputOnFocus={false}
      style={{
        color: theme.color.text1,
        fontSize: theme.text.body,
        backgroundColor: theme.color.raised,
        borderRadius: theme.radius.control,
        paddingHorizontal: theme.space.sm,
        paddingVertical: theme.space.xs
      }}
    />
  )
}
