import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { extname, join, relative, resolve, sep } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/**
 * The controller layer's ratchets. Five narrow rules from `000/tech.md` §6, each protecting one
 * thing that is cheap to get wrong and expensive to find later.
 *
 * What this deliberately does not do is wall `src/gamepad/` off from the rest of Orca Mobile.
 * The predecessor did, and that wall is what produced a second projects/workspaces/sessions
 * model inside the fork: a binding could not call `use-mobile-session-controller` without
 * failing the suite. FND-R1 inverts it — existing surfaces are authoritative, so importing an
 * existing controller, hook or component is the intended shape, and only the low-level
 * transport beneath them is out of bounds (FND-R3).
 *
 * Source text, not a module graph: most of this tree arrives over `001`–`003`, and a rule that
 * only fires once a directory exists is a rule nobody notices is missing. Each predicate is
 * exported and unit-tested against probe sources, so it is live before the modules it guards.
 *
 * Duplicate-infrastructure checks — socket, pairing, notification, speech, terminal protocol,
 * file RPC — are FND-T4 and land here next.
 *
 * Accepted gaps: a specifier assembled at runtime, a rule reached through a re-exported alias,
 * and the single-letter face buttons, which no literal scan can tell from ordinary data.
 */

const mobileRoot = fileURLToPath(new URL('../..', import.meta.url))
const srcRoot = join(mobileRoot, 'src')
const gamepadRoot = join(srcRoot, 'gamepad')
const controllerInputRoot = join(gamepadRoot, 'controller-input')
const wheelRoot = join(gamepadRoot, 'wheel')
const experimentsRoot = join(wheelRoot, 'experiments')
const bindingsRoot = join(gamepadRoot, 'bindings')
const hostSharedRoot = resolve(mobileRoot, '..', 'src', 'shared')

/** This file is the rule table, so it names every vocabulary the rules forbid elsewhere. */
const ratchetFile = join(gamepadRoot, 'gamepad-boundary.test.ts')

const sourceExtensions = new Set(['.js', '.jsx', '.ts', '.tsx'])
const testFile = /\.test\.[jt]sx?$/
const aliasPrefix = '@/'

/**
 * Raw controls the resolver translates into intents. Only `controller-input/` may name them:
 * past that point the vocabulary is intents, so a remapped button changes one table (CTRL-R1).
 */
const RAW_CONTROL_NAMES: readonly string[] = [
  'lb',
  'rb',
  'l2',
  'r2',
  'l3',
  'r3',
  'dpad-up',
  'dpad-down',
  'dpad-left',
  'dpad-right',
  'left-x',
  'left-y',
  'right-x',
  'right-y'
]

const GEOMETRY_MATH = new Set(['atan2', 'cos', 'sin', 'hypot', 'PI'])
const GEOMETRY_WORD = /angle|radian|degree/i

const PRD_SET = 'PRD_CONTROLLER_BINDINGS'
const PROVISIONAL_SET = 'EXPERIMENTAL_DPAD_BINDINGS'

/** An object literal shaped like a wheel preset (`002/tech.md` §1, §5). */
const PRESET_MARKERS = ['presetId', 'segments']

/** Beneath every authoritative surface action. A binding reaches the action, never this. */
const LOW_LEVEL_ROOTS = [join(srcRoot, 'transport'), join(hostSharedRoot, 'rpc-contract')]

/**
 * Existing-action modules `003` names that happen to sit under a closed root. File-exact, so
 * the directory around them stays shut — the allowance is the action, not its neighbourhood.
 */
const EXISTING_ACTION_IMPORTS = [join(srcRoot, 'transport', 'pre-profile-pairing-coordinator')]

/**
 * Infrastructure Orca Mobile already ships (`000/tech.md` §4, FND-AC2). Each row is matched by
 * the packages a reimplementation cannot avoid and by the exact names `003` calls out, because
 * both survive renaming better than a shape test would. Invoking the owner's action is the
 * point; standing up a second one is the failure.
 */
type DuplicateShape = {
  readonly shape: string
  readonly owner: string
  readonly packages?: RegExp
  readonly names?: RegExp
  readonly literals?: RegExp
}

