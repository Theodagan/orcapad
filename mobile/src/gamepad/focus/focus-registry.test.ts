import { describe, expect, it, vi } from 'vitest'
import type { ControllerIntent, ControllerIntentKind } from '../controller-input/controller-intent'
import { createFocusRegistry } from './focus-registry'
import type { FocusTarget } from './focus-target'
import { FOCUS_PRIORITY, type FocusZone } from './focus-zones'

const confirm: ControllerIntent = { kind: 'confirm' }
const back: ControllerIntent = { kind: 'back' }
const scroll: ControllerIntent = { kind: 'scroll', direction: 'down', velocity: 1, elapsedMs: 16 }
const tab: ControllerIntent = { kind: 'cycle-tab', direction: 'next' }
const switchZone: ControllerIntent = { kind: 'switch-zone' }

function target(
  id: string,
  accepts: readonly ControllerIntentKind[] = ['confirm'],
  extra: Partial<FocusTarget> = {}
): FocusTarget {
  return { id, accepts: new Set(accepts), handle: vi.fn(), ...extra }
}

describe('focus registry', () => {
  it('dispatches nothing until a target mounts', () => {
    const registry = createFocusRegistry()

    expect(registry.activeTarget()).toBeNull()
    expect(registry.dispatch(confirm)).toBe(false)
  })

  it('sends an accepted intent to the active target', () => {
    const registry = createFocusRegistry()
    const session = target('session')
    registry.register(session)

    expect(registry.dispatch(confirm)).toBe(true)
    expect(session.handle).toHaveBeenCalledWith(confirm)
  })

  it('leaves an intent nothing accepts alone rather than guessing a fallback', () => {
    const registry = createFocusRegistry()
    const session = target('session', ['confirm'])
    registry.register(session)

    expect(registry.dispatch(back)).toBe(false)
    expect(session.handle).not.toHaveBeenCalled()
  })

  it('activates by id and ignores an id nothing mounted', () => {
    const registry = createFocusRegistry()
    const list = target('list')
    const detail = target('detail')
    registry.register(list)
    registry.register(detail)

    registry.activate('list')
    expect(registry.activeTarget()).toBe(list)

    registry.activate('never-mounted')
    expect(registry.activeTarget()).toBe(list)
  })

  it('never dispatches to an unmounted target', () => {
    const registry = createFocusRegistry()
    const overlay = target('overlay')
    const unregister = registry.register(overlay)

    unregister()
    expect(registry.dispatch(confirm)).toBe(false)
    expect(overlay.handle).not.toHaveBeenCalled()
  })

  it('falls back to the newest remaining mount when the active target leaves', () => {
    const registry = createFocusRegistry()
    const list = target('list')
    const detail = target('detail')
    registry.register(list)
    const closeOverlay = registry.register(detail)

    registry.activate('detail')
    closeOverlay()

    expect(registry.activeTarget()).toBe(list)
  })

  it('gives focus to a newly mounted target among equals, so an inner surface answers for itself', () => {
    const registry = createFocusRegistry()
    registry.register(target('session'))
    const chat = target('chat')
    registry.register(chat)

    expect(registry.activeTarget()).toBe(chat)
  })

  it('does not hand focus to a re-render of an unrelated surface', () => {
    const registry = createFocusRegistry()
    registry.register(target('session'))
    const chat = target('chat')
    registry.register(chat)

    registry.register(target('session'))

    expect(registry.activeTarget()).toBe(chat)
  })

  it('keeps the active target across a re-render that replaces the entry', () => {
    const registry = createFocusRegistry()
    const first = target('session')
    const unregisterFirst = registry.register(first)
    const second = target('session')
    registry.register(second)

    unregisterFirst()

    expect(registry.activeTarget()).toBe(second)
    expect(registry.dispatch(confirm)).toBe(true)
    expect(second.handle).toHaveBeenCalledWith(confirm)
  })

  // React runs a re-rendered effect's cleanup before its setup, so an id leaves and returns in
  // one flush. The old tests registered the replacement first, an order React never produces,
  // which is why a re-render taking focus from a later mount went unseen.
  it('does not let a re-render look like a new mount, in the order React really runs it', () => {
    const registry = createFocusRegistry()
    const session = target('session')
    let unregisterSession = registry.register(session)
    const chat = target('chat')
    registry.register(chat)

    unregisterSession()
    unregisterSession = registry.register(target('session'))

    expect(registry.activeTarget()).toBe(chat)
    expect(unregisterSession).toBeTypeOf('function')
  })
})

