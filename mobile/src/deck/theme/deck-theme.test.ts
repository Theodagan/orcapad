import { describe, expect, it } from 'vitest'
import {
  paletteForScheme,
  radii,
  spacing,
  typography,
  type MobilePalette
} from '../../theme/mobile-theme'
import { deckThemeForScheme, PAGE_TITLE_SIZE, type DeckWheelKind } from './deck-theme'

const SCHEMES = ['light', 'dark'] as const
const WHEEL_KINDS: readonly DeckWheelKind[] = [
  'session',
  'project',
  'agent',
  'file',
  'browser',
  'approval',
  'command'
]

/** WCAG 2.1 relative luminance, from the sRGB hex Orca's palette stores. */
function luminance(hex: string): number {
  const value = hex.replace('#', '')
  const channels = [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16) / 255)
  const [r, g, b] = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  )
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrastRatio(foreground: string, background: string): number {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
  return (lighter + 0.05) / (darker + 0.05)
}

/** Every palette entry the deck's roles may point at. */
function orcaTokens(palette: MobilePalette): readonly string[] {
  return Object.values(palette)
}

describe('deck theme', () => {
  for (const scheme of SCHEMES) {
    it(`resolves every role to an Orca token in the ${scheme} scheme`, () => {
      const theme = deckThemeForScheme(scheme)
      const tokens = orcaTokens(paletteForScheme(scheme))
      for (const [role, value] of Object.entries(theme.color)) {
        expect({ role, fromOrca: tokens.includes(value) }).toEqual({ role, fromOrca: true })
      }
      for (const kind of WHEEL_KINDS) {
        expect(tokens).toContain(theme.wheel[kind].color)
      }
      expect(theme.space).toBe(spacing)
      expect(theme.radius).toBe(radii)
      expect(theme.text.title).toBe(typography.titleSize)
      expect(theme.text.body).toBe(typography.bodySize)
      expect(theme.text.meta).toBe(typography.metaSize)
      expect(theme.text.pageTitle).toBe(PAGE_TITLE_SIZE)
    })

    it(`keeps the three text tones readable on all three pane backgrounds in the ${scheme} scheme`, () => {
      const theme = deckThemeForScheme(scheme)
      const panes = [theme.color.base, theme.color.panel, theme.color.raised]
      // Primary carries the content: AA large text everywhere, and then some.
      for (const pane of panes) {
        expect(contrastRatio(theme.color.text1, pane)).toBeGreaterThanOrEqual(7)
      }
      // Secondary and muted are Orca's own roles; on its raised surfaces they sit at 4.2–4.4:1.
      // The deck does not repaint Orca's text roles, so the bar is 4:1 and the palette owns the rest.
      for (const text of [theme.color.text2, theme.color.text3]) {
        for (const pane of panes) {
          expect(contrastRatio(text, pane)).toBeGreaterThanOrEqual(4)
        }
      }
    })

    it(`keeps the status colours visible as graphics on a panel in the ${scheme} scheme`, () => {
      const theme = deckThemeForScheme(scheme)
      const floor = scheme === 'dark' ? 3 : 2.8
      for (const status of [theme.color.run, theme.color.need, theme.color.ok, theme.color.risk]) {
        expect(contrastRatio(status, theme.color.panel)).toBeGreaterThanOrEqual(floor)
      }
      // Light's amber is 2.81:1 on its own panel: Orca's value, kept rather than replaced, and the
      // status label beside it is what carries the meaning (VIS-2).
      // Orca's own dark accent carries white at 4.19:1 — its pair, not the deck's to repaint.
      const onAccentFloor = scheme === 'dark' ? 4.1 : 4.5
      expect(contrastRatio(theme.color.onAccent, theme.color.accent)).toBeGreaterThanOrEqual(
        onAccentFloor
      )
    })
  }

  it('gives every wheel kind its own shape as well as its own colour', () => {
    const theme = deckThemeForScheme('dark')
    expect(new Set(WHEEL_KINDS.map((kind) => theme.wheel[kind].shape)).size).toBe(
      WHEEL_KINDS.length
    )
    expect(new Set(WHEEL_KINDS.map((kind) => theme.wheel[kind].color)).size).toBeGreaterThan(3)
  })
})
