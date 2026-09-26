import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { readString } from '../wheel/wheel-product-default-gate'
import {
  BOUND_SURFACES,
  validateControllerBindingEvidence,
  type ControllerBindingEvidence
} from './controller-binding-evidence'

const evidenceRoot = fileURLToPath(
  new URL('../../../../docs/evidence/surface-bindings/', import.meta.url)
)

function observed(surface: (typeof BOUND_SURFACES)[number]) {
  return {
    surface,
    controller: 'Reached the action with the pad.',
    touch: 'Still reachable by tapping.',
    worked: true
  }
}

/** Replaces one surface's observation in place, leaving the other seven intact. */
function withSurface(
  surface: (typeof BOUND_SURFACES)[number],
  overrides: Partial<ReturnType<typeof observed>>
): ControllerBindingEvidence {
  return {
    ...complete,
    observations: complete.observations.map((entry) =>
      entry.surface === surface ? { ...entry, ...overrides } : entry
    )
  }
}

const complete: ControllerBindingEvidence = {
  platform: 'android',
  device: 'Retroid Pocket Flip 2',
  controller: 'built-in',
  build: 'release 1.0.0',
  recordedAt: '2026-01-01',
  terminalWebViewConsumedInput: false,
  observations: BOUND_SURFACES.map(observed)
}

describe('controller binding evidence', () => {
  it('accepts a record covering every bound surface', () => {
    expect(validateControllerBindingEvidence(complete)).toEqual([])
  })

  // The gap this exists to close: a report that covered most of it and called itself done.
  it('names each surface that was not exercised', () => {
    const partial = {
      ...complete,
      observations: complete.observations.filter(
        (entry) => entry.surface !== 'terminal' && entry.surface !== 'dictation'
      )
    }

    expect(validateControllerBindingEvidence(partial)).toEqual(
      expect.arrayContaining(['dictation was not exercised', 'terminal was not exercised'])
    )
  })

  // BIND-AC10 is half the claim; a record that only proves the controller works proves half.
  it('requires the touch column too', () => {
    expect(validateControllerBindingEvidence(withSurface('home', { touch: '' }))).toContain(
      'observations[1].touch is required'
    )
  })

  it('refuses a failure with no description', () => {
    expect(validateControllerBindingEvidence(withSurface('home', { worked: false }))).toContain(
      'observations[1].problem is required when it did not work'
    )
  })

  it('accepts a described failure — a trial that found a bug is still evidence', () => {
    const describedFailure = withSurface('home', {
      worked: false,
      problem: 'B navigated twice on the host list.'
    })

    expect(validateControllerBindingEvidence(describedFailure)).toEqual([])
  })

  // CTRL-T4 left this open and BIND-T6 made either answer safe; the record has to say which.
  it('requires the terminal WebView interception answer', () => {
    const { terminalWebViewConsumedInput: _answer, ...unanswered } = complete

    expect(validateControllerBindingEvidence(unanswered)).toContain(
      'terminalWebViewConsumedInput is required — it is the CTRL-T4 checkpoint'
    )
  })

  it('refuses a platform this fork has not validated', () => {
    expect(validateControllerBindingEvidence({ ...complete, platform: 'ios' })).toEqual(
      expect.arrayContaining([expect.stringContaining('platform must be one of')])
    )
  })

  it('refuses something that is not a record', () => {
    expect(validateControllerBindingEvidence(null)).toEqual(['not a binding evidence record'])
  })
})

/**
 * The gate. BIND-T10 needs a controller-capable device and a person to drive every surface, so
 * the run is outstanding rather than failing — the same position CTRL-T8 and WHEEL-T8 take.
 * Anything filed is validated in full. Delete the `skipIf` to turn this back into a gate.
 */
function recordedEvidence(): { file: string; record: unknown }[] {
  if (!existsSync(evidenceRoot)) {
    return []
  }
  return readdirSync(evidenceRoot)
    .filter((name) => name.endsWith('.json'))
    .map((name) => ({
      file: name,
      record: JSON.parse(readFileSync(join(evidenceRoot, name), 'utf8'))
    }))
}

describe('recorded device validation', () => {
  const filed = recordedEvidence()

  it('validates every record that has been filed', () => {
    for (const { file, record } of filed) {
      expect(validateControllerBindingEvidence(record), file).toEqual([])
    }
  })

  it.skipIf(filed.length === 0)('has been run on every validated platform', () => {
    const platforms = new Set(filed.map(({ record }) => readString(record, 'platform') ?? ''))
    expect(platforms.has('android')).toBe(true)
  })
})
