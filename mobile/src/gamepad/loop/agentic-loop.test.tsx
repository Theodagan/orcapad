import { createElement, type ReactNode } from 'react'
import { act, create } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import { ControllerProvider, useController } from '../controller-provider'
import type { ControllerIntent, ControllerIntentKind } from '../controller-input/controller-intent'
import type { ControllerReader } from '../controller-input/controller-reader'
import { neutralSample, type ControllerSample } from '../controller-input/controller-sample'
import { createWheelRegistry } from '../wheel/wheel-registry'
import { useAgentControllerBinding } from '../bindings/use-agent-controller-binding'
import { useFileExplorerControllerBinding } from '../bindings/use-file-explorer-controller-binding'
import { useWorkspaceControllerBinding } from '../bindings/use-workspace-controller-binding'
import { usePromptOptionBinding } from '../bindings/use-prompt-option-binding'
import {
  AGENTIC_LOOP,
  unreachableSteps,
  type LoopStepId,
  type SurfaceCapability
} from './agentic-loop'

vi.mock('react-native', () => ({
  StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
  View: 'View'
}))

/**
 * The audit. It probes the real bindings by dispatching each intent and asking whether anything
 * handled it, rather than by reading a declared `accepts` list — a surface that lists an intent
 * and drops it would pass the second check and fail a user.
 */

const PROBED_INTENTS: readonly ControllerIntentKind[] = [
  'confirm',
  'back',
  'scroll',
  'stop',
  'cycle-tab',
  'cycle-workspace',
  'toggle-dictation',
  'move-selection',
  'move-horizontal'
]

/**
 * A representative intent of each kind. Written as a lookup rather than a switch with a default,
 * so a new intent kind is a type error here instead of silently probing as something else.
 */
const PROBE_BY_KIND: {
  readonly [K in ControllerIntentKind]: Extract<ControllerIntent, { kind: K }>
} = {
  confirm: { kind: 'confirm' },
  back: { kind: 'back' },
  stop: { kind: 'stop' },
  'toggle-dictation': { kind: 'toggle-dictation' },
  scroll: { kind: 'scroll', direction: 'down', velocity: 1 },
  'cycle-tab': { kind: 'cycle-tab', direction: 'next' },
  'cycle-workspace': { kind: 'cycle-workspace', direction: 'next' },
  'move-selection': { kind: 'move-selection', direction: 'down' },
  'move-horizontal': { kind: 'move-horizontal', direction: 'right' },
  'wheel-motion': { kind: 'wheel-motion', wheel: 1, x: 0, y: -1 }
}

function fakeReader(): { reader: ControllerReader; publish: (s: ControllerSample) => void } {
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
    publish: (sample) => {
      for (const listener of listeners) {
        listener(sample)
      }
    }
  }
}

/** Mounts one surface and reports what it actually answers for. */
function capabilityOf(Surface: () => ReactNode): SurfaceCapability {
  const { reader, publish } = fakeReader()
  const registry = createWheelRegistry()
  let dispatch: (intent: ControllerIntent) => boolean = () => false

  function Probe(): ReactNode {
    const node = Surface()
    dispatch = useController().dispatchIntent
    return node
  }

  act(() => {
    create(
      createElement(
        ControllerProvider,
        { reader, registerWheelAction: registry.register },
        createElement(Probe)
      )
    )
  })
  // A controller has to be attached before selection-bearing surfaces will answer.
  act(() => publish({ ...neutralSample(0), connected: true }))

  const accepts = new Set<ControllerIntentKind>()
  for (const kind of PROBED_INTENTS) {
    let handled = false
    act(() => {
      handled = dispatch(PROBE_BY_KIND[kind])
    })
    if (handled) {
      accepts.add(kind)
    }
  }

  return { accepts, wheelBindingIds: new Set(registry.ids()) }
}

