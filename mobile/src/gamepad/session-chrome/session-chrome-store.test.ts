import { describe, expect, it, vi } from 'vitest'
import { createSessionChromeStore } from './session-chrome-store'

describe('session chrome store', () => {
  it('starts with both flags off', () => {
    const store = createSessionChromeStore()
    expect(store.focusMode()).toBe(false)
    expect(store.shortcutsHidden()).toBe(false)
  })

  it('toggleFocusMode flips focus mode', () => {
    const store = createSessionChromeStore()
    store.toggleFocusMode()
    expect(store.focusMode()).toBe(true)
    store.toggleFocusMode()
    expect(store.focusMode()).toBe(false)
  })

  it('toggleShortcuts flips shortcuts hidden', () => {
    const store = createSessionChromeStore()
    store.toggleShortcuts()
    expect(store.shortcutsHidden()).toBe(true)
    store.toggleShortcuts()
    expect(store.shortcutsHidden()).toBe(false)
  })

  it('the two flags are independent', () => {
    const store = createSessionChromeStore()
    store.toggleFocusMode()
    expect(store.shortcutsHidden()).toBe(false)
    store.toggleShortcuts()
    expect(store.focusMode()).toBe(true)
    expect(store.shortcutsHidden()).toBe(true)
  })

  it('reset restores both to false', () => {
    const store = createSessionChromeStore()
    store.toggleFocusMode()
    store.toggleShortcuts()
    store.reset()
    expect(store.focusMode()).toBe(false)
    expect(store.shortcutsHidden()).toBe(false)
  })

  it('reset notifies listeners when state was non-default', () => {
    const store = createSessionChromeStore()
    store.toggleFocusMode()
    const listener = vi.fn()
    store.subscribe(listener)
    store.reset()
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('reset does not notify when state was already default', () => {
    const store = createSessionChromeStore()
    const listener = vi.fn()
    store.subscribe(listener)
    store.reset()
    expect(listener).not.toHaveBeenCalled()
  })

  it('tells listeners when focus mode changes', () => {
    const store = createSessionChromeStore()
    const listener = vi.fn()
    store.subscribe(listener)
    store.toggleFocusMode()
    expect(listener).toHaveBeenCalledTimes(1)
    store.toggleFocusMode()
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('tells listeners when shortcuts hidden changes', () => {
    const store = createSessionChromeStore()
    const listener = vi.fn()
    store.subscribe(listener)
    store.toggleShortcuts()
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('subscribe returns an unsubscribe function', () => {
    const store = createSessionChromeStore()
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)
    unsubscribe()
    store.toggleFocusMode()
    expect(listener).not.toHaveBeenCalled()
  })
})
