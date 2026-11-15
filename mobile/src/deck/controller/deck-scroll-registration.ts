import { createContext, useContext, useEffect } from 'react'

export type DeckScrollHandler = (points: number) => void
export type DeckScrollRegistration = (handler: DeckScrollHandler) => () => void

const DeckScrollContext = createContext<DeckScrollRegistration>(() => () => {})

export const DeckScrollProvider = DeckScrollContext.Provider

export function useDeckScrollRegistration(handler: DeckScrollHandler): void {
  const register = useContext(DeckScrollContext)
  useEffect(() => register(handler), [handler, register])
}
