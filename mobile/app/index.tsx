import { Redirect } from 'expo-router'
import { MobileHomeScreen } from '../src/home/MobileHomeScreen'
import {
  startInterfacePreference,
  useInterfacePreference
} from '../src/storage/interface-preference'

// Start the read before the first frame so a deck install lands on the deck without a visible detour.
void startInterfacePreference()

export default function IndexRoute() {
  return useInterfacePreference() === 'deck' ? <Redirect href="/deck" /> : <MobileHomeScreen />
}
