// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { createTerminalDocumentScope } from './document/document-scope'
import { handleMsg } from './document/host-message-router'
import { countTerminalGestureInputSequences } from './terminal-gesture-input'

/**
 * Controller scroll in the document (`005` USE-R3). It used to scroll xterm's own scrollback and
 * nothing else, which is empty in the alternate screen: an agent CLI running as a full-screen TUI
 * never moved. It now enters the router touch and the external wheel already use, so the same
 * three modes behave the same way whoever is scrolling.
 */

type BufferState = { baseY: number; type: 'alternate' | 'normal'; viewportY: number }

const ESC = '\u001b'
const ARROW_DOWN = `${ESC}[B`
const ARROW_UP = `${ESC}[A`
const APP_ARROW_UP = `${ESC}OA`

function setup(buffer: BufferState) {
  const posted: Record<string, unknown>[] = []
  const scope = createTerminalDocumentScope({ postToHost: (message) => posted.push(message) })
  // Moves the viewport as xterm would, so the clamp has something real to clamp against.
  const scrollLines = vi.fn((lines: number) => {
    buffer.viewportY = Math.min(Math.max(buffer.viewportY + lines, 0), buffer.baseY)
  })
  const modes = { mouseTrackingMode: 'none', applicationCursorKeysMode: false }
  const term = { cols: 40, rows: 24, modes, buffer: { active: buffer }, scrollLines }
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the double implements the buffer, modes and scrollLines members the scroll router reads.
  scope.term = term as unknown as typeof scope.term
  const inputBytes = () =>
    posted
      .filter((message) => message.type === 'terminal-input')
      .map((message) => String(message.bytes ?? ''))
      .join('')
  const controllerScroll = (lines: unknown) =>
    // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the router reads `lines` as unknown input and validates it, which the invalid-count cases exercise.
    handleMsg(scope, { type: 'scroll-lines', lines: lines as number })
  return { scope, modes, scrollLines, posted, inputBytes, controllerScroll }
}

describe('terminal document controller scroll', () => {
  describe('the normal buffer', () => {
    it('scrolls xterm itself, and sends the terminal nothing', () => {
      const t = setup({ baseY: 20, type: 'normal', viewportY: 20 })
      t.controllerScroll(-3)
      expect(t.scrollLines).toHaveBeenCalledWith(-3)
      expect(t.inputBytes()).toBe('')
    })

    it('stops at the bottom and at the top instead of walking off the scrollback', () => {
      const buffer: BufferState = { baseY: 20, type: 'normal', viewportY: 20 }
      const t = setup(buffer)
      t.controllerScroll(9)
      expect(t.scrollLines).not.toHaveBeenCalled()

      buffer.viewportY = 2
      t.controllerScroll(-9)
      expect(t.scrollLines).toHaveBeenCalledWith(-2)
    })

    it('scrolls the scrollback under x10 mouse tracking, which has no wheel', () => {
      const t = setup({ baseY: 20, type: 'normal', viewportY: 20 })
      t.modes.mouseTrackingMode = 'x10'
      t.controllerScroll(-2)
      expect(t.scrollLines).toHaveBeenCalledWith(-2)
    })
  })

  describe('the alternate screen, where an agent TUI lives', () => {
    it('sends arrow keys, as touch does, instead of doing nothing', () => {
      const t = setup({ baseY: 0, type: 'alternate', viewportY: 0 })
      t.controllerScroll(3)
      expect(t.inputBytes()).toBe(ARROW_DOWN.repeat(3))

      t.posted.length = 0
      t.controllerScroll(-2)
      expect(t.inputBytes()).toBe(ARROW_UP.repeat(2))
      expect(t.scrollLines).not.toHaveBeenCalled()
    })

    it('honours application cursor mode', () => {
      const t = setup({ baseY: 0, type: 'alternate', viewportY: 0 })
      t.modes.applicationCursorKeysMode = true
      t.controllerScroll(-2)
      expect(t.inputBytes()).toBe(APP_ARROW_UP.repeat(2))
    })

    it('caps what one message can send, so a stall cannot flood the PTY', () => {
      const t = setup({ baseY: 0, type: 'alternate', viewportY: 0 })
      t.controllerScroll(100)
      expect(t.inputBytes()).toBe(ARROW_DOWN.repeat(32))
    })

    it('is accepted by the same gesture gate touch passes through', () => {
      const t = setup({ baseY: 0, type: 'alternate', viewportY: 0 })
      t.controllerScroll(4)
      expect(countTerminalGestureInputSequences(t.inputBytes())).not.toBeNull()
    })
  })

  it('hands a mouse-tracking TUI input, and leaves local scrollback alone', () => {
    const t = setup({ baseY: 20, type: 'normal', viewportY: 20 })
    t.modes.mouseTrackingMode = 'any'
    t.scope.mouseEncodingKnown = true
    t.controllerScroll(-2)
    expect(t.inputBytes()).not.toBe('')
    expect(t.scrollLines).not.toHaveBeenCalled()
  })

  it.each([0, 0.4, Number.NaN, Number.POSITIVE_INFINITY, 'x', undefined])(
    'ignores a line count of %s',
    (lines) => {
      const t = setup({ baseY: 20, type: 'normal', viewportY: 10 })
      t.controllerScroll(lines)
      expect(t.scrollLines).not.toHaveBeenCalled()
      expect(t.inputBytes()).toBe('')
    }
  )
})
