import { createElement, type ReactNode } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ControllerIntent, ControllerIntentKind } from '../controller-input/controller-intent'
import { useWheelController, type WheelController } from './use-wheel-controller'
import { loadPreset, type WheelPresetDefinition } from './wheel-preset'
import { createWheelRegistry, type WheelMenuEntry, type WheelRegistry } from './wheel-registry'

vi.mock('react-native', () => ({
  StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
  Text: 'Text',
  View: 'View'
}))

const TRIAL = {
  trialId: 'trial',
  targetDevice: 'any',
  controller: 'any',
  destructivePolicy: 'includes-destructive',
  notes: 'test'
} as const

/** North opens a menu, east runs an action, so one preset can exercise both paths. */
const preset: WheelPresetDefinition = loadPreset({
  presetId: 'test',
  label: 'Test',
  wheel: 1,
  contractual: false,
  trial: TRIAL,
  segments: [
    { id: 'menu', label: 'Menu', centerAngle: 0, halfWidth: Math.PI / 4, bindingId: 'test.menu' },
    {
      id: 'act',
      label: 'Act',
      centerAngle: Math.PI / 2,
      halfWidth: Math.PI / 4,
      bindingId: 'test.act'
    }
  ]
})

const UP: ControllerIntent = { kind: 'wheel-motion', wheel: 1, x: 0, y: -1 }
const RIGHT: ControllerIntent = { kind: 'wheel-motion', wheel: 1, x: 1, y: 0 }
const CENTRE: ControllerIntent = { kind: 'wheel-motion', wheel: 1, x: 0, y: 0 }
const CONFIRM: ControllerIntent = { kind: 'confirm' }
const BACK: ControllerIntent = { kind: 'back' }

/** One of every intent a pad can send, so "takes everything" is a loop and not a list of examples. */
const EVERY_INTENT: Record<ControllerIntentKind, ControllerIntent> = {
  scroll: { kind: 'scroll', direction: 'down', velocity: 1, elapsedMs: 16, begins: true },
  'cycle-tab': { kind: 'cycle-tab', direction: 'next' },
  'cycle-workspace': { kind: 'cycle-workspace', direction: 'next' },
  'wheel-motion': { kind: 'wheel-motion', wheel: 2, x: 0, y: 1 },
  'switch-zone': { kind: 'switch-zone' },
  confirm: { kind: 'confirm' },
  back: { kind: 'back' },
  'toggle-dictation': { kind: 'toggle-dictation' },
  'move-selection': { kind: 'move-selection', direction: 'down' },
  'move-horizontal': { kind: 'move-horizontal', direction: 'right' }
}

const entry = (id: string, run = vi.fn()): WheelMenuEntry => ({
  id,
  label: id,
  availability: 'available',
  run
})

function Harness({
  registry,
  onController,
  onOpenChange
}: {
  readonly registry: WheelRegistry
  readonly onController: (controller: WheelController) => void
  readonly onOpenChange?: (open: boolean) => void
}): ReactNode {
  onController(
    useWheelController({ presets: { 1: preset }, registry, deadZone: 0.2, onOpenChange })
  )
  return null
}