const DUPLICATE_SHAPES: readonly DuplicateShape[] = [
  {
    shape: 'a socket or reconnect schedule',
    owner: 'mobile/src/transport',
    packages: /^ws$/,
    // Invoking an existing reconnect action is the documented binding for the host list
    // (`003` §2), so only scheduling vocabulary is out of bounds.
    names: /^WebSocket$|backoff|schedulereconnect|reconnectschedule|reconnecttimer|retrydelay/i
  },
  {
    shape: 'pairing decode or relay provisioning',
    owner: 'mobile/app/pair-scan.tsx and pre-profile-pairing-coordinator.ts',
    packages: /^(expo-camera|tweetnacl|@noble\/hashes)(\/|$)/,
    literals: /^pairing\./
  },
  {
    shape: 'a second host, session, or credential store',
    owner: 'mobile/src/storage and mobile/src/transport',
    packages: /^(expo-secure-store|@react-native-async-storage\/async-storage)(\/|$)/
  },
  {
    shape: 'push registration or catch-up',
    owner: 'mobile/src/notifications',
    packages: /^(expo-notifications|expo-task-manager)(\/|$)/,
    names: /pushtoken|registerfornotification|catchup|watermark/i
  },
  {
    shape: 'a microphone or speech pipeline',
    owner: 'mobile/src/hooks/use-mobile-dictation.ts',
    packages: /^(@orca\/expo-two-way-audio|expo-av|expo-audio)(\/|$)/,
    literals: /^speech\./
  },
  {
    shape: 'terminal stream decoding or viewport protocol',
    owner: 'mobile/src/terminal and mobile/src/session/TerminalPaneView.tsx',
    packages: /^@xterm\//,
    names: /^(TerminalStreamOpcode|outputPause)$/,
    literals: /^terminal\./
  },
  {
    shape: 'a file RPC layer',
    owner: 'mobile/src/files',
    packages: /^(expo-file-system|expo-document-picker)(\/|$)/,
    literals: /^files\./
  }
]

const RAW_CONTROL_RULE = 'a raw control name belongs in gamepad/controller-input'
const GEOMETRY_RULE = 'wheel geometry belongs in gamepad/wheel'
const PRESET_GEOMETRY_RULE =
  'an experiment preset is layout data; geometry belongs in wheel mechanics'
const MAPPING_SET_RULE = `${PRD_SET} and ${PROVISIONAL_SET} are separate data sets`
const PRESET_CONTRACT_RULE = "an experiment preset must carry 'contractual: false'"
const LOW_LEVEL_RULE =
  'a binding delegates to an existing surface action; transport and RPC stay upstream'

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

function walk(path: string, source: string, visitor: (node: ts.Node) => void): void {
  const visit = (node: ts.Node): void => {
    visitor(node)
    ts.forEachChild(node, visit)
  }
  visit(parse(path, source))
}

/** Text of every string literal and template chunk, which is where a control name would hide. */
function literalTexts(path: string, source: string): string[] {
  const texts: string[] = []
  walk(path, source, (node) => {
    if (
      ts.isStringLiteralLike(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    ) {
      texts.push(node.text)
    }
  })
  return texts
}

export function rawControlViolations(path: string, source: string): string[] {
  if (testFile.test(path) || within(controllerInputRoot, path)) {
    return []
  }
  return literalTexts(path, source)
    .filter((text) => RAW_CONTROL_NAMES.includes(text.toLowerCase()))
    .map((text) => `'${text}' — ${RAW_CONTROL_RULE}`)
}

export function wheelGeometryViolations(path: string, source: string): string[] {
  if (testFile.test(path)) {
    return []
  }
  const inWheel = within(wheelRoot, path)
  const inExperiments = within(experimentsRoot, path)
  const found: string[] = []
  walk(path, source, (node) => {
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'Math' &&
      GEOMETRY_MATH.has(node.name.text)
    ) {
      if (!inWheel) {
        found.push(`Math.${node.name.text} — ${GEOMETRY_RULE}`)
      } else if (inExperiments) {
        found.push(`Math.${node.name.text} — ${PRESET_GEOMETRY_RULE}`)
      }
      return
    }
    // Angle *data* is legal anywhere under wheel/, presets included; angle vocabulary is not
    // legal outside it, because that is a surface recomputing the geometry.
    if (!inWheel && ts.isIdentifier(node) && GEOMETRY_WORD.test(node.text)) {
      found.push(`${node.text} — ${GEOMETRY_RULE}`)
    }
  })
  return found
}

/**
 * CTRL-R1 is the PRD contract and CTRL-R2 is an experiment. A test that reaches both proves
 * neither, and a module that declares both makes the split a naming convention.
 */
