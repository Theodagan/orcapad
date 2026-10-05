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

  describe('asking for the keyboard', () => {
    it('puts the strip up for as long as the keyboard is wanted, and takes it away after', () => {
      const store = createInputVisibilityStore()

      store.beginTyping()
      expect(store.visible()).toBe(true)
      expect(store.typing()).toBe(true)

      store.endTyping()
      expect(store.visible()).toBe(false)
      expect(store.typing()).toBe(false)
    })

    it('beats a strip that was put away, and leaves a pinned strip pinned', () => {
      const store = createInputVisibilityStore()
      store.reportContent(true)
      store.toggle()
      expect(store.visible()).toBe(false)

      store.beginTyping()
      expect(store.visible()).toBe(true)
      store.endTyping()
      expect(store.visible()).toBe(false)

      store.toggle()
      store.beginTyping()
      store.endTyping()
      expect(store.visible()).toBe(true)
    })

    it('tells listeners of each change of the request, even when the strip was up already', () => {
      const store = createInputVisibilityStore()
      store.toggle()
      const listener = vi.fn()
      store.subscribe(listener)

      store.beginTyping()
      store.beginTyping()
      expect(listener).toHaveBeenCalledTimes(1)

      store.endTyping()
      store.endTyping()
      expect(listener).toHaveBeenCalledTimes(2)
    })
  })
})
