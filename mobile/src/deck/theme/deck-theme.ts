import {
  feedback,
  paletteForScheme,
  radii,
  spacing,
  typography,
  type MobileColorScheme
} from '../../theme/mobile-theme'
import { useMobileColorScheme } from '../../theme/use-mobile-color-scheme'

/**
 * DECK-R34: every deck style reads Orca's tokens through here. This module adds only what Orca has
 * no role for — a page title size, a focus ring, and the wheel's kind colours and shapes — and every
 * one of those is derived from Orca's palette rather than written as a value of its own.
 *
 * Nothing else in `src/deck/` may name a colour, a font size or a radius: `deck-design-guard.test.ts`
 * enforces it.
 */
export const PAGE_TITLE_SIZE = 22

/** What a wheel entry is, which decides its colour and its shape (DIAL-2, VIS-2). */
export type DeckWheelKind =
  | 'session'
  | 'project'
  | 'agent'
  | 'file'
  | 'browser'
  | 'approval'
  | 'command'

/** Shape as well as colour, so a kind is legible without relying on hue (VIS-2). */
export type DeckWheelShape =
  | 'circle'
  | 'square'
  | 'diamond'
  | 'triangle'
  | 'pill'
  | 'hexagon'
  | 'star'

export type DeckTheme = {
  readonly color: {
    /** --bg-0/1/2: the page, a panel column, a raised surface inside one (VIS-7). */
    readonly base: string
    readonly panel: string
    readonly raised: string
    readonly hair: string
    readonly text1: string
    readonly text2: string
    readonly text3: string
    /** One accent; "running" uses it too. */
    readonly accent: string
    readonly onAccent: string
    readonly run: string
    readonly need: string
    readonly ok: string
    readonly risk: string
    readonly focusRing: string
  }
  readonly space: typeof spacing
  readonly radius: typeof radii
  readonly text: {
    readonly pageTitle: number
    readonly title: number
    readonly body: number
    readonly meta: number
    readonly monoFamily: string
  }
  readonly feedback: typeof feedback
  readonly wheel: Readonly<
    Record<DeckWheelKind, { readonly color: string; readonly shape: DeckWheelShape }>
  >
}

export function deckThemeForScheme(scheme: MobileColorScheme): DeckTheme {
  const palette = paletteForScheme(scheme)
  return {
    color: {
      base: palette.bgBase,
      panel: palette.bgPanel,
      raised: palette.bgRaised,
      hair: palette.borderSubtle,
      text1: palette.textPrimary,
      text2: palette.textSecondary,
      text3: palette.textMuted,
      accent: palette.accentBlue,
      onAccent: palette.onAccent,
      run: palette.accentBlue,
      need: palette.statusAmber,
      ok: palette.statusGreen,
      risk: palette.statusRed,
      // Orca's input border is its 3:1 ring; the deck reuses it rather than inventing a second one (SD-1).
      focusRing: palette.inputBorder
    },
    space: spacing,
    radius: radii,
    text: {
      pageTitle: PAGE_TITLE_SIZE,
      title: typography.titleSize,
      body: typography.bodySize,
      meta: typography.metaSize,
      monoFamily: typography.monoFamily
    },
    feedback,
    wheel: {
      session: { color: palette.accentBlue, shape: 'circle' },
      project: { color: palette.statusPurple, shape: 'square' },
      agent: { color: palette.statusGreen, shape: 'hexagon' },
      file: { color: palette.textSecondary, shape: 'triangle' },
      browser: { color: palette.syntaxKeyword, shape: 'pill' },
      approval: { color: palette.statusAmber, shape: 'diamond' },
      command: { color: palette.textMuted, shape: 'star' }
    }
  }
}

export function useDeckTheme(): DeckTheme {
  return deckThemeForScheme(useMobileColorScheme())
}