export function mappingSetViolations(path: string, source: string): string[] {
  const referenced = new Set<string>()
  const declared = new Set<string>()
  walk(path, source, (node) => {
    if (ts.isIdentifier(node)) {
      referenced.add(node.text)
    }
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      declared.add(node.name.text)
    }
  })
  const found: string[] = []
  if (testFile.test(path) && referenced.has(PRD_SET) && referenced.has(PROVISIONAL_SET)) {
    found.push(`a test may reach one of them, not both — ${MAPPING_SET_RULE}`)
  }
  if (declared.has(PRD_SET) && declared.has(PROVISIONAL_SET)) {
    found.push(`one module declares both — ${MAPPING_SET_RULE}`)
  }
  return found
}

function propertyOf(
  node: ts.ObjectLiteralExpression,
  name: string
): ts.PropertyAssignment | undefined {
  return node.properties.find(
    (property): property is ts.PropertyAssignment =>
      ts.isPropertyAssignment(property) &&
      (ts.isIdentifier(property.name) || ts.isStringLiteralLike(property.name)) &&
      property.name.text === name
  )
}

/** WHEEL-R6: a preset is an experiment until a product-decision record says otherwise. */
export function presetContractViolations(path: string, source: string): string[] {
  if (testFile.test(path)) {
    return []
  }
  const found: string[] = []
  walk(path, source, (node) => {
    if (!ts.isObjectLiteralExpression(node)) {
      return
    }
    const contractual = propertyOf(node, 'contractual')
    if (contractual !== undefined) {
      if (contractual.initializer.kind !== ts.SyntaxKind.FalseKeyword) {
        found.push(`contractual is not the literal false — ${PRESET_CONTRACT_RULE}`)
      }
      return
    }
    const looksLikePreset = PRESET_MARKERS.some((marker) => propertyOf(node, marker) !== undefined)
    if (within(experimentsRoot, path) && looksLikePreset) {
      found.push(PRESET_CONTRACT_RULE)
    }
  })
  return found
}

export function lowLevelReachViolations(path: string, source: string): string[] {
  return moduleSpecifiers(path, source).flatMap((specifier) => {
    const resolved = resolveSpecifier(path, specifier)
    if (resolved === null) {
      return []
    }
    if (EXISTING_ACTION_IMPORTS.includes(resolved.replace(/\.tsx?$/, ''))) {
      return []
    }
    return LOW_LEVEL_ROOTS.some((root) => within(root, resolved))
      ? [`${specifier} — ${LOW_LEVEL_RULE}`]
      : []
  })
}

/**
 * A package import is checked in tests too: pulling `expo-notifications` into a controller test
 * is already the pipeline being built. Names and literals are not, because a test naming the
 * thing it forbids is the test doing its job.
 */
export function duplicateInfrastructureViolations(path: string, source: string): string[] {
  const found: string[] = []
  const report = (token: string, shape: DuplicateShape): void => {
    found.push(`${token} — ${shape.shape} is owned by ${shape.owner}`)
  }

  for (const specifier of moduleSpecifiers(path, source)) {
    if (resolveSpecifier(path, specifier) !== null) {
      continue
    }
    for (const shape of DUPLICATE_SHAPES) {
      if (shape.packages?.test(specifier) === true) {
        report(specifier, shape)
      }
    }
  }
  if (testFile.test(path)) {
    return found
  }

  walk(path, source, (node) => {
    if (ts.isIdentifier(node)) {
      for (const shape of DUPLICATE_SHAPES) {
        if (shape.names?.test(node.text) === true) {
          report(node.text, shape)
        }
      }
    } else if (ts.isStringLiteralLike(node)) {
      for (const shape of DUPLICATE_SHAPES) {
        if (shape.literals?.test(node.text) === true) {
          report(`'${node.text}'`, shape)
        }
      }
    }
  })
  return found
}

export function boundaryViolations(path: string, source: string): string[] {
  return [
    ...rawControlViolations(path, source),
    ...wheelGeometryViolations(path, source),
    ...mappingSetViolations(path, source),
    ...presetContractViolations(path, source),
    ...lowLevelReachViolations(path, source),
    ...duplicateInfrastructureViolations(path, source)
  ]
}

const inputProbe = join(controllerInputRoot, 'probe.ts')
const inputTestProbe = join(controllerInputRoot, 'probe.test.ts')
const wheelProbe = join(wheelRoot, 'probe.ts')
const presetProbe = join(experimentsRoot, 'probe.ts')
const bindingProbe = join(bindingsRoot, 'probe.ts')
const bindingTestProbe = join(bindingsRoot, 'probe.test.ts')
const providerProbe = join(gamepadRoot, 'controller-provider.tsx')

