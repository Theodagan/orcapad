import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * DECK-R40's seam, in both directions.
 *
 * Outward: nothing in Orca may import the deck, so the deck can be deleted or rewritten without
 * touching upstream's code. Inward: the deck reaches the engine through the data API and the
 * engine modules, never through the page shell — a deck screen that loaded the downloaded page or
 * spoke to its bridge would be a second Orca, not a second interface to the same one.
 *
 * Source text rather than a module graph, for the same reason as the gamepad ratchets: a rule
 * that only fires once a file exists is a rule nobody notices is missing. Each predicate is
 * exported and tested against probe sources.
 */

const mobileRoot = fileURLToPath(new URL('../..', import.meta.url))
const deckRoots = ['src/deck/', 'app/deck/']
const ORCA_ROOTS = ['src/', 'app/']
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts'])
const IMPORT_SPECIFIER = /(?:from\s*|import\s*\(\s*|require\(\s*)['"]([^'"]+)['"]/g

/** The page shell and its bundle: a deck screen must never need either (DECK-R40). */
const PAGE_SHELL_PATTERN =
  /(?:^|\/)(?:mobile-web-shell|orca-mobile-web-shell)(?:\/|$)|transport\/mobile-web-bundle-/

export type SourceFile = {
  /** Path relative to `mobile/`, with forward slashes. */
  readonly path: string
  readonly text: string
}

export function importSpecifiers(text: string): string[] {
  const specifiers: string[] = []
  for (const match of text.matchAll(IMPORT_SPECIFIER)) {
    if (!specifiers.includes(match[1])) {
      specifiers.push(match[1])
    }
  }
  return specifiers
}

export function isDeckPath(filePath: string): boolean {
  return deckRoots.some((root) => filePath.startsWith(root))
}

/** Where a relative or `@/` specifier lands, relative to `mobile/`. */
export function resolveSpecifier(fromPath: string, specifier: string): string | null {
  if (specifier.startsWith('@/')) {
    return path.posix.normalize(`src/${specifier.slice(2)}`)
  }
  if (!specifier.startsWith('.')) {
    return null
  }
  return path.posix.normalize(path.posix.join(path.posix.dirname(fromPath), specifier))
}

/** Rule one: only the deck's own folders may name the deck. */
export function outsideDeckViolations(files: readonly SourceFile[]): string[] {
  const violations: string[] = []
  for (const file of files) {
    if (isDeckPath(file.path)) {
      continue
    }
    for (const specifier of importSpecifiers(file.text)) {
      const resolved = resolveSpecifier(file.path, specifier)
      if (resolved !== null && isDeckPath(resolved)) {
        violations.push(`${file.path} imports the deck: ${specifier}`)
      }
    }
  }
  return violations
}

/** Rule two: the deck never loads the page, uses its bridge, or calls a bundle method. */
export function deckPageShellViolations(files: readonly SourceFile[]): string[] {
  const violations: string[] = []
  for (const file of files) {
    if (!isDeckPath(file.path)) {
      continue
    }
    for (const specifier of importSpecifiers(file.text)) {
      if (PAGE_SHELL_PATTERN.test(specifier)) {
        violations.push(`${file.path} reaches the page shell: ${specifier}`)
      }
    }
  }
  return violations
}

function walk(directory: string, files: SourceFile[]): void {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'out') {
      continue
    }
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      walk(entryPath, files)
    } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push({
        path: path.relative(mobileRoot, entryPath).split(path.sep).join('/'),
        text: readFileSync(entryPath, 'utf8')
      })
    }
  }
}

/** Shipped sources only: a test's probe strings are not imports, and this file is full of them. */
function orcaSources(): SourceFile[] {
  const files: SourceFile[] = []
  for (const root of ORCA_ROOTS) {
    walk(path.join(mobileRoot, root), files)
  }
  return files.filter((file) => !/\.test\.[jt]sx?$/.test(file.path))
}

const repositorySources = orcaSources()

describe('deck boundary', () => {
  it('is imported by nothing outside its own folders', () => {
    expect(outsideDeckViolations(repositorySources)).toEqual([])
  })

  it('imports neither the page shell nor the bundle', () => {
    expect(deckPageShellViolations(repositorySources)).toEqual([])
  })

  it('flags an Orca module that imports the deck', () => {
    expect(
      outsideDeckViolations([
        {
          path: 'src/home/MobileHomeScreen.tsx',
          text: "import { DeckShell } from '../deck/DeckShell'"
        },
        { path: 'app/settings.tsx', text: "export { DeckShell } from '../src/deck/DeckShell'" },
        { path: 'src/home/Probe.tsx', text: "const shell = await import('@/deck/DeckShell')" }
      ])
    ).toEqual([
      'src/home/MobileHomeScreen.tsx imports the deck: ../deck/DeckShell',
      'app/settings.tsx imports the deck: ../src/deck/DeckShell',
      'src/home/Probe.tsx imports the deck: @/deck/DeckShell'
    ])
  })

  it('allows the deck to import the rest of Orca', () => {
    expect(
      outsideDeckViolations([
        {
          path: 'src/deck/DeckShell.tsx',
          text: "import { MobileStateView } from '../components/MobileStateView'"
        }
      ])
    ).toEqual([])
  })

  it('flags a deck file that reaches the page shell or its bundle', () => {
    expect(
      deckPageShellViolations([
        {
          path: 'src/deck/a.ts',
          text: "import { x } from '../mobile-web-shell/bridge/bridge-client'"
        },
        {
          path: 'src/deck/b.ts',
          text: "import y from '../../../modules/orca-mobile-web-shell/src/x'"
        },
        {
          path: 'src/deck/c.ts',
          text: "import { z } from '../transport/mobile-web-bundle-loader'"
        },
        { path: 'src/deck/d.ts', text: "import { ok } from '../components/MobileStateView'" }
      ])
    ).toEqual([
      'src/deck/a.ts reaches the page shell: ../mobile-web-shell/bridge/bridge-client',
      'src/deck/b.ts reaches the page shell: ../../../modules/orca-mobile-web-shell/src/x',
      'src/deck/c.ts reaches the page shell: ../transport/mobile-web-bundle-loader'
    ])
  })
})
