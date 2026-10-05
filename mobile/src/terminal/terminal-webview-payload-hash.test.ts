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
const EXPECTED_SHA256 = 'cae7a3b3c4460e837dc1fcb60d71665078620277f10a39390282b6d094baa564'
const EXPECTED_LENGTH = 731200

describe('terminal WebView payload', () => {
  it('composes the expected document', () => {
    expect(XTERM_HTML.length).toBe(EXPECTED_LENGTH)
    expect(createHash('sha256').update(XTERM_HTML, 'utf8').digest('hex')).toBe(EXPECTED_SHA256)
  })
})
