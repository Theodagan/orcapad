/**
 * DECK-R3/PANEL-1: panels are columns that split the width, never overlays. This is the arithmetic
 * that keeps them off the content: the middle keeps a usable minimum, and a panel that would eat
 * into it is simply not shown.
 */
export const PANEL_WIDTH = 280
export const MAIN_MIN_WIDTH = 320

export type PanelColumnsLayout = {
  readonly left: number
  readonly main: number
  readonly right: number
}

export function panelColumnsLayout(
  windowWidth: number,
  options: { readonly left: boolean; readonly right: boolean }
): PanelColumnsLayout {
  let remaining = Math.max(windowWidth, 0)
  let left = 0
  let right = 0
  if (options.left && remaining - PANEL_WIDTH >= MAIN_MIN_WIDTH) {
    left = PANEL_WIDTH
    remaining -= left
  }
  if (options.right && remaining - PANEL_WIDTH >= MAIN_MIN_WIDTH) {
    right = PANEL_WIDTH
    remaining -= right
  }
  return { left, main: remaining, right }
}

/** A column is drawn only when it has width: the deck never renders an overlay in its place. */
export function columnVisible(width: number): boolean {
  return width > 0
}
