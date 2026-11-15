import { useState, type ReactNode } from 'react'
import type { MobileNativeChatController } from '../../session/native-chat/mobile-native-chat-controller-contract'
import {
  MobileNativeChatSessionOptionPickers,
  type MobileNativeChatPickerPresentation
} from '../../session/native-chat/input/MobileNativeChatSessionOptionPickers'

export function AgentPanel({
  options
}: {
  options: MobileNativeChatController['nativeChatSessionOptions']
}): ReactNode {
  const [presentation, setPresentation] = useState<MobileNativeChatPickerPresentation | null>(null)
  if (!options) {
    return null
  }
  return (
    <MobileNativeChatSessionOptionPickers
      {...options}
      presentation={presentation}
      onNavigate={(page) =>
        setPresentation((current) =>
          page === null ? null : { page, refocus: current?.refocus ?? false }
        )
      }
      onDrawerOpen={(page) => setPresentation({ page, refocus: false })}
      onDrawerAfterClose={() => setPresentation(null)}
    />
  )
}
