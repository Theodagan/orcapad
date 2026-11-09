import { describe, expect, it } from 'vitest'
import {
  INITIAL_CONNECTION_HISTORY,
  observeConnection,
  shouldWarnAboutDisconnect
} from './controller-connection-notice'

describe('controller connection history', () => {
  it('says nothing on a device that has never had a controller', () => {
    expect(shouldWarnAboutDisconnect(INITIAL_CONNECTION_HISTORY)).toBe(false)

    const stillNone = observeConnection(INITIAL_CONNECTION_HISTORY, false)
    expect(shouldWarnAboutDisconnect(stillNone)).toBe(false)
  })

  it('warns once a pad that was attached goes away', () => {
    const attached = observeConnection(INITIAL_CONNECTION_HISTORY, true)
    const lost = observeConnection(attached, false)

    expect(shouldWarnAboutDisconnect(attached)).toBe(false)
    expect(shouldWarnAboutDisconnect(lost)).toBe(true)
  })

  it('clears the warning when the pad comes back (CTRL-AC6)', () => {
    const lost = observeConnection(observeConnection(INITIAL_CONNECTION_HISTORY, true), false)
    const back = observeConnection(lost, true)

    expect(shouldWarnAboutDisconnect(back)).toBe(false)
  })

  it('keeps the same object when nothing changed, so a render loop cannot start', () => {
    const attached = observeConnection(INITIAL_CONNECTION_HISTORY, true)

    expect(observeConnection(attached, true)).toBe(attached)
    expect(observeConnection(INITIAL_CONNECTION_HISTORY, false)).toBe(INITIAL_CONNECTION_HISTORY)
  })

  it('stays latched across repeated disconnects', () => {
    let history = observeConnection(INITIAL_CONNECTION_HISTORY, true)
    history = observeConnection(history, false)
    history = observeConnection(history, true)
    history = observeConnection(history, false)

    expect(shouldWarnAboutDisconnect(history)).toBe(true)
  })
})
