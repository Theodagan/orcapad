import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { extname, join, relative, resolve, sep } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/**
 * Dependency direction (FND-R3, FND-AC1, FND-AC2) and host-vocabulary containment (FND-AC6),
 * held by static analysis instead of documentation.
 *
 * Source text, not a module graph: `src/features/` and `src/adapters/` arrive over later
 * foundation tasks, and a type-only import still couples the layers even though it emits
 * nothing. A specifier is resolved through the `@/*` tsconfig alias as well as relatively,
 * so neither spelling is a way around a rule.
 *
 * Layering is checked in tests too — a core test that needs an adapter proves the coupling
 * as well as a core module would. Vocabulary is not: `*.test.ts(x)` prose names hosts on
 * purpose, and a test does not ship. Comments are never scanned, only identifiers and string
 * literals, so the doc comment that explains a domain concept stays free to mention the host
 * concept it replaced.
 *
 * What this does not catch, all accepted: a specifier assembled at runtime, vocabulary
 * reached through a re-exported alias, and a `src/shared` type laundered through a
 * structurally identical local declaration.
 */

const mobileRoot = fileURLToPath(new URL('../..', import.meta.url))
const srcRoot = join(mobileRoot, 'src')
const coreRoot = join(srcRoot, 'core')
const domainRoot = join(coreRoot, 'domain')
const featuresRoot = join(srcRoot, 'features')
const adaptersRoot = join(srcRoot, 'adapters')
const hostSharedRoot = resolve(mobileRoot, '..', 'src', 'shared')
const rpcCatalogPath = join(hostSharedRoot, 'rpc-contract', 'rpc-params-catalog.generated.ts')

const scannedRoots = [coreRoot, featuresRoot, adaptersRoot]
const sourceExtensions = new Set(['.js', '.jsx', '.ts', '.tsx'])
const testFile = /\.test\.[jt]sx?$/
const aliasPrefix = '@/'

const reactNativePackage = /^react-native(\/|$)/
const expoPackage = /^expo(-|\/|$)/

const DOMAIN_RULE = 'core/domain imports nothing outside itself'

/** FND-AC6. Matched case-insensitively, so `worktreeId` and `WorktreePs` both land. */
const FORBIDDEN_WORDS = ['worktree', 'panekey', 'snapshotid'] as const

/** tech.md §2 fixes this as a `WorkspaceKind` value; it is the one literal allowed to carry the word. */
const WORKSPACE_KIND_LITERAL = 'git-worktree'

function sourceFiles(directory: string): string[] {
  if (!existsSync(directory)) {
    return []
  }
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      return entry.name === 'node_modules' ? [] : sourceFiles(path)
    }
    return [path]
  })
}

function parse(path: string, source: string): ts.SourceFile {
  const extension = extname(path)
  return ts.createSourceFile(
    path,
    source,
    ts.ScriptTarget.Latest,
    true,
    extension === '.tsx' || extension === '.jsx' ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  )
}

function within(root: string, path: string): boolean {
  return path === root || path.startsWith(root + sep)
}

/** Absolute path for a specifier that names a file in this repo, null for a package. */
function resolveSpecifier(path: string, specifier: string): string | null {
  if (specifier.startsWith('.')) {
    return resolve(path, '..', specifier)
  }
  if (specifier.startsWith(aliasPrefix)) {
    return join(srcRoot, specifier.slice(aliasPrefix.length))
  }
  return null
}

/** Every specifier that couples this file to another module, type-only ones included. */
export function moduleSpecifiers(path: string, source: string): string[] {
  const specifiers: string[] = []
  const record = (node: ts.Node | undefined): void => {
    if (node !== undefined && ts.isStringLiteral(node)) {
      specifiers.push(node.text)
    }
  }
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      record(node.moduleSpecifier)
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
      record(node.argument.literal)
    } else if (ts.isCallExpression(node)) {
      const callee = node.expression
      if (
        callee.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(callee) && callee.text === 'require')
      ) {
        record(node.arguments[0])
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(parse(path, source))
  return specifiers
}

