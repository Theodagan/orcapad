import { createElement, type ReactNode } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import { ControllerProvider, useController } from '../controller-provider'
import type { ControllerIntent } from '../controller-input/controller-intent'
import { createWheelRegistry } from '../wheel/wheel-registry'
import {
  TERMINAL_LINES_PER_SECOND_AT_FULL_PRESSURE,
  useTerminalControllerBinding,
  type TerminalControllerBindingOptions
} from './use-terminal-controller-binding'

vi.mock('react-native', () => ({
  StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
  View: 'View'
}))

const ESC = '\u001b'
const actions = [
  { id: 'terminal.escape', label: 'Esc', send: ESC, enabled: true },
  { id: 'terminal.quick.deploy', label: 'Deploy', send: 'deploy\r', enabled: false }
]

type ScrollIntent = Extract<ControllerIntent, { kind: 'scroll' }>
const scroll = (
  direction: 'up' | 'down',
  velocity: number,
  elapsedMs = 16,
  begins = false
): ScrollIntent => ({ kind: 'scroll', direction, velocity, elapsedMs, begins })

function mount(overrides: Partial<TerminalControllerBindingOptions> = {}) {
  const registry = createWheelRegistry()
  const scrollLines = vi.fn()
  const sendKey = vi.fn()
  let dispatch: (intent: ControllerIntent) => boolean = () => false
  let snapshot: () => ReturnType<ReturnType<typeof useController>['focus']['snapshot']> = () => {
    throw new Error('not mounted')
  }
  let props: TerminalControllerBindingOptions = {
    handle: 'h1',
    enabled: true,
    scrollLines,
    sendKey,
    actions,
    ...overrides
  }

  function Pane(): ReactNode {
    useTerminalControllerBinding(props)
    const controller = useController()
    dispatch = controller.dispatchIntent
    snapshot = controller.focus.snapshot
    return null
  }

  function Tree(): ReactNode {
    return createElement(
      ControllerProvider,
      { registerWheelAction: registry.register },
      createElement(Pane)
    )
  }

  let renderer: ReactTestRenderer | null = null
  act(() => {
    renderer = create(createElement(Tree))
  })
  if (renderer === null) {
    throw new Error('renderer did not mount')
  }
  const mounted: ReactTestRenderer = renderer

  return {
    renderer: mounted,
    registry,
    snapshot: () => snapshot(),
    dispatch: (intent: ControllerIntent) => act(() => void dispatch(intent)),
    answers: (intent: ControllerIntent) => dispatch(intent),
    rerender: (next: Partial<TerminalControllerBindingOptions> = {}) => {
      props = { ...props, ...next }
      act(() => mounted.update(createElement(Tree)))
    },
    scrollLines,
    sendKey
  }
}

