import type { ReactNode } from 'react'
import { Pressable, View } from 'react-native'
import type { FocusZone } from '../../gamepad/focus/focus-zones'
import { useMobileColorScheme } from '../../theme/use-mobile-color-scheme'
import { ControllerFocusRing } from '../../gamepad/focus/ControllerFocusRing'
import { ZoneItem } from '../../gamepad/zones/ZoneItem'
import { useDeckTheme } from '../theme/deck-theme'

/**
 * DECK-R50: an Orca component becomes pad-reachable without being restyled. `ZoneItem` reports
 * focus, this draws the one focus ring the deck has (SD-1), and a tap calls exactly what A calls.
 */
export function FocusableOrca({
  zone,
  id,
  order,
  row,
  disabled,
  onActivate,
  accessibilityLabel,
  children
}: {
  zone: FocusZone
  id: string
  order: number
  row?: number
  disabled?: boolean
  onActivate: () => void
  accessibilityLabel?: string
  children: ReactNode
}): ReactNode {
  useMobileColorScheme()
  const theme = useDeckTheme()
  return (
    <ZoneItem
      zone={zone}
      id={id}
      order={order}
      row={row}
      disabled={disabled}
      onActivate={onActivate}
    >
      {({ focused, focusRef }) => (
        <Pressable
          ref={focusRef}
          onPress={onActivate}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityState={{ selected: focused, disabled }}
          style={{ borderRadius: theme.radius.control }}
        >
          {children}
          {focused ? <ControllerFocusRing radius={theme.radius.control} /> : null}
        </Pressable>
      )}
    </ZoneItem>
  )
}

/** A row of focusable Orca items in one zone, ordered left to right. */
export function FocusableOrcaRow({ children }: { children: ReactNode }): ReactNode {
  const theme = useDeckTheme()
  return <View style={{ flexDirection: 'row', gap: theme.space.sm }}>{children}</View>
}