describe('who answers first (005 USE-R2)', () => {
  it('prefers a declared priority over arrival, however the effects happened to run', () => {
    const registry = createFocusRegistry()
    const chat = target('chat', ['scroll'], { priority: FOCUS_PRIORITY.surface })
    // The route registers last, because React runs child effects before parents'.
    const session = target('session', ['scroll', 'cycle-tab'], { priority: FOCUS_PRIORITY.screen })
    registry.register(chat)
    registry.register(session)

    registry.dispatch(scroll)

    expect(chat.handle).toHaveBeenCalledWith(scroll)
    expect(session.handle).not.toHaveBeenCalled()
  })

  it('lets an intent fall through to the next target when the first does not accept it', () => {
    const registry = createFocusRegistry()
    const chat = target('chat', ['scroll'], { priority: FOCUS_PRIORITY.surface })
    const session = target('session', ['cycle-tab'], { priority: FOCUS_PRIORITY.screen })
    registry.register(chat)
    registry.register(session)

    expect(registry.dispatch(tab)).toBe(true)
    expect(session.handle).toHaveBeenCalledWith(tab)
    expect(chat.handle).not.toHaveBeenCalled()
  })

  it('answers with the prompt card above the chat above the route, for what each accepts', () => {
    const registry = createFocusRegistry()
    const card = target('card', ['confirm', 'back'], { priority: FOCUS_PRIORITY.card })
    const chat = target('chat', ['scroll', 'back'], { priority: FOCUS_PRIORITY.surface })
    const session = target('session', ['cycle-tab', 'back'], { priority: FOCUS_PRIORITY.screen })
    registry.register(session)
    registry.register(chat)
    registry.register(card)

    registry.dispatch(back)
    registry.dispatch(scroll)
    registry.dispatch(tab)

    expect(card.handle).toHaveBeenCalledWith(back)
    expect(chat.handle).toHaveBeenCalledWith(scroll)
    expect(session.handle).toHaveBeenCalledWith(tab)
    expect(chat.handle).not.toHaveBeenCalledWith(back)
    expect(session.handle).not.toHaveBeenCalledWith(back)
  })

  it('breaks a tie among equals by the newest mount', () => {
    const registry = createFocusRegistry()
    const older = target('older')
    const newer = target('newer')
    registry.register(older)
    registry.register(newer)

    registry.dispatch(confirm)

    expect(newer.handle).toHaveBeenCalled()
    expect(older.handle).not.toHaveBeenCalled()
  })
})

