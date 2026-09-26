import { createElement, type ReactNode } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import { ControllerProvider, useController } from '../controller-provider'
import type { ControllerIntent } from '../controller-input/controller-intent'
import { createWheelRegistry } from '../wheel/wheel-registry'
import {
  useTerminalControllerBinding,
  type TerminalControllerBindingOptions
} from './use-terminal-controller-binding'

vi.mock('react-native', () => ({
  StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
  View: 'View'
}))

const actions = [
  { id: 'terminal.escape', label: 'Esc', send: '\u001b', enabled: true },
  { id: 'terminal.quick.deploy', label: 'Deploy', send: 'deploy\r', enabled: false }
]

function mount(overrides: Partial<TerminalControllerBindingOptions> = {}) {
  const registry = createWheelRegistry()
  const scrollLines = vi.fn()
  const onSend = vi.fn()
  const onBack = vi.fn()
  let dispatch: (intent: ControllerIntent) => boolean = () => false

  function Pane(): ReactNode {
    useTerminalControllerBinding({
      handle: 'h1',
      linesPerScroll: 3,
      scrollLines,
      onSend,
      onBack,
      actions,
      ...overrides
    })
    dispatch = useController().dispatchIntent
    return null
  }

  let renderer: ReactTestRenderer | null = null
  act(() => {
    renderer = create(
      createElement(
        ControllerProvider,
        { registerWheelAction: registry.register },
        createElement(Pane)
      )
    )
  })
  if (renderer === null) {
    throw new Error('renderer did not mount')
  }

  return {
    renderer,
    registry,
    dispatch: (intent: ControllerIntent) => act(() => void dispatch(intent)),
    scrollLines,
    onSend,
    onBack
  }
}

describe('terminal controller binding', () => {
  it('scrolls the scrollback in whole lines, both ways', () => {
    const pane = mount()

    pane.dispatch({ kind: 'scroll', direction: 'down', velocity: 1 })
    expect(pane.scrollLines).toHaveBeenCalledWith(3)

    pane.dispatch({ kind: 'scroll', direction: 'up', velocity: 1 })
    expect(pane.scrollLines).toHaveBeenCalledWith(-3)
  })

  // A light trigger still has to move something, or the bottom of the range does nothing at all.
  it('never asks for less than one line', () => {
    const pane = mount()

    pane.dispatch({ kind: 'scroll', direction: 'down', velocity: 0.01 })

    expect(pane.scrollLines).toHaveBeenCalledWith(1)
  })

  // CTRL-T4's checkpoint: if the WebView already took the event, acting here would double it.
  it('defers to a WebView that consumed the event', () => {
    const pane = mount({
      interception: { consumedByViewTree: true, focusedView: 'RNCWebView' }
    })

    pane.dispatch({ kind: 'scroll', direction: 'down', velocity: 1 })

    expect(pane.scrollLines).not.toHaveBeenCalled()
  })

  it('still scrolls when the focused view took nothing', () => {
    const pane = mount({
      interception: { consumedByViewTree: false, focusedView: 'RNCWebView' }
    })

    pane.dispatch({ kind: 'scroll', direction: 'down', velocity: 1 })

    expect(pane.scrollLines).toHaveBeenCalledTimes(1)
  })

  it('sends a control key through the pane’s own input callback', () => {
    const pane = mount()

    pane.registry.lookup('terminal.escape')?.run()

    expect(pane.onSend).toHaveBeenCalledWith('\u001b')
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
