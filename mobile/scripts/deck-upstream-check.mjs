#!/usr/bin/env node
// Deck merge checklist, items 1 and 2 of PRD §5.3: every Orca module the deck imports still has a
// native file, and every RPC method the deck calls still exists on the desktop. Run before merging
// upstream into the fork.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const MOBILE_ROOT = fileURLToPath(new URL('..', import.meta.url))
const DEFAULT_RPC_METHODS_ROOT = path.join(
  MOBILE_ROOT,
  '..',
  'src',
  'main',
  'runtime',
  'rpc',
  'methods'
)
// Only the deck is under review: the rest of Orca Mobile is upstream's own code.
const DECK_ROOTS = ['src/deck', 'app/deck']
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts'])
const RESOLUTION_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts']
const SKIP_DIRECTORIES = new Set(['node_modules', 'dist', 'out'])
const IMPORT_SPECIFIER = /(?:from\s*|import\s*\(\s*)['"]([^'"]+)['"]/g
const RPC_CALL = /(?:sendRequest|request)\(\s*['"]([a-z][\w]*(?:\.[\w]+)+)['"]/g

function walk(directory) {
  if (!existsSync(directory)) {
    return []
  }
  const files = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (SKIP_DIRECTORIES.has(entry.name)) {
      continue
    }
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...walk(entryPath))
    } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(entryPath)
    }
  }
  return files
}

function deckFiles(mobileRoot) {
  // Tests hold probe strings that are not imports; only shipped sources are checked.
  return DECK_ROOTS.flatMap((root) => walk(path.join(mobileRoot, root))).filter(
    (file) => !/\.test\.[cm]?[jt]sx?$/.test(file)
  )
}

/** Specifiers a file imports, in source order and without duplicates. */
export function collectImportSpecifiers(source) {
  const found = []
  for (const match of source.matchAll(IMPORT_SPECIFIER)) {
    if (!found.includes(match[1])) {
      found.push(match[1])
    }
  }
  return found
}

/** RPC methods a file calls through a client (`client.sendRequest('files.list', …)`). */
export function collectRpcMethods(source) {
  const found = []
  for (const match of source.matchAll(RPC_CALL)) {
    if (!found.includes(match[1])) {
      found.push(match[1])
    }
  }
  return found
}

function isFile(candidate) {
  return existsSync(candidate) && statSync(candidate).isFile()
}

/** TypeScript ESM writes `./x.js` for `./x.ts`; try the specifier as written first, then the swap. */
function resolutionBases(specifier) {
  const bases = [specifier]
  for (const extension of ['.js', '.jsx', '.mjs', '.cjs']) {
    if (specifier.endsWith(extension)) {
      bases.push(specifier.slice(0, -extension.length))
    }
  }
  return bases
}

/**
 * The native build's file for one relative import. A `.web.*` sibling alone is a failure: the deck
 * runs on Android, where Metro resolves the platform-agnostic file and there is none.
 */
export function resolveNativeImport(fromFile, specifier) {
  const base = path.resolve(path.dirname(fromFile), specifier)
  let webOnly = false
  for (const candidateBase of resolutionBases(base)) {
    for (const extension of RESOLUTION_EXTENSIONS) {
      for (const candidate of [
        candidateBase + extension,
        path.join(candidateBase, `index${extension}`)
      ]) {
        if (!isFile(candidate)) {
          continue
        }
        if (candidate.includes('.web.')) {
          webOnly = true
          continue
        }
        return { ok: true, file: candidate }
      }
    }
    for (const extension of RESOLUTION_EXTENSIONS) {
      for (const candidate of [
        `${candidateBase}.web${extension}`,
        path.join(candidateBase, `index.web${extension}`)
      ]) {
        if (isFile(candidate)) {
          webOnly = true
        }
      }
    }
  }
  return webOnly
    ? { ok: false, reason: 'only a .web build exists' }
    : { ok: false, reason: 'no native file' }
}

/** Method names the desktop registers, read from the RPC method modules themselves. */
export function collectDesktopRpcMethods(methodsRoot) {
  const methods = new Set()
  for (const file of walk(methodsRoot)) {
    if (file.endsWith('.test.ts') || file.endsWith('.test.tsx')) {
      continue
    }
    for (const match of readFileSync(file, 'utf8').matchAll(/'([a-z][\w]*(?:\.[\w]+)+)'/g)) {
      methods.add(match[1])
    }
  }
  return methods
}

/**
 * The two checks as rows. `mobileRoot` and `rpcMethodsRoot` are arguments so a test can point the
 * same code at a fixture instead of the repository.
 */
export function checkUpstream({
  mobileRoot = MOBILE_ROOT,
  rpcMethodsRoot = DEFAULT_RPC_METHODS_ROOT
} = {}) {
  const rows = []
  const files = deckFiles(mobileRoot)
  const rpcMethods = collectDesktopRpcMethods(rpcMethodsRoot)
  for (const file of files) {
    const source = readFileSync(file, 'utf8')
    const relative = path.relative(mobileRoot, file).split(path.sep).join('/')
    for (const specifier of collectImportSpecifiers(source)) {
      if (!specifier.startsWith('.')) {
        continue
      }
      const resolved = resolveNativeImport(file, specifier)
      rows.push({
        check: 'native import',
        subject: `${relative} → ${specifier}`,
        ok: resolved.ok,
        detail: resolved.ok ? 'native file present' : resolved.reason
      })
    }
    for (const method of collectRpcMethods(source)) {
      rows.push({
        check: 'rpc method',
        subject: `${relative} → ${method}`,
        ok: rpcMethods.has(method),
        detail: rpcMethods.has(method)
          ? 'registered by the desktop'
          : 'not registered by the desktop'
      })
    }
  }
  return { rows, ok: rows.every((row) => row.ok) }
}

function main() {
  const { rows, ok } = checkUpstream()
  const width = rows.reduce((widest, row) => Math.max(widest, row.subject.length), 0)
  for (const row of rows) {
    const status = row.ok ? 'pass' : 'FAIL'
    console.log(`${status}  ${row.check.padEnd(13)}  ${row.subject.padEnd(width)}  ${row.detail}`)
  }
  const failed = rows.filter((row) => !row.ok).length
  console.log(`\n${rows.length} checks, ${failed} failed`)
  process.exitCode = ok ? 0 : 1
}

if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  main()
}
