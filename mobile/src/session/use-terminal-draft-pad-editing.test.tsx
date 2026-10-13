import { createElement, useState, type ReactNode } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSurfaceBinding } from '../gamepad/bindings/use-surface-binding'
import { focusTargetFor } from '../gamepad/bindings/surface-binding'
import type { ControllerIntent } from '../gamepad/controller-input/controller-intent'
import type { ControllerReader } from '../gamepad/controller-input/controller-reader'
import { neutralSample, type ControllerSample } from '../gamepad/controller-input/controller-sample'
import { ControllerProvider, useController } from '../gamepad/controller-provider'
import { FOCUS_PRIORITY } from '../gamepad/focus/focus-zones'
import { useTerminalDraftPadEditing } from './use-terminal-draft-pad-editing'

/**
 * `005` USE-R17 in a terminal: while the command field holds a draft, the D-pad, `B` and `A` edit and
 * send that draft instead of reaching the terminal behind it, which would move the TUI's cursor,
 * delete in its prompt and press Enter with the draft left unsent.
 */

vi.mock('react-native', () => ({
  StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
  View: 'View'
}))

/** The terminal's own binding: arrows, Enter and Ctrl+W to the agent. */
function Terminal({ sent }: { readonly sent: string[] }): ReactNode {
  useSurfaceBinding({
    focusTarget: {
      ...focusTargetFor('terminal:t1', [
        ['move-horizontal', () => void sent.push('arrow')],
        ['move-selection', () => void sent.push('arrow')],
        ['confirm', () => void sent.push('enter')],
        ['back', () => void sent.push('ctrl-w')]
      ]),
      zone: 'agent',
      priority: FOCUS_PRIORITY.surface
    },
    wheelActions: []
  })
  return null
}

type Seen = { draft: string; caret: number; caretMode: boolean }

function Field(props: {
  readonly initial: string
  readonly available: boolean
  readonly onSend: () => void
  readonly seen: Seen
}): ReactNode {
  const [draft, setDraft] = useState(props.initial)
  const [caret, setCaret] = useState(props.initial.length)
  const editing = useTerminalDraftPadEditing({
    handle: 't1',
    draft,
    setDraft,
    caret,
    setCaret,
    available: props.available,
    canSend: true,
    onSend: props.onSend,
    keyboardRequested: false
  })
  Object.assign(props.seen, { draft, caret, caretMode: editing.caretMode })
  return null
}

function fakeReader(): { reader: ControllerReader; publish: (sample: ControllerSample) => void } {
  const listeners = new Set<(sample: ControllerSample) => void>()
  return {
    reader: {
      support: () => 'available',
      current: () => neutralSample(0),
      subscribe: (listener) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      }
    },
    publish: (sample) => listeners.forEach((listener) => listener(sample))
  }
}

describe('editing a terminal command draft with the pad', () => {
  let renderer: ReactTestRenderer | null = null
  afterEach(() => {
    act(() => renderer?.unmount())
    renderer = null
  })

  function mount(options: { initial: string; available?: boolean; padAttached?: boolean }) {
    const sent: string[] = []
    const onSend = vi.fn()
    const seen: Seen = { draft: '', caret: 0, caretMode: false }
    const { reader, publish } = fakeReader()
    const held: { controller: ReturnType<typeof useController> | null } = { controller: null }
    function Probe(): ReactNode {
      held.controller = useController()
      return null
    }
    act(() => {
      renderer = create(
        createElement(
          ControllerProvider,
          { reader },
          createElement(Probe),
          createElement(Terminal, { sent }),
          createElement(Field, {
            initial: options.initial,
            available: options.available ?? true,
            onSend,
            seen
          })
        )
      )
    })
    if (options.padAttached !== false) {
      act(() => publish(neutralSample(1, true)))
    }
    const press = (intent: ControllerIntent): void => {
      act(() => void held.controller?.dispatchIntent(intent))
    }
    return { sent, onSend, seen, press }
  }

  it('moves the caret and deletes a word in the draft, not in the terminal', () => {
    const { sent, seen, press } = mount({ initial: 'git commit all' })

    press({ kind: 'move-horizontal', direction: 'left' })
    press({ kind: 'move-horizontal', direction: 'left' })
    press({ kind: 'move-horizontal', direction: 'left' })
    press({ kind: 'move-horizontal', direction: 'left' })
    expect(seen.caret).toBe('git commit'.length)

    press({ kind: 'back' })
    expect(seen.draft).toBe('git  all')
    expect(seen.caret).toBe('git '.length)
    expect(sent).toEqual([])
  })

  it('keeps B on the draft when the caret has nothing before it', () => {
    const { sent, seen, press } = mount({ initial: 'ls' })

    press({ kind: 'move-selection', direction: 'up' })
    press({ kind: 'back' })

    expect(seen.draft).toBe('ls')
    expect(sent).toEqual([])
  })

  it('sends the draft with A instead of pressing Enter in the terminal', () => {
    const { sent, onSend, press } = mount({ initial: 'npm test' })

    press({ kind: 'confirm' })

    expect(onSend).toHaveBeenCalledTimes(1)
    expect(sent).toEqual([])
  })

  it('leaves the pad to the terminal when the draft is empty or the field is hidden', () => {
    const empty = mount({ initial: '' })
    empty.press({ kind: 'move-selection', direction: 'up' })
    empty.press({ kind: 'confirm' })
    expect(empty.sent).toEqual(['arrow', 'enter'])
    act(() => renderer?.unmount())

    const hidden = mount({ initial: 'echo hi', available: false })
    hidden.press({ kind: 'back' })
    expect(hidden.sent).toEqual(['ctrl-w'])
    expect(hidden.seen.draft).toBe('echo hi')
  })

  it('has no caret without a pad', () => {
    const { seen } = mount({ initial: 'pwd', padAttached: false })

    expect(seen.caretMode).toBe(false)
  })
})
