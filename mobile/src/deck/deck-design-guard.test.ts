import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * DECK-R34 and R35: the deck takes every visual value from `theme/deck-theme.ts`, which in turn
 * takes them from Orca's tokens. A colour, a font size, a radius or a family written into a deck
 * component is how a second design system starts.
 *
 * The theme module is the one place allowed to name tokens, and even it names palette entries
 * rather than values. Test files are skipped: their probe strings are not styles.
 */

const deckRoot = import.meta.dirname
const themeModule = 'theme/deck-theme.ts'
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx'])

export type DeckSource = { readonly path: string; readonly text: string }

type Rule = {
  readonly name: string
  readonly pattern: RegExp
  readonly detail: string
}

const RULES: readonly Rule[] = [
  { name: 'colour literal', pattern: /#[0-9a-fA-F]{3,8}\b/, detail: 'hex colour' },
  { name: 'colour literal', pattern: /\brgba?\(/, detail: 'rgb() colour' },
  { name: 'font size literal', pattern: /fontSize:\s*['"]?\d/, detail: 'numeric fontSize' },
  {
    name: 'radius literal',
    pattern:
      /(?:borderRadius|borderTopLeftRadius|borderTopRightRadius|borderBottomLeftRadius|borderBottomRightRadius):\s*['"]?\d/,
    detail: 'numeric radius'
  },
  { name: 'font family literal', pattern: /fontFamily:\s*['"`]/, detail: 'font family string' },
  {
    name: 'second design system',
    pattern: /from\s+['"][^'"]*theme\/mobile-theme['"]/,
    detail: 'imports Orca tokens directly instead of deck-theme'
  },
  {
    name: 'maquette asset',
    pattern: /from\s+['"][^'"]*logos\//,
    detail: 'maquette logo where MobileAgentIcon has the agent'
  }
]

/** Every rule violation in one file, as `path: rule (detail)`. */
export function designViolations(file: DeckSource): string[] {
  if (file.path === themeModule) {
    return []
  }
  return RULES.filter((rule) => rule.pattern.test(file.text)).map(
    (rule) => `${file.path}: ${rule.name} (${rule.detail})`
  )
}

function walk(directory: string, files: DeckSource[]): void {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      walk(entryPath, files)
    } else if (
      SOURCE_EXTENSIONS.has(path.extname(entry.name)) &&
      !/\.test\.[jt]sx?$/.test(entry.name)
    ) {
      files.push({
        path: path.relative(deckRoot, entryPath).split(path.sep).join('/'),
        text: readFileSync(entryPath, 'utf8')
      })
    }
  }
}

const deckSources = (): DeckSource[] => {
  const files: DeckSource[] = []
  walk(deckRoot, files)
  return files
}

describe('deck design guard', () => {
  it('finds no visual value outside the deck theme', () => {
    expect(deckSources().flatMap(designViolations)).toEqual([])
  })

  it('flags a component that writes its own colour', () => {
    expect(
      designViolations({ path: 'session/Probe.tsx', text: "const style = { color: '#fff' }" })
    ).toEqual(['session/Probe.tsx: colour literal (hex colour)'])
    expect(
      designViolations({
        path: 'session/Probe.tsx',
        text: "const style = { color: 'rgba(0,0,0,0.4)' }"
      })
    ).toEqual(['session/Probe.tsx: colour literal (rgb() colour)'])
  })

  it('flags a component that writes its own type or corners', () => {
    expect(
      designViolations({
        path: 'session/Probe.tsx',
        text: "const style = { fontSize: 18, borderRadius: 12, fontFamily: 'Inter' }"
      })
    ).toEqual([
      'session/Probe.tsx: font size literal (numeric fontSize)',
      'session/Probe.tsx: radius literal (numeric radius)',
      'session/Probe.tsx: font family literal (font family string)'
    ])
  })

  it('flags a second design system and a maquette logo', () => {
    expect(
      designViolations({
        path: 'session/Probe.tsx',
        text: "import { colors } from '../../theme/mobile-theme'\nimport logo from '../../assets/logos/claude.svg'"
      })
    ).toEqual([
      'session/Probe.tsx: second design system (imports Orca tokens directly instead of deck-theme)',
      'session/Probe.tsx: maquette asset (maquette logo where MobileAgentIcon has the agent)'
    ])
  })

  it('allows the theme module and reads of theme roles', () => {
    expect(
      designViolations({
        path: themeModule,
        text: 'const theme = { color: palette.bgBase, fontSize: 22 }'
      })
    ).toEqual([])
    expect(
      designViolations({
        path: 'session/Ok.tsx',
        text: 'const style = { color: theme.color.text1, fontSize: theme.text.body }'
      })
    ).toEqual([])
  })
})
