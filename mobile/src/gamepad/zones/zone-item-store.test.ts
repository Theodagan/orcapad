import { describe, expect, it, vi } from 'vitest'
import type { ControllerIntent } from '../controller-input/controller-intent'
import { createFocusRegistry } from '../focus/focus-registry'
import { createZoneItemStore, type ZoneItemRegistration } from './zone-item-store'
import type { FocusZone } from '../focus/focus-zones'

const right: ControllerIntent = { kind: 'move-horizontal', direction: 'right' }
const left: ControllerIntent = { kind: 'move-horizontal', direction: 'left' }
const down: ControllerIntent = { kind: 'move-selection', direction: 'down' }
const confirm: ControllerIntent = { kind: 'confirm' }
const back: ControllerIntent = { kind: 'back' }
const switchZone: ControllerIntent = { kind: 'switch-zone' }

function setup() {
  const registry = createFocusRegistry()
  const store = createZoneItemStore(registry)
  const activated: string[] = []
  const revealed: string[] = []

  function add(zone: FocusZone, id: string, extra: Partial<ZoneItemRegistration> = {}): () => void {
    return store.register({
      zone,
      id,
      row: 0,
      order: 0,
      disabled: false,
      home: false,
      activate: () => activated.push(id),
      reveal: () => revealed.push(id),
      ...extra
    })
  }
  /** The agent zone, which a session always has beside its header. */
  const mountMain = (zone: 'agent' | 'list') =>
    registry.register({
      id: zone,
      zone,
      accepts: new Set(['confirm']),
      handle: vi.fn()
    })
  const mountAgent = () => mountMain('agent')
  return { registry, store, add, activated, revealed, mountAgent, mountMain }
}