/** The rule this import breaks, or null when the layer may reach for it. */
function importRule(path: string, specifier: string): string | null {
  const inDomain = within(domainRoot, path)
  const inCore = within(coreRoot, path)
  const inFeatures = within(featuresRoot, path)
  if (!inCore && !inFeatures) {
    return null
  }
  const layer = inCore ? 'core' : 'features'
  const resolved = resolveSpecifier(path, specifier)
  if (resolved === null) {
    if (inDomain) {
      // The suite itself is the only package a domain test may name.
      return testFile.test(path) && specifier === 'vitest' ? null : DOMAIN_RULE
    }
    if (inCore && (reactNativePackage.test(specifier) || expoPackage.test(specifier))) {
      return 'core/** must not import react-native or an expo-* package'
    }
    return null
  }
  if (inDomain && !within(domainRoot, resolved)) {
    return DOMAIN_RULE
  }
  if (within(adaptersRoot, resolved)) {
    return `${layer}/** must not import adapters/**`
  }
  if (inCore && within(featuresRoot, resolved)) {
    return 'core/** must not import features/**'
  }
  if (within(hostSharedRoot, resolved)) {
    return `${layer}/** must not import the Orca host contracts under src/shared/**`
  }
  return null
}

export function layeringViolations(path: string, source: string): string[] {
  return moduleSpecifiers(path, source).flatMap((specifier) => {
    const rule = importRule(path, specifier)
    return rule === null ? [] : [`${specifier} — ${rule}`]
  })
}

/**
 * Read, never imported: a value import of the contract would break the type-only ratchet in
 * `src/rpc-params-contract-type-only-boundary.test.ts` and pull zod into this suite.
 */
export function rpcMethodNames(source: string): Set<string> {
  const names = new Set<string>()
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const initializer = ts.isAsExpression(node.initializer)
        ? node.initializer.expression
        : node.initializer
      if (node.name.text === 'RPC_PARAMS_BY_METHOD' && ts.isObjectLiteralExpression(initializer)) {
        for (const property of initializer.properties) {
          if (property.name !== undefined && ts.isStringLiteralLike(property.name)) {
            names.add(property.name.text)
          }
        }
      }
      if (
        node.name.text === 'RPC_METHODS_WITHOUT_SHARED_PARAMS' &&
        ts.isArrayLiteralExpression(initializer)
      ) {
        for (const element of initializer.elements) {
          if (ts.isStringLiteralLike(element)) {
            names.add(element.text)
          }
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(parse(rpcCatalogPath, source))
  return names
}

export function vocabularyViolations(
  path: string,
  source: string,
  rpcMethods: ReadonlySet<string>
): string[] {
  if (testFile.test(path)) {
    return []
  }
  const found: string[] = []
  const inspect = (text: string, isLiteral: boolean): void => {
    if (isLiteral && text === WORKSPACE_KIND_LITERAL) {
      return
    }
    if (isLiteral && rpcMethods.has(text)) {
      found.push(`'${text}' — an Orca RPC method name belongs to the adapter`)
      return
    }
    const lowered = text.toLowerCase()
    const word = FORBIDDEN_WORDS.find((candidate) => lowered.includes(candidate))
    if (word !== undefined) {
      found.push(`${text} — host vocabulary '${word}' belongs to the adapter`)
    }
  }
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node)) {
      inspect(node.text, false)
    } else if (ts.isStringLiteralLike(node)) {
      inspect(node.text, true)
    } else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
      inspect(node.text, true)
    }
    ts.forEachChild(node, visit)
  }
  visit(parse(path, source))
  return found
}

const domainProbe = join(domainRoot, 'probe.ts')
const domainTestProbe = join(domainRoot, 'probe.test.ts')
const coreProbe = join(coreRoot, 'application', 'probe.ts')
const coreTestProbe = join(coreRoot, 'application', 'probe.test.ts')
const featureProbe = join(featuresRoot, 'sessions', 'probe.ts')
const adapterProbe = join(adaptersRoot, 'orca', 'probe.ts')

