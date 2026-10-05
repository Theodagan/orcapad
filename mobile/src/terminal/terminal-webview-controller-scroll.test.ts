// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { countTerminalGestureInputSequences } from './terminal-gesture-input'
import { XTERM_HTML } from './terminal-webview-html'

/**
 * Controller scroll in the WebView (`005` USE-R3). It used to scroll xterm's own scrollback and
 * nothing else, which is empty in the alternate screen: an agent CLI running as a full-screen TUI
 * never moved. It now enters the router touch and the external wheel already use, so the same
 * three modes behave the same way whoever is scrolling.
 */

function iifeSource(): string {
  const start = XTERM_HTML.indexOf('(function() {')
  const end = XTERM_HTML.lastIndexOf('})();')
  return XTERM_HTML.slice(start, end + '})();'.length)
}

function bodyMarkup(): string {
  const start = XTERM_HTML.indexOf('<body>') + '<body>'.length
  const end = XTERM_HTML.indexOf('<script>', start)
  return XTERM_HTML.slice(start, end)
}

type BufferState = { baseY: number; type: 'alternate' | 'normal'; viewportY: number }
type TerminalStub = ReturnType<typeof makeTerminal>
type RegisteredWindowListener = {
  listener: EventListenerOrEventListenerObject
  options?: boolean | AddEventListenerOptions
  type: string
}

const ESC = '\u001b'
const ARROW_DOWN = `${ESC}[B`
const ARROW_UP = `${ESC}[A`
const APP_ARROW_UP = `${ESC}OA`

function makeTerminal(buffer: BufferState, scrollLines: (lines: number) => void) {
  const terminal = {
    cols: 40,
    rows: 24,
    options: { fontSize: 13 },
    modes: { mouseTrackingMode: 'none' as string },
    element: null as HTMLElement | null,
    _core: { _renderService: { dimensions: { css: { cell: { width: 8, height: 15 } } } } },
    buffer: {
      active: {
        get baseY() {
          return buffer.baseY
        },
        get type() {
          return buffer.type
        },
        get viewportY() {
          return buffer.viewportY
        },
        cursorY: 0,
        length: 1,
        getLine: () => null
      }
    },
    write(_data: string, callback?: () => void) {
      callback?.()
    },
    open(surface: HTMLElement) {
      terminal.element = surface
    },
    loadAddon() {},
    resize(cols: number, rows: number) {
      terminal.cols = cols
      terminal.rows = rows
    },
    clear() {},
    reset() {},
    refresh() {},
    selectAll() {},
    clearSelection() {},
    select() {},
    scrollLines,
    scrollToBottom() {},
    scrollToLine() {},
    attachCustomKeyEventHandler() {},
    getSelection: () => '',
    onData: () => ({ dispose() {} }),
    onLineFeed: () => ({ dispose() {} }),
    onScroll: () => ({ dispose() {} }),
    onWriteParsed: () => ({ dispose() {} }),
    dispose() {}
  }
  return terminal
}

function inputBytes(postMessage: ReturnType<typeof vi.fn>): string {
  return postMessage.mock.calls
    .map(([raw]) => JSON.parse(String(raw)) as { bytes?: string; type: string })
    .filter((message) => message.type === 'terminal-input')
    .map((message) => message.bytes ?? '')
    .join('')
}