describe('zone item store', () => {
  describe('a zone exists only while it has an item', () => {
    it('registers a navigator for the zone, and withdraws it with the last item', () => {
      const { registry, add } = setup()

      const remove = add('header', 'back')
      expect(registry.snapshot().zones).toEqual(['header'])

      remove()
      expect(registry.snapshot().zones).toEqual([])
    })

    it('does not count a disabled item, so a zone of nothing pressable is not a zone', () => {
      const { registry, add } = setup()

      add('shortcuts', 'paste', { disabled: true })

      expect(registry.snapshot().zones).toEqual([])
    })

    it('appears and goes as an item is enabled and disabled', () => {
      const { registry, add } = setup()
      const remove = add('shortcuts', 'paste', { disabled: true })
      remove()

      add('shortcuts', 'paste', { disabled: false })

      expect(registry.snapshot().zones).toEqual(['shortcuts'])
    })
  })

  describe('the cursor', () => {
    it('starts at the home item, wherever it sits in the row', () => {
      const { store, add, registry } = setup()
      add('header', 'a', { order: 0 })
      add('header', 'b', { order: 1, home: true })
      add('header', 'c', { order: 2 })
      registry.focusZone('header')

      expect(store.selectedId('header')).toBe('b')
      expect(store.isFocused('header', 'b')).toBe(true)
      expect(store.isFocused('header', 'a')).toBe(false)
    })

    it('is focused only while the pad is pointed at that zone', () => {
      const { store, add, registry, mountAgent } = setup()
      mountAgent()
      add('header', 'a', { home: true })

      expect(registry.focusedZone()).toBe('agent')
      expect(store.isFocused('header', 'a')).toBe(false)

      registry.dispatch(switchZone)
      expect(store.isFocused('header', 'a')).toBe(true)
    })

    it('moves with the D-pad, reveals what it lands on, and stops at the ends', () => {
      const { store, add, registry, revealed } = setup()
      add('header', 'a', { order: 0, home: true })
      add('header', 'b', { order: 1 })
      registry.focusZone('header')

      registry.dispatch(right)
      expect(store.selectedId('header')).toBe('b')
      expect(revealed).toEqual(['b'])

      registry.dispatch(right)
      expect(store.selectedId('header')).toBe('b')
      expect(revealed).toEqual(['b'])
    })

    it('moves between rows with up and down', () => {
      const { store, add, registry } = setup()
      add('header', 'back', { row: 0, order: 0, home: true })
      add('header', 'tab', { row: 1, order: 0 })
      registry.focusZone('header')

      registry.dispatch(down)

      expect(store.selectedId('header')).toBe('tab')
    })

    it('wraps along the shortcut keys, which are one long row', () => {
      const { store, add, registry } = setup()
      add('shortcuts', 'esc', { order: 0 })
      add('shortcuts', 'tab', { order: 1 })
      registry.focusZone('shortcuts')

      registry.dispatch(left)

      expect(store.selectedId('shortcuts')).toBe('tab')
    })

    it('skips an item that is disabled', () => {
      const { store, add, registry } = setup()
      add('shortcuts', 'a', { order: 0 })
      add('shortcuts', 'b', { order: 1, disabled: true })
      add('shortcuts', 'c', { order: 2 })
      registry.focusZone('shortcuts')

      registry.dispatch(right)

      expect(store.selectedId('shortcuts')).toBe('c')
    })

    it('falls back when the selected item goes', () => {
      const { store, add, registry } = setup()
      add('shortcuts', 'a', { order: 0 })
      const removeB = add('shortcuts', 'b', { order: 1 })
      registry.focusZone('shortcuts')
      registry.dispatch(right)
      expect(store.selectedId('shortcuts')).toBe('b')

      removeB()

      expect(store.selectedId('shortcuts')).toBe('a')
    })
  })

  describe('pressing and leaving', () => {
    it('A presses the selected item, once', () => {
      const { add, registry, activated } = setup()
      add('shortcuts', 'esc', { order: 0 })
      add('shortcuts', 'tab', { order: 1 })
      registry.focusZone('shortcuts')
      registry.dispatch(right)

      registry.dispatch(confirm)

      expect(activated).toEqual(['tab'])
    })

    it('presses nothing when every item is disabled', () => {
      const { add, registry, activated } = setup()
      add('shortcuts', 'esc', { disabled: true })

      registry.dispatch(confirm)

      expect(activated).toEqual([])
    })

    it('B goes back to the agent zone', () => {
      const { add, registry, mountAgent } = setup()
      mountAgent()
      add('header', 'a', { home: true })
      registry.focusZone('header')

      expect(registry.dispatch(back)).toBe(true)
      expect(registry.focusedZone()).toBe('agent')
    })

    it('B is not this zone’s to answer when there is no agent to go back to, so it falls through', () => {
      const { add, registry } = setup()
      const leave = vi.fn()
      registry.register({ id: 'route', accepts: new Set(['back']), handle: leave })
      add('header', 'a', { home: true })

      registry.dispatch(back)

      expect(leave).toHaveBeenCalledTimes(1)
    })
  })

  describe('entering a zone', () => {
    it('starts the header from its home again each time, and remembers the shortcut cursor', () => {
      const { store, add, registry, mountAgent } = setup()
      mountAgent()
      add('header', 'a', { order: 0, home: true })
      add('header', 'b', { order: 1 })
      add('shortcuts', 'esc', { order: 0 })
      add('shortcuts', 'tab', { order: 1 })

      registry.focusZone('header')
      registry.dispatch(right)
      expect(store.selectedId('header')).toBe('b')
      registry.focusZone('shortcuts')
      registry.dispatch(right)
      registry.focusZone('agent')

      registry.focusZone('header')
      expect(store.selectedId('header')).toBe('a')
      registry.focusZone('shortcuts')
      expect(store.selectedId('shortcuts')).toBe('tab')
    })
  })

  it('notifies when the cursor or the focused zone moves, and not otherwise', () => {
    const { store, add, registry, mountAgent } = setup()
    mountAgent()
    add('header', 'a', { order: 0, home: true })
    add('header', 'b', { order: 1 })
    const listener = vi.fn()
    store.subscribe(listener)

    registry.dispatch(switchZone)
    const afterEntering = listener.mock.calls.length
    registry.dispatch(right)

    expect(afterEntering).toBeGreaterThan(0)
    expect(listener.mock.calls.length).toBeGreaterThan(afterEntering)
  })

  it('says in the hint bar’s words what A and B do here', () => {
    const { add, registry, mountAgent } = setup()
    mountAgent()
    add('header', 'a', { home: true })
    registry.focusZone('header')

    expect(registry.snapshot().labels).toMatchObject({ confirm: 'Open', back: 'Agent' })
  })

  it('names the list, not the agent, where a list screen has a header', () => {
    const { add, registry, mountMain } = setup()
    mountMain('list')
    add('header', 'a', { home: true })
    registry.focusZone('header')

    expect(registry.snapshot().labels.back).toBe('List')
  })

  it('B goes back to the list on a list screen', () => {
    const { add, registry, mountMain } = setup()
    mountMain('list')
    add('header', 'a', { home: true })
    registry.focusZone('header')

    expect(registry.dispatch(back)).toBe(true)
    expect(registry.focusedZone()).toBe('list')
  })

  it('leaves B unlabelled when there is nothing to go back to, so the bar says plain Back', () => {
    const { add, registry } = setup()
    add('header', 'a', { home: true })

    expect(registry.snapshot().labels.back).toBeUndefined()
  })
})
