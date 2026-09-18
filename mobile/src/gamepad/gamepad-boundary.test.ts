import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { extname, join, relative, resolve, sep } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/**
 * The fork's one boundary. `src/gamepad/` is the whole controller product layer; everything
 * else under `mobile/src/` is upstream Orca Mobile. One predicate holds the dependency
 * direction (FND-R3) and one holds host-vocabulary containment (FND-AC6):
 *
 *   gamepad/** may not import outside gamepad/**, except gamepad/adapters/**, which reaches
 *   a named list of upstream modules.
 *
 * That single rule is what makes the fork a subtree: `git diff` shows it, a rebase skips it,
 * and extraction is a move rather than a tsconfig excavation. It is strictly stronger than
 * the per-folder rules it replaces, which said nothing about the ~30 upstream siblings the
 * old `src/core/` sat next to.
 *
 * Source text, not a module graph: most of the tree arrives over later feature tasks, and a
 * type-only import still couples the layers even though it emits nothing. A specifier is
 * resolved through the `@/*` tsconfig alias as well as relatively, so neither spelling is a
 * way around a rule.
 *
 * Layering is checked in tests too — a state test that needs an adapter proves the coupling
 * as well as a state module would. Vocabulary is not: `*.test.ts(x)` prose names hosts on
 * purpose, and a test does not ship. Comments are never scanned, only identifiers and string
 * literals, so the doc comment that explains a domain concept stays free to mention the host
 * concept it replaced.
 *
 * What this does not catch, all accepted: a specifier assembled at runtime, vocabulary
 * reached through a re-exported alias, and an upstream type laundered through a structurally
 * identical local declaration.
 */

const mobileRoot = fileURLToPath(new URL('../..', import.meta.url))
const srcRoot = join(mobileRoot, 'src')
const gamepadRoot = join(srcRoot, 'gamepad')
const domainRoot = join(gamepadRoot, 'domain')
const applicationRoot = join(gamepadRoot, 'application')
const portsRoot = join(applicationRoot, 'ports')
const stateRoot = join(gamepadRoot, 'state')
const featuresRoot = join(gamepadRoot, 'features')
const adaptersRoot = join(gamepadRoot, 'adapters')
const hostSharedRoot = resolve(mobileRoot, '..', 'src', 'shared')
const rpcCatalogPath = join(hostSharedRoot, 'rpc-contract', 'rpc-params-catalog.generated.ts')

/**
 * The upstream modules `gamepad/adapters/**` may reach. A ratchet, not a door: adding a root
 * is a deliberate edit, and every entry is a thing extraction has to replace.
 */
const ADAPTER_UPSTREAM_REACH = [
  join(srcRoot, 'transport'),
  join(srcRoot, 'storage'),
  join(srcRoot, 'terminal'),
  join(srcRoot, 'navigation'),
  hostSharedRoot
]

const sourceExtensions = new Set(['.js', '.jsx', '.ts', '.tsx'])
const testFile = /\.test\.[jt]sx?$/
const aliasPrefix = '@/'

const reactNativePackage = /^react-native(\/|$)/
const expoPackage = /^expo(-|\/|$)/

const DOMAIN_RULE = 'gamepad/domain imports nothing outside itself'
const PORTS_RULE = 'gamepad/application/ports may only reference gamepad/domain'
const ADAPTER_RULE = 'only gamepad/adapters may import gamepad/adapters — go through the registry'
const DEVICE_RULE =
  'gamepad/{domain,application,state} must not import react-native or an expo-* package'

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