describe('terminal WebView controller scroll', () => {
  let animationFrames: (() => void)[]
  let buffer: BufferState
  let postMessage: ReturnType<typeof vi.fn>
  let registeredWindowListeners: RegisteredWindowListener[]
  let scrollLines: ReturnType<typeof vi.fn>
  let terminals: TerminalStub[]

  function boot(): void {
    document.body.innerHTML = bodyMarkup()
    new Function(iifeSource())()
    window.dispatchEvent(
      new MessageEvent('message', {
        data: JSON.stringify({ type: 'init', cols: 40, rows: 24, initialData: '' })
      })
    )
    while (animationFrames.length > 0) {
      animationFrames.shift()?.()
    }
  }

  function controllerScroll(lines: unknown): void {
    window.dispatchEvent(
      new MessageEvent('message', { data: JSON.stringify({ type: 'scroll-lines', lines }) })
    )
    for (let i = 0; i < 4 && animationFrames.length > 0; i++) {
      animationFrames.shift()?.()
    }
  }

  function terminal(): TerminalStub {
    const current = terminals[0]
    if (!current) {
      throw new Error('terminal missing')
    }
    return current
  }

  beforeEach(() => {
    animationFrames = []
    buffer = { baseY: 0, type: 'normal', viewportY: 0 }
    registeredWindowListeners = []
    terminals = []
    // Moves the viewport as xterm would, so the clamp has something real to clamp against.
    scrollLines = vi.fn((lines: number) => {
      buffer.viewportY = Math.min(Math.max(buffer.viewportY + lines, 0), buffer.baseY)
    })
    const addWindowEventListener = window.addEventListener.bind(window)
    vi.spyOn(window, 'addEventListener').mockImplementation(((
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ) => {
      registeredWindowListeners.push({ type, listener, options })
      addWindowEventListener(type, listener, options)
    }) as typeof window.addEventListener)
    vi.stubGlobal('requestAnimationFrame', (callback: () => void) => {
      animationFrames.push(callback)
      return animationFrames.length
    })
    vi.stubGlobal('cancelAnimationFrame', () => {})
    Object.defineProperty(window, 'innerWidth', { value: 381, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 612, configurable: true })
    postMessage = vi.fn()
    const webWindow = window as unknown as {
      Terminal: new () => TerminalStub
      ReactNativeWebView: { postMessage: (data: string) => void }
    }
    webWindow.Terminal = function () {
      const created = makeTerminal(buffer, scrollLines)
      terminals.push(created)
      return created
    } as unknown as new () => TerminalStub
    webWindow.ReactNativeWebView = { postMessage }
  })

  afterEach(() => {
    for (const { type, listener, options } of registeredWindowListeners) {
      window.removeEventListener(type, listener as EventListener, options)
    }
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  describe('the normal buffer', () => {
    it('scrolls xterm itself, and sends the terminal nothing', () => {
      buffer = { baseY: 20, type: 'normal', viewportY: 20 }
      boot()

      controllerScroll(-3)

      expect(scrollLines).toHaveBeenCalledWith(-3)
      expect(inputBytes(postMessage)).toBe('')
    })

    it('stops at the bottom and at the top instead of walking off the scrollback', () => {
      buffer = { baseY: 20, type: 'normal', viewportY: 20 }
      boot()

      controllerScroll(9)
      expect(scrollLines).not.toHaveBeenCalled()

      buffer.viewportY = 2
      controllerScroll(-9)
      expect(scrollLines).toHaveBeenCalledWith(-2)
    })

    it('scrolls the scrollback under x10 mouse tracking, which has no wheel', () => {
      buffer = { baseY: 20, type: 'normal', viewportY: 20 }
      boot()
      terminal().modes.mouseTrackingMode = 'x10'

      controllerScroll(-2)

      expect(scrollLines).toHaveBeenCalledWith(-2)
    })
  })

  describe('the alternate screen, where an agent TUI lives', () => {
    it('sends arrow keys, as touch does, instead of doing nothing', () => {
      buffer = { baseY: 0, type: 'alternate', viewportY: 0 }
      boot()

      controllerScroll(3)
      expect(inputBytes(postMessage)).toBe(ARROW_DOWN.repeat(3))

      postMessage.mockClear()
      controllerScroll(-2)
      expect(inputBytes(postMessage)).toBe(ARROW_UP.repeat(2))
      expect(scrollLines).not.toHaveBeenCalled()
    })

    it('honours application cursor mode', () => {
      buffer = { baseY: 0, type: 'alternate', viewportY: 0 }
      boot()
      ;(terminal().modes as Record<string, unknown>).applicationCursorKeysMode = true

      controllerScroll(-2)

      expect(inputBytes(postMessage)).toBe(APP_ARROW_UP.repeat(2))
    })

    it('caps what one message can send, so a stall cannot flood the PTY', () => {
      buffer = { baseY: 0, type: 'alternate', viewportY: 0 }
      boot()

      controllerScroll(100)

      expect(inputBytes(postMessage)).toBe(ARROW_DOWN.repeat(32))
    })
  })

  describe('mouse tracking, where the TUI owns the wheel', () => {
    it('reports the wheel, and leaves local scrollback alone', () => {
      buffer = { baseY: 20, type: 'normal', viewportY: 20 }
      boot()
      terminal().modes.mouseTrackingMode = 'any'

      controllerScroll(-2)

      const bytes = inputBytes(postMessage)
      // Default encoding: wheel-up is button 64, so 64 + 32 = 96 ('`'), then two cell bytes.
      expect(bytes.startsWith(`${ESC}[M\``)).toBe(true)
      expect(bytes).toHaveLength(12)
      expect(scrollLines).not.toHaveBeenCalled()
    })
  })

  describe('what reaches the React Native side', () => {
    it('is accepted by the same gesture gate touch passes through', () => {
      buffer = { baseY: 0, type: 'alternate', viewportY: 0 }
      boot()

      controllerScroll(4)

      expect(countTerminalGestureInputSequences(inputBytes(postMessage))).not.toBeNull()
    })

    it.each([0, 0.4, Number.NaN, Number.POSITIVE_INFINITY, 'x', undefined])(
      'ignores a line count of %s',
      (lines) => {
        buffer = { baseY: 20, type: 'normal', viewportY: 10 }
        boot()

        controllerScroll(lines)

        expect(scrollLines).not.toHaveBeenCalled()
        expect(inputBytes(postMessage)).toBe('')
      }
    )
  })
})
