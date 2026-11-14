import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * KEY-9: no Android IME over a deck screen. One wrapper owns the keyboard decision, and every other
 * module in `src/deck/` that wants text goes through it — a raw `TextInput` anywhere else would open
 * the IME over a pad screen and cover the deck.
 */
const deckRoot = path.dirname(import.meta.dirname)
const WRAPPER = 'keys/deck-text-field.tsx'
const SOURCE = /\.(?:ts|tsx)$/
const IMPORTS_TEXT_INPUT =
  /import\s*(?:type\s*)?\{[^}]*\bTextInput\b[^}]*\}\s*from\s*['"]react-native['"]/

export type DeckSource = { readonly path: string; readonly text: string }

/** Every module that names `TextInput` without being the wrapper, as `path: reason`. */
export function imeGuardedViolations(files: readonly DeckSource[]): string[] {
  return files
    .filter((file) => file.path !== WRAPPER && !/\.test\./.test(file.path))
    .filter((file) => IMPORTS_TEXT_INPUT.test(file.text))
    .map((file) => `${file.path}: imports TextInput instead of DeckTextField`)
}

function deckSources(directory: string, relative = '', found: DeckSource[] = []): DeckSource[] {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const next = relative === '' ? entry.name : `${relative}/${entry.name}`
    if (entry.isDirectory()) {
      deckSources(path.join(directory, entry.name), next, found)
    } else if (SOURCE.test(entry.name)) {
      found.push({ path: next, text: readFileSync(path.join(directory, entry.name), 'utf8') })
    }
  }
  return found
}

describe('the deck text field guard', () => {
  it('finds no raw TextInput anywhere in src/deck', () => {
    expect(imeGuardedViolations(deckSources(deckRoot))).toEqual([])
  })

  // The guard has to fail, or the rule above proves nothing.
  it('names a module that takes TextInput from react-native', () => {
    expect(
      imeGuardedViolations([
        { path: 'session/DeckComposer.tsx', text: "import { TextInput, View } from 'react-native'" }
      ])
    ).toEqual(['session/DeckComposer.tsx: imports TextInput instead of DeckTextField'])
  })

  it('accepts the wrapper and the tests beside it', () => {
    expect(
      imeGuardedViolations([
        { path: WRAPPER, text: "import { TextInput } from 'react-native'" },
        { path: 'session/DeckComposer.test.tsx', text: "import { TextInput } from 'react-native'" }
      ])
    ).toEqual([])
  })
})