describe('Layering boundary', () => {
  it('reads every specifier that couples a module, whatever its shape', () => {
    expect(moduleSpecifiers(coreProbe, "import { a } from './a'")).toEqual(['./a'])
    expect(moduleSpecifiers(coreProbe, "import type { A } from './a'")).toEqual(['./a'])
    expect(moduleSpecifiers(coreProbe, "import './a'")).toEqual(['./a'])
    expect(moduleSpecifiers(coreProbe, "export { a } from './a'")).toEqual(['./a'])
    expect(moduleSpecifiers(coreProbe, "export * from './a'")).toEqual(['./a'])
    expect(moduleSpecifiers(coreProbe, "const a = require('./a')")).toEqual(['./a'])
    expect(moduleSpecifiers(coreProbe, "const a = await import('./a')")).toEqual(['./a'])
    expect(moduleSpecifiers(coreProbe, "type A = import('./a').A")).toEqual(['./a'])
    expect(moduleSpecifiers(coreProbe, "const a = 'not an import'")).toEqual([])
  })

  it('keeps core/domain closed over itself', () => {
    expect(layeringViolations(domainProbe, "import { brandId } from './branded-id'")).toEqual([])
    expect(
      layeringViolations(
        domainProbe,
        "import type { PortResult } from '../application/ports/port-result'"
      )
    ).toEqual([`../application/ports/port-result — ${DOMAIN_RULE}`])
    expect(layeringViolations(domainProbe, "import { useMemo } from 'react'")).toEqual([
      `react — ${DOMAIN_RULE}`
    ])
    expect(layeringViolations(domainProbe, "import { join } from 'node:path'")).toEqual([
      `node:path — ${DOMAIN_RULE}`
    ])
    expect(layeringViolations(domainProbe, "import type { X } from '@/adapters/orca'")).toEqual([
      `@/adapters/orca — ${DOMAIN_RULE}`
    ])
    expect(layeringViolations(domainTestProbe, "import { describe } from 'vitest'")).toEqual([])
    expect(layeringViolations(domainProbe, "import { describe } from 'vitest'")).toEqual([
      `vitest — ${DOMAIN_RULE}`
    ])
  })

  it('points core away from adapters, features, the host contracts, and the device', () => {
    expect(
      layeringViolations(coreProbe, "import { createOrcaAdapter } from '../../adapters/orca'")
    ).toEqual(['../../adapters/orca — core/** must not import adapters/**'])
    expect(layeringViolations(coreProbe, "const a = require('@/adapters/stub')")).toEqual([
      '@/adapters/stub — core/** must not import adapters/**'
    ])
    expect(
      layeringViolations(coreProbe, "import { useSessions } from '../../features/sessions/state'")
    ).toEqual(['../../features/sessions/state — core/** must not import features/**'])
    expect(
      layeringViolations(
        coreProbe,
        "import type { RpcMethodName } from '../../../../src/shared/rpc-contract/rpc-params-catalog.generated'"
      )
    ).toEqual([
      '../../../../src/shared/rpc-contract/rpc-params-catalog.generated — core/** must not import the Orca host contracts under src/shared/**'
    ])
    expect(layeringViolations(coreProbe, "import { View } from 'react-native'")).toEqual([
      'react-native — core/** must not import react-native or an expo-* package'
    ])
    expect(layeringViolations(coreProbe, "import * as Store from 'expo-secure-store'")).toEqual([
      'expo-secure-store — core/** must not import react-native or an expo-* package'
    ])
    expect(layeringViolations(coreProbe, "import { readFileSync } from 'node:fs'")).toEqual([])
    expect(
      layeringViolations(coreProbe, "import type { Session } from '../domain/session'")
    ).toEqual([])
    expect(layeringViolations(coreTestProbe, "import { View } from 'react-native'")).toEqual([
      'react-native — core/** must not import react-native or an expo-* package'
    ])
  })

  it('points features away from adapters while leaving the device and core open', () => {
    expect(
      layeringViolations(featureProbe, "const a = await import('../../adapters/orca')")
    ).toEqual(['../../adapters/orca — features/** must not import adapters/**'])
    expect(
      layeringViolations(
        featureProbe,
        "import { listSessions } from '../../core/application/use-cases/list-sessions'"
      )
    ).toEqual([])
    expect(layeringViolations(featureProbe, "import { View } from 'react-native'")).toEqual([])
    expect(
      layeringViolations(
        featureProbe,
        "import type { X } from '../../../../src/shared/rpc-contract/rpc-params-catalog.generated'"
      )
    ).toEqual([
      '../../../../src/shared/rpc-contract/rpc-params-catalog.generated — features/** must not import the Orca host contracts under src/shared/**'
    ])
  })

  it('leaves the adapter free to hold Orca knowledge', () => {
    expect(layeringViolations(adapterProbe, "import { View } from 'react-native'")).toEqual([])
    expect(
      layeringViolations(
        adapterProbe,
        "import type { X } from '../../../../src/shared/rpc-contract/rpc-params-catalog.generated'"
      )
    ).toEqual([])
    expect(
      layeringViolations(adapterProbe, "import type { Session } from '../../core/domain/session'")
    ).toEqual([])
  })

  it('recovers the RPC method catalog from source without importing it', () => {
    const methods = rpcMethodNames(readFileSync(rpcCatalogPath, 'utf8'))

    expect(methods.size).toBeGreaterThan(100)
    expect(methods.has('status.get')).toBe(true)
    expect(methods.has('session.tabs.list')).toBe(true)
    // Listed apart from the schema map because its params live in src/main; still a method name.
    expect(methods.has('orchestration.send')).toBe(true)
  })

  it('flags host vocabulary in identifiers and literals only', () => {
    const methods = new Set(['status.get', 'worktree.ps'])

    expect(vocabularyViolations(coreProbe, 'const id = worktreeId', methods)).toHaveLength(1)
    expect(vocabularyViolations(coreProbe, 'const key = paneKey', methods)).toHaveLength(1)
    expect(
      vocabularyViolations(coreProbe, 'type Snap = { snapshotId: string }', methods)
    ).toHaveLength(1)
    expect(vocabularyViolations(coreProbe, "const m = 'status.get'", methods)).toEqual([
      "'status.get' — an Orca RPC method name belongs to the adapter"
    ])
    expect(vocabularyViolations(coreProbe, 'const m = `status.get`', methods)).toHaveLength(1)
    expect(
      vocabularyViolations(
        coreProbe,
        "export const WORKSPACE_KINDS = ['git-worktree', 'folder'] as const",
        methods
      )
    ).toEqual([])
    expect(
      vocabularyViolations(
        coreProbe,
        '/** A git worktree or a folder workspace. */\nexport const kinds = 2',
        methods
      )
    ).toEqual([])
    expect(
      vocabularyViolations(
        coreTestProbe,
        "it('accepts a git worktree with a branch', () => {})",
        methods
      )
    ).toEqual([])
    expect(vocabularyViolations(adapterProbe, "const m = 'worktree.ps'", methods)).toEqual([
      "'worktree.ps' — an Orca RPC method name belongs to the adapter"
    ])
  })

  it('holds the dependency direction across core, features, and adapters', () => {
    const offenders = scannedRoots
      .flatMap(sourceFiles)
      .filter((path) => sourceExtensions.has(extname(path)))
      .flatMap((path) =>
        layeringViolations(path, readFileSync(path, 'utf8')).map(
          (violation) => `${relative(mobileRoot, path)}: ${violation}`
        )
      )

    expect(offenders).toEqual([])
  })

  it('keeps Orca vocabulary out of core and features', () => {
    const methods = rpcMethodNames(readFileSync(rpcCatalogPath, 'utf8'))
    const offenders = [coreRoot, featuresRoot]
      .flatMap(sourceFiles)
      .filter((path) => sourceExtensions.has(extname(path)))
      .flatMap((path) =>
        vocabularyViolations(path, readFileSync(path, 'utf8'), methods).map(
          (violation) => `${relative(mobileRoot, path)}: ${violation}`
        )
      )

    expect(offenders).toEqual([])
  })
})
