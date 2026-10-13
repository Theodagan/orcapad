import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { XTERM_HTML } from './terminal-webview-html'

// Why: every other WebView test exercises one slice of the document, so an edit to an
// uncovered region ships silently. A diff here means the emitted WebView source changed —
// update these values only when that change is deliberate, and only after checking the
// document still runs. Refactors that merely move slice boundaries must leave them alone.
// Re-pinned in BIND-T6: the `scroll-lines` branch in host-message-router.ts, which is the only
// way a controller can move the local scrollback. Every inline script in the emitted document
// was parsed after the edit, so "still runs" is checked rather than assumed.
// Re-pinned in 005: that branch now enters the touch router through `controllerScrollLines`, so
// controller scroll reaches alt-screen and mouse-tracking TUIs instead of doing nothing there.
// Re-pinned in 005 round 2: the engine build stopped minifying syntax, because esbuild 0.25 dropped a
// declaration in xterm's requestMode and every mode query (opencode's first write) threw. The page
// was loaded in headless Chrome against a real opencode transcript after the edit, and
// terminal-webview-engine-mode-queries.test.ts runs the engine itself.
// Re-pinned for elapsed-time momentum, cached drag geometry, and frame-coalesced TUI input.
const EXPECTED_SHA256 = '02071b95c2f65bffe4ebda18e4cc49acd247bc99904175e88007b14834b1dc5c'
const EXPECTED_LENGTH = 736247

describe('terminal WebView payload', () => {
  it('composes the expected document', () => {
    expect(XTERM_HTML.length).toBe(EXPECTED_LENGTH)
    expect(createHash('sha256').update(XTERM_HTML, 'utf8').digest('hex')).toBe(EXPECTED_SHA256)
  })
})