describe('zones (005 USE-R4)', () => {
  const inZone = (id: string, zone: FocusZone, accepts: readonly ControllerIntentKind[]) =>
    target(id, accepts, { zone, priority: FOCUS_PRIORITY.surface })

  function session() {
    const registry = createFocusRegistry()
    const header = inZone('header', 'header', ['confirm', 'back', 'move-horizontal'])
    const agent = inZone('agent', 'agent', ['confirm', 'back', 'scroll', 'move-selection'])
    const shortcuts = inZone('shortcuts', 'shortcuts', ['confirm', 'move-horizontal'])
    const route = target('route', ['cycle-tab', 'back'], { priority: FOCUS_PRIORITY.screen })
    // The order React mounts a session in: the deepest first.
    for (const each of [header, agent, shortcuts, route]) {
      registry.register(each)
    }
    return { registry, header, agent, shortcuts, route }
  }

  it('starts in the agent zone whatever order the zones mounted in', () => {
    const { registry } = session()

    expect(registry.focusedZone()).toBe('agent')
    expect(registry.snapshot().zones).toEqual(['agent', 'shortcuts', 'header'])
  })

  it('walks agent, shortcuts, header and back with X, skipping zones that are not there', () => {
    const { registry } = session()

    registry.dispatch(switchZone)
    expect(registry.focusedZone()).toBe('shortcuts')
    registry.dispatch(switchZone)
    expect(registry.focusedZone()).toBe('header')
    registry.dispatch(switchZone)
    expect(registry.focusedZone()).toBe('agent')
  })

  it('does nothing with one zone, and says so', () => {
    const registry = createFocusRegistry()
    registry.register(inZone('agent', 'agent', ['confirm']))

    expect(registry.dispatch(switchZone)).toBe(false)
    expect(registry.snapshot().nextZone).toBeNull()
    expect(registry.snapshot().reachable.has('switch-zone')).toBe(false)
  })

  it('does nothing on a screen with no zones at all', () => {
    const registry = createFocusRegistry()
    registry.register(target('home'))

    expect(registry.dispatch(switchZone)).toBe(false)
    expect(registry.focusedZone()).toBeNull()
  })

  it('sends A to the focused zone only', () => {
    const { registry, header, agent } = session()

    registry.dispatch(confirm)
    expect(agent.handle).toHaveBeenCalledWith(confirm)

    registry.focusZone('header')
    registry.dispatch(confirm)
    expect(header.handle).toHaveBeenCalledWith(confirm)
    expect(agent.handle).toHaveBeenCalledTimes(1)
  })

  it('lets scroll and tabs reach the right place from every zone', () => {
    const { registry, agent, route } = session()

    for (const zone of ['agent', 'shortcuts', 'header'] as const) {
      registry.focusZone(zone)
      registry.dispatch(scroll)
      registry.dispatch(tab)
    }

    expect(agent.handle).toHaveBeenCalledTimes(3)
    expect(route.handle).toHaveBeenCalledTimes(3)
  })

  it('does not let a mount in another zone take focus', () => {
    const { registry } = session()
    registry.focusZone('header')

    registry.register(inZone('late-agent-card', 'agent', ['confirm']))

    expect(registry.focusedZone()).toBe('header')
  })

  it('falls back to the agent zone when the focused zone goes, and remembers the choice if it returns', () => {
    const registry = createFocusRegistry()
    registry.register(inZone('agent', 'agent', ['confirm']))
    const leave = registry.register(inZone('shortcuts', 'shortcuts', ['confirm']))
    registry.focusZone('shortcuts')

    leave()
    expect(registry.focusedZone()).toBe('agent')

    // A tab switch remounts the zone: the user's choice is still theirs.
    registry.register(inZone('shortcuts', 'shortcuts', ['confirm']))
    expect(registry.focusedZone()).toBe('shortcuts')
  })

  it('forgets the choice once the screen has no zones left, so the next one starts fresh', () => {
    const registry = createFocusRegistry()
    const leaveAgent = registry.register(inZone('agent', 'agent', ['confirm']))
    const leaveHeader = registry.register(inZone('header', 'header', ['confirm']))
    registry.focusZone('header')

    leaveAgent()
    leaveHeader()
    registry.register(inZone('agent', 'agent', ['confirm']))
    registry.register(inZone('header', 'header', ['confirm']))

    expect(registry.focusedZone()).toBe('agent')
  })

  it('activating a target points the controller at its zone', () => {
    const { registry } = session()

    registry.activate('header')

    expect(registry.focusedZone()).toBe('header')
  })
})

describe('what a press can reach (the hint bar)', () => {
  it('is exactly what the focused zone, the screen and the global intents accept', () => {
    const registry = createFocusRegistry()
    registry.register(target('header', ['confirm', 'move-horizontal'], { zone: 'header' }))
    registry.register(target('agent', ['scroll', 'move-selection'], { zone: 'agent' }))
    registry.register(target('route', ['cycle-tab', 'back']))

    registry.focusZone('header')
    const { reachable } = registry.snapshot()

    expect([...reachable].sort()).toEqual(
      ['back', 'confirm', 'cycle-tab', 'move-horizontal', 'scroll', 'switch-zone'].sort()
    )
    // The agent's D-pad is not reachable from the header: A and the arrows belong to the zone.
    expect(reachable.has('move-selection')).toBe(false)
  })

  it('carries the wording of whichever target would answer', () => {
    const registry = createFocusRegistry()
    registry.register(
      target('agent', ['confirm', 'back'], {
        zone: 'agent',
        priority: FOCUS_PRIORITY.surface,
        labels: { confirm: 'Enter', back: 'Esc' }
      })
    )
    registry.register(target('route', ['back'], { labels: { back: 'Leave' } }))

    expect(registry.snapshot().labels).toEqual({ confirm: 'Enter', back: 'Esc' })
  })

  it('is the same object until something changes, and notifies when it does', () => {
    const registry = createFocusRegistry()
    const listener = vi.fn()
    registry.subscribe(listener)
    registry.register(target('agent', ['confirm'], { zone: 'agent' }))
    const first = registry.snapshot()

    expect(registry.snapshot()).toBe(first)
    expect(listener).toHaveBeenCalledTimes(1)

    registry.register(target('shortcuts', ['confirm'], { zone: 'shortcuts' }))
    expect(registry.snapshot()).not.toBe(first)
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('stops notifying after unsubscribe', () => {
    const registry = createFocusRegistry()
    const listener = vi.fn()
    const unsubscribe = registry.subscribe(listener)

    unsubscribe()
    registry.register(target('agent'))

    expect(listener).not.toHaveBeenCalled()
  })
})
