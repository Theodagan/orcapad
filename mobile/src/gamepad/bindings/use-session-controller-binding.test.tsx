import { createElement, type ReactNode } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import { ControllerProvider, useController } from '../controller-provider'
import type { ControllerIntent } from '../controller-input/controller-intent'
import { useSessionControllerBinding } from './use-session-controller-binding'

vi.mock('react-native', () => ({
  StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
  View: 'View'
}))

type Tab = { readonly id: string }
const idOf = (tab: Tab): string => tab.id
const tabs: readonly Tab[] = [{ id: 'terminal' }, { id: 'agent' }, { id: 'diff' }]

function mount(rows: readonly Tab[] = tabs, activeTabId: string | null = 'terminal') {
  const onSwitchTab = vi.fn()
  const onBack = vi.fn()
  let dispatch: (intent: ControllerIntent) => boolean = () => false

  function Session(): ReactNode {
    useSessionControllerBinding({
      sessionId: 'wt-1',
      tabs: rows,
      idOf,
      activeTabId,
      onSwitchTab,
      onBack
    })
    dispatch = useController().dispatchIntent
    return null
  }

  let renderer: ReactTestRenderer | null = null
  act(() => {
    renderer = create(createElement(ControllerProvider, {}, createElement(Session)))
  })
  if (renderer === null) {
    throw new Error('renderer did not mount')
  }

  return {
    renderer,
    dispatch: (intent: ControllerIntent) => act(() => void dispatch(intent)),
    onSwitchTab,
    onBack
  }
}

describe('session controller binding', () => {
  it('activates the next tab through the existing handover, once', () => {
    const session = mount()

    session.dispatch({ kind: 'cycle-tab', direction: 'next' })

    expect(session.onSwitchTab).toHaveBeenCalledTimes(1)
    expect(session.onSwitchTab).toHaveBeenCalledWith({ id: 'agent' })
  })

  it('goes the other way too', () => {
    const session = mount(tabs, 'agent')

    session.dispatch({ kind: 'cycle-tab', direction: 'previous' })

    expect(session.onSwitchTab).toHaveBeenCalledWith({ id: 'terminal' })
  })

  // A ring, not a column: LB/RB means the same thing here as everywhere else a person has met it.
  it('wraps at both ends', () => {
    expect(mountAndCycle(tabs, 'diff', 'next')).toEqual({ id: 'terminal' })
    expect(mountAndCycle(tabs, 'terminal', 'previous')).toEqual({ id: 'diff' })
  })

  function mountAndCycle(
    rows: readonly Tab[],
    activeTabId: string,
    direction: 'previous' | 'next'
  ): Tab | undefined {
    const session = mount(rows, activeTabId)
    session.dispatch({ kind: 'cycle-tab', direction })
    return session.onSwitchTab.mock.calls[0]?.[0]
  }

  // Switching to the tab already active would replay a subscription handover for nothing.
  it('does not re-activate the only tab there is', () => {
    const session = mount([{ id: 'terminal' }], 'terminal')

    session.dispatch({ kind: 'cycle-tab', direction: 'next' })

    expect(session.onSwitchTab).not.toHaveBeenCalled()
  })

  it('lands somewhere when no tab is active yet', () => {
    const session = mount(tabs, null)

    session.dispatch({ kind: 'cycle-tab', direction: 'next' })

    expect(session.onSwitchTab).toHaveBeenCalledWith({ id: 'terminal' })
  })

  it('switches nothing when the session has no tabs', () => {
    const session = mount([], null)

    session.dispatch({ kind: 'cycle-tab', direction: 'next' })

    expect(session.onSwitchTab).not.toHaveBeenCalled()
  })

  it('leaves through the route’s own back', () => {
    const session = mount()

    session.dispatch({ kind: 'back' })

    expect(session.onBack).toHaveBeenCalledTimes(1)
  })

  it('stops receiving intents once unmounted', () => {
    const session = mount()
    act(() => session.renderer.unmount())

    session.dispatch({ kind: 'cycle-tab', direction: 'next' })

    expect(session.onSwitchTab).not.toHaveBeenCalled()
  })
})