describe('wheel controller', () => {
  let renderer: ReactTestRenderer | null = null
  afterEach(() => {
    act(() => renderer?.unmount())
    renderer = null
  })

  function mount(registry: WheelRegistry, onOpenChange?: (open: boolean) => void) {
    let current: WheelController | null = null
    act(() => {
      renderer = create(
        createElement(Harness, {
          registry,
          onOpenChange,
          onController: (controller) => (current = controller)
        })
      )
    })
    return {
      /** Always the latest render's controller. */
      get wheel(): WheelController {
        if (current === null) {
          throw new Error('not mounted')
        }
        return current
      },
      send: (intent: ControllerIntent) => act(() => void current?.intercept(intent))
    }
  }

  describe('while a wheel is open it takes every input (005 USE-R11)', () => {
    /** Reopens before each intent, since A and B end the wheel they are probing. */
    function eachIntentWhileOpen(open: () => void, probe: (intent: ControllerIntent) => boolean) {
      for (const intent of Object.values(EVERY_INTENT)) {
        open()
        expect(probe(intent), intent.kind).toBe(true)
      }
    }

    it('swallows every intent kind, so nothing reaches a surface', () => {
      const pad = mount(createWheelRegistry())

      eachIntentWhileOpen(
        () => {
          pad.send(CENTRE)
          pad.send(UP)
        },
        (intent) => pad.wheel.intercept(intent)
      )
    })

    it('lets every other intent through while it is closed', () => {
      const pad = mount(createWheelRegistry())

      for (const intent of Object.values(EVERY_INTENT)) {
        if (intent.kind !== 'wheel-motion') {
          expect(pad.wheel.intercept(intent), intent.kind).toBe(false)
        }
      }
    })

    it('still takes everything inside a menu', () => {
      const registry = createWheelRegistry()
      registry.register({
        id: 'test.menu',
        label: 'Menu',
        availability: 'available',
        menu: () => [entry('a'), entry('b')]
      })
      const pad = mount(registry)

      eachIntentWhileOpen(
        () => {
          pad.send(CENTRE)
          pad.send(UP)
          pad.send(CONFIRM)
        },
        (intent) => pad.wheel.intercept(intent)
      )
    })

    it('does not let the other stick through, nor let it open a second wheel', () => {
      const pad = mount(createWheelRegistry())
      pad.send(UP)

      expect(pad.wheel.intercept({ kind: 'wheel-motion', wheel: 2, x: 0, y: 1 })).toBe(true)
      expect(pad.wheel.view.state).toMatchObject({ kind: 'open', wheel: 1 })
    })

    it('reports open and closed to the resolver, and to the native layer when it changes', () => {
      const onOpenChange = vi.fn()
      const pad = mount(createWheelRegistry(), onOpenChange)
      expect(pad.wheel.isOpen()).toBe(false)

      pad.send(UP)
      expect(pad.wheel.isOpen()).toBe(true)
      pad.send(CENTRE)
      expect(pad.wheel.isOpen()).toBe(false)

      expect(onOpenChange.mock.calls).toEqual([[true], [false]])
    })

    it('tells the native layer once per open, not once per sample', () => {
      const onOpenChange = vi.fn()
      const pad = mount(createWheelRegistry(), onOpenChange)

      pad.send(UP)
      pad.send(RIGHT)
      pad.send(UP)

      expect(onOpenChange).toHaveBeenCalledTimes(1)
    })

    it('lets go of the native layer if it unmounts while open', () => {
      const onOpenChange = vi.fn()
      const pad = mount(createWheelRegistry(), onOpenChange)
      pad.send(UP)

      act(() => renderer?.unmount())
      renderer = null

      expect(onOpenChange).toHaveBeenLastCalledWith(false)
    })
  })

  describe('a spent wheel', () => {
    it('does not reopen from a held stick after A, and opens again once the stick has centred', () => {
      const registry = createWheelRegistry()
      const run = vi.fn()
      registry.register({ id: 'test.act', label: 'Act', availability: 'available', run })
      const pad = mount(registry)

      pad.send(RIGHT)
      pad.send(CONFIRM)
      expect(run).toHaveBeenCalledTimes(1)

      pad.send({ kind: 'wheel-motion', wheel: 1, x: 0.95, y: 0.05 })
      pad.send(RIGHT)
      expect(pad.wheel.isOpen()).toBe(false)

      pad.send(CENTRE)
      pad.send(RIGHT)
      expect(pad.wheel.isOpen()).toBe(true)
    })

    it('lets B close a wheel that the stick is still holding open', () => {
      const pad = mount(createWheelRegistry())
      pad.send(UP)

      pad.send(BACK)
      pad.send(UP)

      expect(pad.wheel.isOpen()).toBe(false)
    })
  })

  describe('menus', () => {
    function withMenu(menu: () => Promise<readonly WheelMenuEntry[]> | readonly WheelMenuEntry[]) {
      const registry = createWheelRegistry()
      registry.register({ id: 'test.menu', label: 'Launch', availability: 'available', menu })
      return { registry, pad: mount(registry) }
    }

    it('shows a menu segment as one that opens, not one that runs', () => {
      const { pad } = withMenu(() => [])
      pad.send(UP)

      expect(pad.wheel.view.segments.find((segment) => segment.id === 'menu')?.opens).toBe(true)
    })

    it('opens a second wheel of the entries on A, and runs nothing', () => {
      const first = entry('claude')
      const { pad } = withMenu(() => [first, entry('codex')])
      pad.send(UP)
      pad.send(CONFIRM)

      expect(pad.wheel.view.segments.map((segment) => segment.id)).toEqual(['claude', 'codex'])
      expect(pad.wheel.view.title).toBe('Launch')
      expect(first.run).not.toHaveBeenCalled()
    })

    it('locks from where the stick already is, so the highlight does not wait for a nudge', () => {
      const { pad } = withMenu(() => [entry('claude'), entry('codex')])
      pad.send(UP)
      pad.send(CONFIRM)

      expect(pad.wheel.view.state).toMatchObject({ locked: 'claude' })
    })

    it('commits an entry on A: runs it once and closes', () => {
      const claude = entry('claude')
      const { pad } = withMenu(() => [claude, entry('codex')])
      pad.send(UP)
      pad.send(CONFIRM)
      pad.send(CONFIRM)

      expect(claude.run).toHaveBeenCalledTimes(1)
      expect(pad.wheel.isOpen()).toBe(false)
    })

    it('loads asynchronously: says so while it waits, then shows the entries', async () => {
      let resolve: (entries: readonly WheelMenuEntry[]) => void = () => {}
      const { pad } = withMenu(
        () => new Promise<readonly WheelMenuEntry[]>((done) => (resolve = done))
      )
      pad.send(UP)
      pad.send(CONFIRM)

      expect(pad.wheel.view.message).toBe('Loading…')
      expect(pad.wheel.view.segments).toEqual([])

      await act(async () => resolve([entry('claude')]))

      expect(pad.wheel.view.message).toBeNull()
      expect(pad.wheel.view.segments.map((segment) => segment.id)).toEqual(['claude'])
      expect(pad.wheel.view.state).toMatchObject({ locked: 'claude' })
    })

    it('does not cancel while it loads, however much the stick moves', () => {
      const { pad } = withMenu(() => new Promise<readonly WheelMenuEntry[]>(() => {}))
      pad.send(UP)
      pad.send(CONFIRM)

      pad.send({ kind: 'wheel-motion', wheel: 1, x: 0.4, y: -0.9 })
      pad.send(RIGHT)

      expect(pad.wheel.isOpen()).toBe(true)
    })

    it('commits nothing while loading: A cancels', () => {
      const { pad } = withMenu(() => new Promise<readonly WheelMenuEntry[]>(() => {}))
      pad.send(UP)
      pad.send(CONFIRM)
      pad.send(CONFIRM)

      expect(pad.wheel.isOpen()).toBe(false)
    })

    it('says so when the list fails, or is empty, and offers nothing to commit', async () => {
      const failing = withMenu(() => Promise.reject(new Error('host said no')))
      failing.pad.send(UP)
      failing.pad.send(CONFIRM)
      await act(async () => {})
      expect(failing.pad.wheel.view.message).toBe('Could not load')
      act(() => renderer?.unmount())

      const empty = withMenu(() => [])
      empty.pad.send(UP)
      empty.pad.send(CONFIRM)
      expect(empty.pad.wheel.view.message).toBe('Nothing here')
      expect(empty.pad.wheel.view.segments).toEqual([])
    })

    it('steps back to the wheel on B, and closes on the next B', () => {
      const { pad } = withMenu(() => [entry('claude')])
      pad.send(UP)
      pad.send(CONFIRM)

      pad.send(BACK)
      expect(pad.wheel.view.state).toMatchObject({ kind: 'open', path: [] })
      expect(pad.wheel.view.segments.map((segment) => segment.id)).toEqual(['menu', 'act'])

      pad.send(BACK)
      expect(pad.wheel.isOpen()).toBe(false)
    })

    it('rebuilds the list each time it opens, so it is what is true now', () => {
      let agents = [entry('claude')]
      const { pad } = withMenu(() => agents)
      pad.send(UP)
      pad.send(CONFIRM)
      expect(pad.wheel.view.segments).toHaveLength(1)
      pad.send(BACK)
      pad.send(BACK)
      pad.send(CENTRE)

      agents = [entry('claude'), entry('codex')]
      pad.send(UP)
      pad.send(CONFIRM)

      expect(pad.wheel.view.segments).toHaveLength(2)
    })

    it('pages a long list: More opens the next page, and B comes back a page', () => {
      const many = Array.from({ length: 12 }, (_, index) => entry(`e${index}`))
      const { pad } = withMenu(() => many)
      pad.send(UP)
      pad.send(CONFIRM)
      expect(pad.wheel.view.segments).toHaveLength(8)

      // The stick points at More, the eighth of eight, which sits seven eighths round the dial.
      const angle = (7 / 8) * Math.PI * 2
      pad.send({
        kind: 'wheel-motion',
        wheel: 1,
        x: Math.sin(angle),
        y: -Math.cos(angle)
      })
      expect(pad.wheel.view.state).toMatchObject({ locked: '__more' })
      pad.send(CONFIRM)
      expect(pad.wheel.view.segments.map((segment) => segment.id)).toEqual([
        'e7',
        'e8',
        'e9',
        'e10',
        'e11'
      ])

      pad.send(BACK)
      expect(pad.wheel.view.segments).toHaveLength(8)
    })

    it('runs a committed entry only through the menu it came from', () => {
      const run = vi.fn()
      const { registry, pad } = withMenu(() => [entry('act', run)])
      // An action registered under the entry's own name must not be what a menu commit reaches.
      const decoy = vi.fn()
      registry.register({ id: 'act', label: 'Decoy', availability: 'available', run: decoy })
      pad.send(UP)
      pad.send(CONFIRM)
      pad.send(CONFIRM)

      expect(run).toHaveBeenCalledTimes(1)
      expect(decoy).not.toHaveBeenCalled()
    })
  })
})
