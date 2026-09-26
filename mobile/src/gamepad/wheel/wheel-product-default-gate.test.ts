import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { extname, join, relative } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import {
  readString,
  unapprovedProductDefaults,
  validateProductDefaultDecision
} from './wheel-product-default-gate'

const mobileRoot = fileURLToPath(new URL('../../..', import.meta.url))
const experimentsRoot = join(mobileRoot, 'src', 'gamepad', 'wheel', 'experiments')
const decisionsRoot = fileURLToPath(
  new URL('../../../../docs/decisions/context-wheel/', import.meta.url)
)

const decision = {
  presetId: 'explorer-actions',
  trialId: 'explorer-actions-2026-01-01',
  decidedAt: '2026-01-01',
  decidedBy: 'product',
  rationale: 'Three segments, no wrong commits across two devices.'
}

describe('product default decision', () => {
  it('accepts a complete record', () => {
    expect(validateProductDefaultDecision(decision)).toEqual([])
  })

  // A decision nobody signed is a preference someone wrote down.
  it('refuses one with no person behind it', () => {
    const { decidedBy: _who, ...unsigned } = decision
    expect(validateProductDefaultDecision(unsigned)).toContain('decidedBy is required')
  })

  it('refuses one with no trial behind it', () => {
    const { trialId: _trial, ...ungrounded } = decision
    expect(validateProductDefaultDecision(ungrounded)).toContain('trialId is required')
  })

  it('refuses something that is not a record', () => {
    expect(validateProductDefaultDecision(null)).toEqual(['not a decision record'])
  })
})

describe('the promotion lock', () => {
  it('reports a contractual preset with no decision behind it', () => {
    expect(unapprovedProductDefaults(['explorer-actions'], [])).toEqual(['explorer-actions'])
  })

  it('clears one that has a complete decision', () => {
    expect(unapprovedProductDefaults(['explorer-actions'], [decision])).toEqual([])
  })

  // An incomplete decision must not launder a preset through the gate.
  it('does not accept an unsigned decision as approval', () => {
    const { decidedBy: _who, ...unsigned } = decision
    expect(unapprovedProductDefaults(['explorer-actions'], [unsigned])).toEqual([
      'explorer-actions'
    ])
  })
})

/** Every preset in the experiment tree that declares itself contractual, read from source. */
function contractualPresetIds(): string[] {
  if (!existsSync(experimentsRoot)) {
    return []
  }
  const found: string[] = []
  for (const name of readdirSync(experimentsRoot)) {
    const path = join(experimentsRoot, name)
    if (!['.ts', '.tsx'].includes(extname(path)) || /\.test\./.test(name)) {
      continue
    }
    const source = readFileSync(path, 'utf8')
    const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true)
    const visit = (node: ts.Node): void => {
      if (ts.isObjectLiteralExpression(node)) {
        const property = (key: string): ts.PropertyAssignment | undefined =>
          node.properties.find(
            (candidate): candidate is ts.PropertyAssignment =>
              ts.isPropertyAssignment(candidate) &&
              (ts.isIdentifier(candidate.name) || ts.isStringLiteralLike(candidate.name)) &&
              candidate.name.text === key
          )
        const contractual = property('contractual')
        const presetId = property('presetId')
        if (
          contractual !== undefined &&
          contractual.initializer.kind !== ts.SyntaxKind.FalseKeyword &&
          presetId !== undefined &&
          ts.isStringLiteralLike(presetId.initializer)
        ) {
          found.push(`${relative(mobileRoot, path)}:${presetId.initializer.text}`)
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(file)
  }
  return found
}

function recordedDecisions(): unknown[] {
  if (!existsSync(decisionsRoot)) {
    return []
  }
  return readdirSync(decisionsRoot)
    .filter((name) => name.endsWith('.json'))
    .map((name) => JSON.parse(readFileSync(join(decisionsRoot, name), 'utf8')))
}

describe('no preset has been promoted behind the gate', () => {
  // WHEEL-AC8. This is live now and passes because nothing is contractual yet — which is the
  // state `002` says this specification ends in. It fails the moment one is, without a decision.
  it('leaves every experiment preset non-contractual, or accounted for', () => {
    const contractual = contractualPresetIds()
    const unapproved = unapprovedProductDefaults(
      contractual.map((entry) => entry.split(':')[1] ?? entry),
      recordedDecisions()
    )

    expect(unapproved).toEqual([])
  })

  it('validates every decision that has been filed', () => {
    for (const filed of recordedDecisions()) {
      expect(validateProductDefaultDecision(filed), readString(filed, 'presetId') ?? '?').toEqual(
        []
      )
    }
  })
})
