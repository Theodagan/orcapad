import { createElement, useState, type ReactNode } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useDraftCaret } from './use-draft-caret'

const pad = vi.hoisted(() => ({ connected: false }))
vi.mock('../gamepad/controller-provider', () => ({
  useControllerBinding: () => ({ connected: pad.connected })
}))

type Seen = {
  text: string
  caret: number
  placement: number
  setText: (text: string) => void
  setCaret: (caret: number) => void
  insertDictation: (transcript: string) => void
}

function Draft({ initial, seen }: { readonly initial: string; readonly seen: Seen }): ReactNode {
  const [text, setText] = useState(initial)
  const draftCaret = useDraftCaret({ scopeKey: 'tab-1', text, setText })
  Object.assign(seen, { text, setText, ...draftCaret })
  return null
}

describe('useDraftCaret', () => {
  let renderer: ReactTestRenderer | null = null
  afterEach(() => {
    act(() => renderer?.unmount())
    renderer = null
    pad.connected = false
  })

  function mount(initial: string): Seen {
    const seen: Seen = {
      text: '',
      caret: 0,
      placement: 0,
      setText: () => {},
      setCaret: () => {},
      insertDictation: () => {}
    }
    act(() => {
      renderer = create(createElement(Draft, { initial, seen }))
    })
    return seen
  }

  it('keeps every phrase dictated before the draft re-renders', () => {
    const seen = mount('hello')
    act(() => {
      seen.insertDictation('one')
      seen.insertDictation('two')
    })
    expect(seen.text).toBe('hello one two')
    expect(seen.caret).toBe('hello one two'.length)
  })

  it('builds on a keystroke that has not rendered yet', () => {
    const seen = mount('hi')
    act(() => {
      seen.setText('hi there')
      seen.insertDictation('friend')
    })
    expect(seen.text).toBe('hi there friend')
  })

  it('chains phrases at the pad caret', () => {
    pad.connected = true
    const seen = mount('abcdef')
    act(() => seen.setCaret(3))
    act(() => {
      seen.insertDictation('x')
      seen.insertDictation('y')
    })
    expect(seen.text).toBe('abc x y def')
    expect(seen.caret).toBe('abc x y '.length)
  })

  it('marks a placement only when dictation moved the caret', () => {
    const seen = mount('abcdef')
    act(() => seen.setCaret(2))
    // A caret past the text is clamped, which is drift, not a placement.
    act(() => seen.setCaret(40))
    expect(seen.caret).toBe(6)
    act(() => seen.setText(''))
    expect(seen.placement).toBe(0)

    act(() => seen.insertDictation('go'))
    expect(seen.placement).toBe(1)
  })
})
