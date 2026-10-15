import { Stack } from 'expo-router'
import { colors } from '../theme/mobile-theme'
import { NavigatorScreenGate } from './navigator-screen-gate'
import { HOST_STACK_SCREENS, type HostStackAnimation } from './host-stack-screens'

export function HostStack({ animation }: { animation: HostStackAnimation }) {
  return (
    <Stack
      // Screens kept under the top one must not answer the pad (see NavigatorScreenGate).
      screenLayout={({ navigation, children }) => (
        <NavigatorScreenGate navigation={navigation}>{children}</NavigatorScreenGate>
      )}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bgBase },
        // In the tablet split view the detail pane should swap instantly like
        // a desktop master-detail; the default slide animates the outgoing
        // screen and briefly reveals the one beneath it. Phones keep the slide.
        animation
      }}
    >
      {HOST_STACK_SCREENS.map(({ name, title }) => (
        <Stack.Screen key={name} name={name} options={{ title }} />
      ))}
    </Stack>
  )
}