/** The rule this import breaks, or null when the slice may reach for it. */
function importRule(path: string, specifier: string): string | null {
  if (!within(gamepadRoot, path)) {
    return null
  }
  const inDomain = within(domainRoot, path)
  const inPorts = within(portsRoot, path)
  const inAdapters = within(adaptersRoot, path)
  const inFeatures = within(featuresRoot, path)
  const resolved = resolveSpecifier(path, specifier)

  if (resolved === null) {
    if (inDomain) {
      // The suite itself is the only package a domain test may name.
      return testFile.test(path) && specifier === 'vitest' ? null : DOMAIN_RULE
    }
    if (inAdapters || inFeatures) {
      return null
    }
    return reactNativePackage.test(specifier) || expoPackage.test(specifier) ? DEVICE_RULE : null
  }

  if (inDomain) {
    return within(domainRoot, resolved) ? null : DOMAIN_RULE
  }
  if (inPorts && !within(domainRoot, resolved) && !within(portsRoot, resolved)) {
    return PORTS_RULE
  }
  if (!within(gamepadRoot, resolved)) {
    if (!inAdapters) {
      return 'gamepad must not import outside src/gamepad — only gamepad/adapters may'
    }
    return ADAPTER_UPSTREAM_REACH.some((root) => within(root, resolved))
      ? null
      : 'gamepad/adapters may not reach this module — extend ADAPTER_UPSTREAM_REACH if deliberate'
  }
  return within(adaptersRoot, resolved) && !inAdapters ? ADAPTER_RULE : null
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
  // The adapter is the one place that may name Orca; a test does not ship.
  if (testFile.test(path) || within(adaptersRoot, path)) {
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
const portProbe = join(portsRoot, 'probe.ts')
const useCaseProbe = join(applicationRoot, 'use-cases', 'probe.ts')
const stateProbe = join(stateRoot, 'remote', 'probe.ts')
const stateTestProbe = join(stateRoot, 'remote', 'probe.test.ts')
const featureProbe = join(featuresRoot, 'sessions', 'probe.ts')
const adapterProbe = join(adaptersRoot, 'orca', 'probe.ts')
const upstreamProbe = join(srcRoot, 'transport', 'probe.ts')

describe('Gamepad boundary', () => {
  it('reads every specifier that couples a module, whatever its shape', () => {
    expect(moduleSpecifiers(useCaseProbe, "import { a } from './a'")).toEqual(['./a'])
    expect(moduleSpecifiers(useCaseProbe, "import type { A } from './a'")).toEqual(['./a'])
    expect(moduleSpecifiers(useCaseProbe, "import './a'")).toEqual(['./a'])
    expect(moduleSpecifiers(useCaseProbe, "export { a } from './a'")).toEqual(['./a'])
    expect(moduleSpecifiers(useCaseProbe, "export * from './a'")).toEqual(['./a'])
    expect(moduleSpecifiers(useCaseProbe, "const a = require('./a')")).toEqual(['./a'])
    expect(moduleSpecifiers(useCaseProbe, "const a = await import('./a')")).toEqual(['./a'])
    expect(moduleSpecifiers(useCaseProbe, "type A = import('./a').A")).toEqual(['./a'])
    expect(moduleSpecifiers(useCaseProbe, "const a = 'not an import'")).toEqual([])
  })

  it('leaves upstream Orca Mobile alone', () => {
    expect(layeringViolations(upstreamProbe, "import { View } from 'react-native'")).toEqual([])
    expect(
      layeringViolations(upstreamProbe, "import { x } from '../../../src/shared/rpc-contract/x'")
    ).toEqual([])
  })

  it('keeps gamepad/domain closed over itself', () => {
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
    expect(
      layeringViolations(domainProbe, "import type { X } from '@/gamepad/adapters/orca'")
    ).toEqual([`@/gamepad/adapters/orca — ${DOMAIN_RULE}`])
    expect(layeringViolations(domainTestProbe, "import { describe } from 'vitest'")).toEqual([])
    expect(layeringViolations(domainProbe, "import { describe } from 'vitest'")).toEqual([
      `vitest — ${DOMAIN_RULE}`
    ])
  })

  it('keeps port signatures on domain types (FND-AC2)', () => {
    expect(
      layeringViolations(portProbe, "import type { Session } from '../../domain/session'")
    ).toEqual([])
    expect(
      layeringViolations(portProbe, "import type { PortResult } from './port-result'")
    ).toEqual([])
    expect(
      layeringViolations(portProbe, "import type { Queue } from '../../state/remote/queue'")
    ).toEqual([`../../state/remote/queue — ${PORTS_RULE}`])
  })

  it('stops the product layer at the edge of src/gamepad', () => {
    const outside = 'gamepad must not import outside src/gamepad — only gamepad/adapters may'
    expect(
      layeringViolations(stateProbe, "import { loadHosts } from '../../../transport/host-store'")
    ).toEqual([`../../../transport/host-store — ${outside}`])
    expect(
      layeringViolations(useCaseProbe, "const p = require('../../../storage/preferences')")
    ).toEqual([`../../../storage/preferences — ${outside}`])
    expect(
      layeringViolations(featureProbe, "import { fileTree } from '@/files/file-tree'")
    ).toEqual([`@/files/file-tree — ${outside}`])
    expect(
      layeringViolations(
        useCaseProbe,
        "import type { X } from '../../../../../src/shared/rpc-contract/rpc-params-catalog.generated'"
      )
    ).toEqual([`../../../../../src/shared/rpc-contract/rpc-params-catalog.generated — ${outside}`])
  })

  it('routes every slice to the adapter through the registry', () => {
    expect(
      layeringViolations(useCaseProbe, "import { createOrcaAdapter } from '../../adapters/orca'")
    ).toEqual([`../../adapters/orca — ${ADAPTER_RULE}`])
    expect(
      layeringViolations(featureProbe, "const a = await import('../../adapters/orca')")
    ).toEqual([`../../adapters/orca — ${ADAPTER_RULE}`])
    expect(layeringViolations(stateProbe, "const a = require('@/gamepad/adapters/stub')")).toEqual([
      `@/gamepad/adapters/stub — ${ADAPTER_RULE}`
    ])
    expect(
      layeringViolations(useCaseProbe, "import { registry } from '../adapter-registry'")
    ).toEqual([])
  })

  it('keeps the device out of everything but features', () => {
    expect(layeringViolations(useCaseProbe, "import { View } from 'react-native'")).toEqual([
      `react-native — ${DEVICE_RULE}`
    ])
    expect(layeringViolations(stateProbe, "import * as Store from 'expo-secure-store'")).toEqual([
      `expo-secure-store — ${DEVICE_RULE}`
    ])
    expect(layeringViolations(stateTestProbe, "import { View } from 'react-native'")).toEqual([
      `react-native — ${DEVICE_RULE}`
    ])
    expect(layeringViolations(featureProbe, "import { View } from 'react-native'")).toEqual([])
    expect(layeringViolations(adapterProbe, "import { View } from 'react-native'")).toEqual([])
    expect(layeringViolations(useCaseProbe, "import { readFileSync } from 'node:fs'")).toEqual([])
  })

  it('lets the adapter reach the listed upstream modules and nothing else', () => {
    expect(
      layeringViolations(
        adapterProbe,
        "import { openHostLogicalClient } from '../../../transport/host-logical-client'"
      )
    ).toEqual([])
    expect(
      layeringViolations(
        adapterProbe,
        "import { loadPinnedIds } from '../../../storage/preferences'"
      )
    ).toEqual([])
    expect(
      layeringViolations(
        adapterProbe,
        "import type { RpcMethodName } from '../../../../../src/shared/rpc-contract/rpc-params-catalog.generated'"
      )
    ).toEqual([])
    expect(
      layeringViolations(adapterProbe, "import type { Session } from '../../domain/session'")
    ).toEqual([])
    expect(
      layeringViolations(
        adapterProbe,
        "import { MobileHomeScreen } from '../../../home/MobileHomeScreen'"
      )
    ).toEqual([
      '../../../home/MobileHomeScreen — gamepad/adapters may not reach this module — extend ADAPTER_UPSTREAM_REACH if deliberate'
    ])
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

    expect(vocabularyViolations(useCaseProbe, 'const id = worktreeId', methods)).toHaveLength(1)
    expect(vocabularyViolations(useCaseProbe, 'const key = paneKey', methods)).toHaveLength(1)
    expect(
      vocabularyViolations(useCaseProbe, 'type Snap = { snapshotId: string }', methods)
    ).toHaveLength(1)
    expect(vocabularyViolations(useCaseProbe, "const m = 'status.get'", methods)).toEqual([
      "'status.get' — an Orca RPC method name belongs to the adapter"
    ])
    expect(vocabularyViolations(useCaseProbe, 'const m = `status.get`', methods)).toHaveLength(1)
    expect(
      vocabularyViolations(
        domainProbe,
        "export const WORKSPACE_KINDS = ['git-worktree', 'folder'] as const",
        methods
      )
    ).toEqual([])
    expect(
      vocabularyViolations(
        domainProbe,
        '/** A git worktree or a folder workspace. */\nexport const kinds = 2',
        methods
      )
    ).toEqual([])
    expect(
      vocabularyViolations(
        stateTestProbe,
        "it('accepts a git worktree with a branch', () => {})",
        methods
      )
    ).toEqual([])
    // The adapter is where Orca vocabulary belongs.
    expect(vocabularyViolations(adapterProbe, "const m = 'worktree.ps'", methods)).toEqual([])
  })

  it('holds the boundary across the whole gamepad tree', () => {
    const offenders = sourceFiles(gamepadRoot)
      .filter((path) => sourceExtensions.has(extname(path)))
      .flatMap((path) =>
        layeringViolations(path, readFileSync(path, 'utf8')).map(
          (violation) => `${relative(mobileRoot, path)}: ${violation}`
        )
      )

    expect(offenders).toEqual([])
  })

  it('keeps Orca vocabulary out of every slice but the adapter', () => {
    const methods = rpcMethodNames(readFileSync(rpcCatalogPath, 'utf8'))
    const offenders = sourceFiles(gamepadRoot)
      .filter((path) => sourceExtensions.has(extname(path)))
      .flatMap((path) =>
        vocabularyViolations(path, readFileSync(path, 'utf8'), methods).map(
          (violation) => `${relative(mobileRoot, path)}: ${violation}`
        )
      )

    expect(offenders).toEqual([])
  })
})
