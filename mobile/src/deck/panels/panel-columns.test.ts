import { describe, expect, it } from 'vitest'
import { MAIN_MIN_WIDTH, PANEL_WIDTH, panelColumnsLayout } from './panel-columns'
import { deckPanelsForScreen, panelsForSide } from './panel-registry'

describe('panel columns', () => {
  it('splits a landscape window into three columns that add up to it', () => {
    const layout = panelColumnsLayout(1200, { left: true, right: true })
    expect(layout).toEqual({ left: PANEL_WIDTH, main: 1200 - PANEL_WIDTH * 2, right: PANEL_WIDTH })
  })

  it('never overlaps: the columns always sum to the window and the middle keeps its minimum', () => {
    for (const width of [360, 480, 640, 720, 900, 1280]) {
      const layout = panelColumnsLayout(width, { left: true, right: true })
      expect(layout.left + layout.main + layout.right).toBe(width)
      expect(layout.main).toBeGreaterThanOrEqual(Math.min(width, MAIN_MIN_WIDTH))
    }
  })

  it('drops a column that does not fit rather than drawing it over the content', () => {
    // 480 leaves the middle 200 points: neither column fits, so neither is drawn.
    expect(panelColumnsLayout(480, { left: true, right: true })).toEqual({
      left: 0,
      main: 480,
      right: 0
    })
    expect(panelColumnsLayout(1200, { left: true, right: false })).toEqual({
      left: PANEL_WIDTH,
      main: 1200 - PANEL_WIDTH,
      right: 0
    })
  })

  it('gives the left column the width first, so the same window always splits the same way', () => {
    // 700 fits the left column and then not the right one; the order decides which survives.
    const layout = panelColumnsLayout(700, { left: true, right: true })
    expect(layout.left).toBe(PANEL_WIDTH)
    expect(layout.right).toBe(0)
    expect(panelColumnsLayout(960, { left: true, right: true })).toEqual({
      left: PANEL_WIDTH,
      main: 960 - PANEL_WIDTH * 2,
      right: PANEL_WIDTH
    })
  })

  it('registers the left panels on every screen and the right ones per screen', () => {
    expect(panelsForSide('sessions', 'left').map((panel) => panel.id)).toEqual([
      'quick-menu',
      'all-open'
    ])
    expect(panelsForSide('session', 'right').map((panel) => panel.id)).toEqual([
      'session-log',
      'forks'
    ])
    expect(panelsForSide('overview', 'right')).toEqual([])
  })

  it('says why a panel is unavailable instead of offering it', () => {
    const ports = deckPanelsForScreen('ports').find((panel) => panel.id === 'ports')
    expect(ports?.disabledReason).toBe('not-declared')
    expect(deckPanelsForScreen('sessions').every((panel) => panel.disabledReason === null)).toBe(
      true
    )
  })
})
