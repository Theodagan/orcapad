import { describe, expect, it, vi } from 'vitest'
import {
  createActiveDictationRegistry,
  isDictationActive,
  shouldToggleDictation
} from './active-dictation'
import { dictationActivityOf } from './dictation-activity'

describe('when R3 reaches the existing toggle', () => {
  // `001` §7 step 2: a live microphone is stoppable wherever focus is — including a screen with
  // no text target at all, which is exactly where a user would be stuck otherwise.
  it('always stops something that is running, text target or not', () => {
    for (const activity of ['starting', 'recording', 'processing'] as const) {
      expect(shouldToggleDictation(activity, false), activity).toBe(true)
      expect(shouldToggleDictation(activity, true), activity).toBe(true)
    }
  })

  // Starting with nowhere for the words is a microphone left running for nothing.
  it('starts only where dictated text has somewhere to land', () => {
    expect(shouldToggleDictation('idle', true)).toBe(true)
    expect(shouldToggleDictation('idle', false)).toBe(false)
  })

  it('knows what counts as running', () => {
    expect(isDictationActive('idle')).toBe(false)
    expect(isDictationActive('recording')).toBe(true)
  })
})

describe('dictation activity from the existing status', () => {
  it('passes the hook’s own states through', () => {
    expect(dictationActivityOf('idle')).toBe('idle')
    expect(dictationActivityOf('starting')).toBe('starting')
    expect(dictationActivityOf('recording')).toBe('recording')
    expect(dictationActivityOf('processing')).toBe('processing')
  })

  // A failed session holds no microphone, so R3 should start a new one rather than try to stop
  // something that is not running.
  it('treats an errored session as nothing to stop', () => {
    expect(dictationActivityOf('error')).toBe('idle')
  })
})

describe('active dictation registry', () => {
  it('holds the mounted session and lets it go', () => {
    const registry = createActiveDictationRegistry()
    const dictation = { activity: 'idle' as const, toggle: vi.fn() }

    const retract = registry.register(dictation)
    expect(registry.current()).toBe(dictation)

    retract()
    expect(registry.current()).toBeNull()
  })

  it('does not let a stale cleanup drop the entry that replaced it', () => {
    const registry = createActiveDictationRegistry()
    const first = { activity: 'idle' as const, toggle: vi.fn() }
    const second = { activity: 'recording' as const, toggle: vi.fn() }

    const retractFirst = registry.register(first)
    registry.register(second)
    // A re-render installed `second`; React then runs the previous effect's cleanup.
    retractFirst()

    expect(registry.current()).toBe(second)
  })
})
