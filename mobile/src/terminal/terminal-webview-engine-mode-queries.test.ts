// @vitest-environment happy-dom
import { beforeAll, describe, expect, it } from 'vitest'
import { XTERM_ENGINE_JS } from './terminal-webview-engine.generated'

/**
 * The generated engine is what runs in the WebView, not xterm's own build. A TUI that asks which
 * modes the terminal knows (opencode does, before it switches to the alternate screen) must not
 * throw inside the parser: the write that carried the question is lost with it, and the pane never
 * learns it is in the alternate screen with the mouse on. Controller scroll then has nothing to
 * route to (`005` round 2).
 */

const ESC = '\u001b'

let TerminalEngine: unknown

beforeAll(() => {
  new Function(XTERM_ENGINE_JS)()
  TerminalEngine = Reflect.get(window, 'Terminal')
})

function startTerminal(): {
  replies: string[]
  write: (data: string) => Promise<void>
  mouse: () => unknown
} {
  if (typeof TerminalEngine !== 'function') {
    throw new Error('the engine did not register a Terminal')
  }
  const terminal: unknown = Reflect.construct(TerminalEngine, [
    { cols: 100, rows: 30, allowProposedApi: true }
  ])
  if (typeof terminal !== 'object' || terminal === null) {
    throw new Error('the engine built no terminal')
  }
  const onData: unknown = Reflect.get(terminal, 'onData')
  const writeData: unknown = Reflect.get(terminal, 'write')
  if (typeof onData !== 'function' || typeof writeData !== 'function') {
    throw new Error('the terminal lacks onData or write')
  }
  const replies: string[] = []
  Reflect.apply(onData, terminal, [(data: string) => replies.push(data)])
  return {
    replies,
    write: (data) => new Promise((resolve) => Reflect.apply(writeData, terminal, [data, resolve])),
    mouse: () => {
      const modes: unknown = Reflect.get(terminal, 'modes')
      return typeof modes === 'object' && modes !== null
        ? Reflect.get(modes, 'mouseTrackingMode')
        : null
    }
  }
}

describe('terminal engine mode queries', () => {
  it('answers a DECRQM instead of throwing', async () => {
    const terminal = startTerminal()
    await terminal.write(`${ESC}[?2004$p`)
    expect(terminal.replies).toEqual([`${ESC}[?2004;2$y`])
  })

  it('keeps parsing the rest of the write after a mode query', async () => {
    const terminal = startTerminal()
    // The order opencode sends them in: questions first, then the modes it wants.
    await terminal.write(`${ESC}[?1016$p${ESC}[?2026$p${ESC}[?1049h${ESC}[?1003h${ESC}[?1006h`)
    expect(terminal.mouse()).toBe('any')
  })
})