describe('terminal controller binding', () => {
  describe('scroll (005 USE-R3)', () => {
    it('moves a distance that comes from pressure and time, in whole lines', () => {
      const pane = mount()

      for (let at = 0; at < 1000; at += 16) {
        pane.dispatch(scroll('down', 1, at === 0 ? 16 : 16, at === 0))
      }

      const total = pane.scrollLines.mock.calls.reduce((sum, [lines]) => sum + lines, 0)
      expect(total).toBeGreaterThanOrEqual(TERMINAL_LINES_PER_SECOND_AT_FULL_PRESSURE - 3)
      expect(total).toBeLessThanOrEqual(TERMINAL_LINES_PER_SECOND_AT_FULL_PRESSURE + 3)
    })

    it('scrolls up with a negative count', () => {
      const pane = mount()

      pane.dispatch(scroll('up', 1, 16, true))

      expect(pane.scrollLines).toHaveBeenCalledWith(-1)
    })

    // A light trigger still has to move something, or a tap on the bottom of the range is dead.
    it('moves at least one line on the first sample of a hold', () => {
      const pane = mount()

      pane.dispatch(scroll('down', 0.01, 16, true))

      expect(pane.scrollLines).toHaveBeenCalledWith(1)
    })

    it('does not scroll on a later sample that adds up to less than a line, but carries it over', () => {
      const pane = mount()
      pane.dispatch(scroll('down', 0.2, 16, true))
      pane.scrollLines.mockClear()

      pane.dispatch(scroll('down', 0.2, 4))

      expect(pane.scrollLines).not.toHaveBeenCalled()
    })
  })

  describe('the agent zone speaks keys (005 USE-R6)', () => {
    it('sends the arrow keys for the D-pad', () => {
      const pane = mount()

      pane.dispatch({ kind: 'move-selection', direction: 'up' })
      pane.dispatch({ kind: 'move-selection', direction: 'down' })
      pane.dispatch({ kind: 'move-horizontal', direction: 'left' })
      pane.dispatch({ kind: 'move-horizontal', direction: 'right' })

      expect(pane.sendKey.mock.calls.map(([bytes]) => bytes)).toEqual([
        `${ESC}[A`,
        `${ESC}[B`,
        `${ESC}[D`,
        `${ESC}[C`
      ])
    })

    it('sends Enter for A and Escape for B', () => {
      const pane = mount()

      pane.dispatch({ kind: 'confirm' })
      pane.dispatch({ kind: 'back' })

      expect(pane.sendKey.mock.calls.map(([bytes]) => bytes)).toEqual(['\r', ESC])
    })

    it('says so in its hints, in the words of a keyboard, and lives in the agent zone', () => {
      const pane = mount()

      expect(pane.snapshot().focusedZone).toBe('agent')
      expect(pane.snapshot().labels).toEqual({
        scroll: 'Scroll',
        'move-selection': 'Arrows',
        'move-horizontal': 'Arrows',
        confirm: 'Enter',
        back: 'Esc'
      })
    })
  })

  describe('which pane answers', () => {
    it('registers nothing for a pane nobody is looking at, so it cannot answer for the visible one', () => {
      const pane = mount({ enabled: false })

      expect(pane.answers({ kind: 'confirm' })).toBe(false)
      expect(pane.answers(scroll('down', 1, 16, true))).toBe(false)
      expect(pane.registry.ids()).toEqual([])
    })

    it('starts answering when it becomes the pane on screen, and stops when it is covered', () => {
      const pane = mount({ enabled: false })

      pane.rerender({ enabled: true })
      expect(pane.answers({ kind: 'confirm' })).toBe(true)
      expect(pane.registry.lookup('terminal.escape')).not.toBeNull()

      pane.rerender({ enabled: false })
      expect(pane.answers({ kind: 'confirm' })).toBe(false)
      expect(pane.registry.lookup('terminal.escape')).toBeNull()
    })

    it('reads the latest callbacks at the moment of a press, without re-registering', () => {
      const pane = mount()
      const next = vi.fn()

      pane.rerender({ sendKey: next, scrollLines: vi.fn() })
      pane.dispatch({ kind: 'confirm' })

      expect(next).toHaveBeenCalledWith('\r')
      expect(pane.sendKey).not.toHaveBeenCalled()
    })

    it('keeps its registration across re-renders that change nothing it is identified by', () => {
      const pane = mount()
      const first = pane.registry.lookup('terminal.escape')

      pane.rerender({ sendKey: vi.fn() })
      pane.rerender({ sendKey: vi.fn() })

      expect(pane.registry.lookup('terminal.escape')).toBe(first)
    })
  })

  describe('wheel actions', () => {
    it('sends a control key through the pane’s own key path', () => {
      const pane = mount()

      pane.registry.lookup('terminal.escape')?.run()

      expect(pane.sendKey).toHaveBeenCalledWith(ESC)
    })

    // WHEEL-R7: arbitrary shell stays visible but unfireable until device trials pass.
    it('offers a quick command disabled rather than hidden', () => {
      const pane = mount()

      expect(pane.registry.lookup('terminal.quick.deploy')?.availability).toBe('unavailable')
      expect(pane.registry.lookup('terminal.escape')?.availability).toBe('available')
    })

    it('retracts its actions on unmount', () => {
      const pane = mount()
      act(() => pane.renderer.unmount())

      expect(pane.registry.lookup('terminal.escape')).toBeNull()
    })
  })
})