describe('Controller boundary', () => {
  it('reads every specifier that couples a module, whatever its shape', () => {
    expect(moduleSpecifiers(bindingProbe, "import { a } from './a'")).toEqual(['./a'])
    expect(moduleSpecifiers(bindingProbe, "import type { A } from './a'")).toEqual(['./a'])
    expect(moduleSpecifiers(bindingProbe, "export * from './a'")).toEqual(['./a'])
    expect(moduleSpecifiers(bindingProbe, "const a = require('./a')")).toEqual(['./a'])
    expect(moduleSpecifiers(bindingProbe, "const a = await import('./a')")).toEqual(['./a'])
    expect(moduleSpecifiers(bindingProbe, "type A = import('./a').A")).toEqual(['./a'])
    expect(moduleSpecifiers(bindingProbe, "const a = 'not an import'")).toEqual([])
  })

  it('lets the controller layer compose with existing Orca Mobile surfaces (FND-R1)', () => {
    const composition = [
      "import { useMobileSessionController } from '@/session/use-mobile-session-controller'",
      "import { MobileHomeHostList } from '@/home/MobileHomeHostList'",
      "import { useMobileDictation } from '@/hooks/use-mobile-dictation'",
      "import { MobileFileExplorerPanel } from '@/files/MobileFileExplorerPanel'",
      "import { TerminalPaneView } from '../../session/TerminalPaneView'"
    ]
    for (const source of composition) {
      expect(boundaryViolations(bindingProbe, source)).toEqual([])
      expect(boundaryViolations(providerProbe, source)).toEqual([])
    }
  })

  it('keeps raw control names in controller-input', () => {
    expect(rawControlViolations(inputProbe, "const axis = 'left-x'")).toEqual([])
    expect(rawControlViolations(bindingProbe, "if (button === 'rb') scroll()")).toEqual([
      `'rb' — ${RAW_CONTROL_RULE}`
    ])
    expect(rawControlViolations(wheelProbe, 'const held = `dpad-up`')).toEqual([
      `'dpad-up' — ${RAW_CONTROL_RULE}`
    ])
    // Intent vocabulary is what a surface is meant to speak.
    expect(rawControlViolations(bindingProbe, "dispatch({ kind: 'cycle-tab' })")).toEqual([])
    // A test names controls on purpose, and a test does not ship.
    expect(rawControlViolations(inputTestProbe, "it('maps l2', () => {})")).toEqual([])
  })

  it('keeps wheel geometry in wheel mechanics', () => {
    expect(wheelGeometryViolations(wheelProbe, 'const a = Math.atan2(y, x)')).toEqual([])
    expect(wheelGeometryViolations(wheelProbe, 'const centerAngle = 0')).toEqual([])
    expect(wheelGeometryViolations(bindingProbe, 'const a = Math.atan2(y, x)')).toEqual([
      `Math.atan2 — ${GEOMETRY_RULE}`
    ])
    expect(wheelGeometryViolations(providerProbe, 'const halfAngle = 1')).toEqual([
      `halfAngle — ${GEOMETRY_RULE}`
    ])
    // A preset carries angles as data; recomputing them there forks the geometry.
    expect(wheelGeometryViolations(presetProbe, 'const centerAngle = 0')).toEqual([])
    expect(wheelGeometryViolations(presetProbe, 'const a = Math.cos(t)')).toEqual([
      `Math.cos — ${PRESET_GEOMETRY_RULE}`
    ])
  })

  it('keeps the PRD mapping and the provisional D-pad set apart', () => {
    expect(mappingSetViolations(inputTestProbe, `import { ${PRD_SET} } from './bindings'`)).toEqual(
      []
    )
    expect(
      mappingSetViolations(
        inputTestProbe,
        `import { ${PRD_SET} } from './a'\nimport { ${PROVISIONAL_SET} } from './b'`
      )
    ).toEqual([`a test may reach one of them, not both — ${MAPPING_SET_RULE}`])
    expect(
      mappingSetViolations(inputProbe, `const ${PRD_SET} = []\nconst ${PROVISIONAL_SET} = []`)
    ).toEqual([`one module declares both — ${MAPPING_SET_RULE}`])
    // The resolver may read both behind one experiment flag; it declares neither.
    expect(
      mappingSetViolations(inputProbe, `resolve(${PRD_SET}, enabled ? ${PROVISIONAL_SET} : [])`)
    ).toEqual([])
  })

  it('marks every experiment preset non-contractual', () => {
    expect(
      presetContractViolations(presetProbe, "const p = { presetId: 'p1', contractual: false }")
    ).toEqual([])
    expect(
      presetContractViolations(presetProbe, "const p = { presetId: 'p1', segments: [] }")
    ).toEqual([PRESET_CONTRACT_RULE])
    expect(
      presetContractViolations(presetProbe, "const p = { presetId: 'p1', contractual: true }")
    ).toEqual([`contractual is not the literal false — ${PRESET_CONTRACT_RULE}`])
    expect(
      presetContractViolations(wheelProbe, 'const p = { segments: [], contractual: isApproved }')
    ).toEqual([`contractual is not the literal false — ${PRESET_CONTRACT_RULE}`])
    // Outside the experiment directory a segment list is ordinary wheel state.
    expect(presetContractViolations(wheelProbe, 'const state = { segments: [] }')).toEqual([])
  })

  it('stops the controller layer at the transport beneath a surface action (FND-R3)', () => {
    expect(
      lowLevelReachViolations(
        bindingProbe,
        "import { openHostLogicalClient } from '@/transport/host-logical-client'"
      )
    ).toEqual([`@/transport/host-logical-client — ${LOW_LEVEL_RULE}`])
    expect(
      lowLevelReachViolations(providerProbe, "const c = require('../transport/rpc-client')")
    ).toEqual([`../transport/rpc-client — ${LOW_LEVEL_RULE}`])
    expect(
      lowLevelReachViolations(
        bindingTestProbe,
        "import type { X } from '../../../../src/shared/rpc-contract/rpc-params-catalog.generated'"
      )
    ).toEqual([
      `../../../../src/shared/rpc-contract/rpc-params-catalog.generated — ${LOW_LEVEL_RULE}`
    ])
    expect(lowLevelReachViolations(bindingProbe, "import { View } from 'react-native'")).toEqual([])
  })

  it('refuses infrastructure Orca Mobile already ships (FND-AC2)', () => {
    const duplicates: readonly [string, string][] = [
      [`const s = new WebSocket(url)`, 'a socket or reconnect schedule'],
      [`const t = scheduleReconnect(host)`, 'a socket or reconnect schedule'],
      [`import { CameraView } from 'expo-camera'`, 'pairing decode or relay provisioning'],
      [`const m = 'pairing.claim'`, 'pairing decode or relay provisioning'],
      [`import * as Store from 'expo-secure-store'`, 'a second host, session, or credential store'],
      [`import * as Push from 'expo-notifications'`, 'push registration or catch-up'],
      [`const w = catchUpWatermark`, 'push registration or catch-up'],
      [`import { start } from '@orca/expo-two-way-audio'`, 'a microphone or speech pipeline'],
      [`const m = 'speech.dictation.start'`, 'a microphone or speech pipeline'],
      [`import { Terminal } from '@xterm/xterm'`, 'terminal stream decoding or viewport protocol'],
      [`decode(TerminalStreamOpcode.Output)`, 'terminal stream decoding or viewport protocol'],
      [`import * as Fs from 'expo-file-system'`, 'a file RPC layer'],
      [`const m = 'files.readDir'`, 'a file RPC layer']
    ]

    for (const [source, shape] of duplicates) {
      const violations = duplicateInfrastructureViolations(bindingProbe, source)
      expect(violations, source).toHaveLength(1)
      expect(violations[0]).toContain(shape)
    }
  })

  it('leaves the existing actions a binding is supposed to invoke alone', () => {
    const delegation = [
      // `003` §2 names reconnect as an existing host-list action, not a schedule to rebuild.
      'onConfirm(() => reconnectHost(hostId))',
      'onStop(() => stopAgentTurn(sessionId))',
      'onToggle(() => dictation.toggle())',
      'onScroll((velocity) => terminalPane.scrollBy(velocity))',
      'onOpen((entry) => openFileRoute(entry))'
    ]
    for (const source of delegation) {
      expect(duplicateInfrastructureViolations(bindingProbe, source), source).toEqual([])
    }
  })

  it('allows the exact existing-action imports 003 documents, not their neighbours', () => {
    expect(
      boundaryViolations(
        bindingProbe,
        "import { startPreProfilePairing } from '@/transport/pre-profile-pairing-coordinator'"
      )
    ).toEqual([])
    expect(
      lowLevelReachViolations(bindingProbe, "import { x } from '@/transport/rpc-client'")
    ).toHaveLength(1)
  })

  it('holds every rule across the whole controller tree', () => {
    const offenders = sourceFiles(gamepadRoot)
      .filter((path) => sourceExtensions.has(extname(path)) && path !== ratchetFile)
      .flatMap((path) =>
        boundaryViolations(path, readFileSync(path, 'utf8')).map(
          (violation) => `${relative(mobileRoot, path)}: ${violation}`
        )
      )

    expect(offenders).toEqual([])
  })
})