function workspaceCapability(): SurfaceCapability {
  return capabilityOf(() => {
    useWorkspaceControllerBinding({
      sections: [{ data: [{ worktreeId: 'w1' }, { worktreeId: 'w2' }] }],
      idOf: (row) => row.worktreeId,
      onOpen: vi.fn(),
      onBack: vi.fn(),
      scrollTo: vi.fn()
    })
    return null
  })
}

function agentCapability(): SurfaceCapability {
  return capabilityOf(() => {
    useAgentControllerBinding({
      sessionId: 'wt-1',
      canStop: true,
      onStop: vi.fn(),
      scrollTo: vi.fn(),
      onDetachFromTail: vi.fn(),
      // A prompt is on screen: this is the state the loop's answer step happens in.
      question: { prompt: { itemId: 'q1', expectedRevision: 1 } },
      onCancelPrompt: vi.fn(),
      // Dictation is the primary path; this is the one that works without it.
      onSendText: vi.fn(),
      canSend: true
    })
    return null
  })
}

function filesCapability(): SurfaceCapability {
  return capabilityOf(() => {
    useFileExplorerControllerBinding({
      rows: [{ id: 'a.ts', kind: 'text' as const }],
      idOf: (row) => row.id,
      isExpanded: () => false,
      parentIdOf: () => null,
      onToggleDirectory: vi.fn(),
      onPreviewFile: vi.fn(),
      onRetryDirectory: vi.fn(),
      onCollapseAll: vi.fn(),
      onBack: vi.fn(),
      scrollTo: vi.fn()
    })
    return null
  })
}

/**
 * Answering moved to the prompt card in LOOP-T3, because the card is the only thing that knows
 * what is selected. The audit follows the capability rather than assuming which surface holds it.
 */
function promptCapability(): SurfaceCapability {
  return capabilityOf(() => {
    usePromptOptionBinding({
      promptKey: 'ask:0',
      optionCount: 3,
      onMove: vi.fn(),
      onChoose: vi.fn(),
      onAdvance: vi.fn(),
      onCancel: vi.fn()
    })
    return null
  })
}

function loopCapabilities(): ReadonlyMap<LoopStepId, SurfaceCapability> {
  const workspaces = workspaceCapability()
  const agent = agentCapability()
  const files = filesCapability()
  return new Map<LoopStepId, SurfaceCapability>([
    ['observe', workspaces],
    ['prompt', agent],
    ['interrupt', agent],
    ['answer', promptCapability()],
    ['approve', agent],
    ['read', files]
  ])
}

describe('the agentic loop', () => {
  it('describes a cycle, not a list of surfaces', () => {
    expect(AGENTIC_LOOP.map((step) => step.id)).toEqual([
      'observe',
      'prompt',
      'interrupt',
      'answer',
      'approve',
      'read'
    ])
  })

  // LOOP-T6. This began as a baseline of two known breaks and is now a gate: the loop closes,
  // and a step that stops being reachable fails here rather than on a device.
  it('closes — every step is reachable with a controller alone', () => {
    expect(unreachableSteps(loopCapabilities())).toEqual([])
  })

  it('carries the steps that do work', () => {
    const unreachable = new Set(unreachableSteps(loopCapabilities()))

    for (const id of ['observe', 'prompt', 'interrupt', 'answer', 'approve', 'read']) {
      expect(
        [...unreachable].some((entry) => entry.startsWith(id)),
        id
      ).toBe(false)
    }
  })

  it('treats an unmounted surface as unreachable rather than absent', () => {
    expect(unreachableSteps(new Map())).toHaveLength(AGENTIC_LOOP.length)
  })

  // Any one path carries a step; `reachedBy` is alternatives, not a checklist.
  it('accepts a step reached by only one of its paths', () => {
    const onlyDictation: SurfaceCapability = {
      accepts: new Set<ControllerIntentKind>(['toggle-dictation']),
      wheelBindingIds: new Set()
    }
    const capabilities = new Map(loopCapabilities())
    capabilities.set('prompt', onlyDictation)

    expect(unreachableSteps(capabilities)).toEqual([])
  })
})
