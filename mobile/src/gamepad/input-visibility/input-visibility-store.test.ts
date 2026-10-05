import { describe, expect, it, vi } from 'vitest'
import { createInputVisibilityStore } from './input-visibility-store'

describe('the text-entry strip', () => {
  it('is hidden until something asks for it', () => {
    expect(createInputVisibilityStore().visible()).toBe(false)
  })

  it('opens by itself when a draft appears, and closes once it is gone', () => {
    const store = createInputVisibilityStore()

    store.reportContent(true)
    expect(store.visible()).toBe(true)

    store.reportContent(false)
    expect(store.visible()).toBe(false)
  })

  it('is pinned open by the wheel, and stays open after the draft is sent', () => {
    const store = createInputVisibilityStore()

    store.toggle()
    expect(store.visible()).toBe(true)

    store.reportContent(true)
    store.reportContent(false)
    expect(store.visible()).toBe(true)
  })

  it('puts a strip away on request even while it holds a draft', () => {
    const store = createInputVisibilityStore()
    store.reportContent(true)

    store.toggle()

    expect(store.visible()).toBe(false)
  })

  it('opens again for the next draft after it was put away', () => {
    const store = createInputVisibilityStore()
    store.reportContent(true)
    store.toggle()
    store.reportContent(false)

    store.reportContent(true)

    expect(store.visible()).toBe(true)
  })

  it('does not reopen for the same draft after it was put away', () => {
    const store = createInputVisibilityStore()
    store.reportContent(true)
    store.toggle()

    store.reportContent(true)

    expect(store.visible()).toBe(false)
  })

  it('tells listeners only when what is on screen changes', () => {
    const store = createInputVisibilityStore()
    const listener = vi.fn()
    store.subscribe(listener)

    store.reportContent(false)
    expect(listener).not.toHaveBeenCalled()

    store.reportContent(true)
    store.reportContent(true)
    expect(listener).toHaveBeenCalledTimes(1)

    store.toggle()
    expect(listener).toHaveBeenCalledTimes(2)
  })
})
