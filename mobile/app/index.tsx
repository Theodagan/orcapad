import { Redirect } from 'expo-router'
import { MobileHomeScreen } from '../src/home/MobileHomeScreen'
import { startInterfacePreference, useDeckInterface } from '../src/deck/entry/interface-preference'

// Start the read before the first frame so a deck install lands on the deck without a visible detour.
void startInterfacePreference()

export default function IndexRoute() {
  const deck = useDeckInterface()
  return deck ? <Redirect href="/deck" /> : <MobileHomeScreen />
}
