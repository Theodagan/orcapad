import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  checkUpstream,
  collectImportSpecifiers,
  collectRpcMethods,
  resolveNativeImport
} from './deck-upstream-check.mjs'

const fixtures: string[] = []

afterEach(() => {
  for (const fixture of fixtures.splice(0)) {
    rmSync(fixture, { recursive: true, force: true })
  }
})

function fixtureTree(files: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), 'deck-upstream-'))
  fixtures.push(root)
  for (const [relative, contents] of Object.entries(files)) {
    const target = path.join(root, relative)
    mkdirSync(path.dirname(target), { recursive: true })
    writeFileSync(target, contents)
  }
  return root
}

function deckFile(imports: string, body = ''): string {
  return `${imports}\n${body}\nexport const probe = 1\n`
}

function methodsFile(names: readonly string[]): string {
  return `export const methods = [${names.map((name) => `'${name}'`).join(', ')}]\n`
}

describe('deck upstream check', () => {
  it('reads static and dynamic import specifiers once each', () => {
    const source = [
      "import { a } from './a'",
      "import { b } from './a'",
      "const lazy = () => import('../b')",
      "import type { C } from 'react'"
    ].join('\n')
    expect(collectImportSpecifiers(source)).toEqual(['./a', '../b', 'react'])
  })

  it('reads the methods a deck operation calls through a client', () => {
    const source = [
      "await client.sendRequest('files.list', {})",
      "await client.sendRequest('files.list')",
      "await client.request('worktree.list')",
      "const notACall = 'files.read'"
    ].join('\n')
    expect(collectRpcMethods(source)).toEqual(['files.list', 'worktree.list'])
  })

  it('resolves a TypeScript ESM specifier written with a .js extension', () => {
    const root = fixtureTree({ 'src/deck/neighbour.ts': 'export const neighbour = 1\n' })
    const from = path.join(root, 'src/deck/probe.ts')
    expect(resolveNativeImport(from, './neighbour.js')).toEqual({
      ok: true,
      file: path.join(root, 'src/deck/neighbour.ts')
    })
  })

  it('fails a probe import to a file that no longer exists', () => {
    const root = fixtureTree({
      'src/deck/probe.ts': deckFile("import { gone } from '../gone/module'"),
      'src/main/runtime/rpc/methods/methods.ts': methodsFile(['files.list'])
    })
    const { rows, ok } = checkUpstream({
      mobileRoot: root,
      rpcMethodsRoot: path.join(root, 'src/main/runtime/rpc/methods')
    })
    expect(ok).toBe(false)
    expect(rows).toContainEqual({
      check: 'native import',
      subject: 'src/deck/probe.ts → ../gone/module',
      ok: false,
      detail: 'no native file'
    })
  })

  it('fails an import whose only build is a .web one', () => {
    const root = fixtureTree({
      'src/deck/probe.ts': deckFile("import { web } from './web-only'"),
      'src/deck/web-only.web.tsx': 'export const web = 1\n',
      'src/main/runtime/rpc/methods/methods.ts': methodsFile(['files.list'])
    })
    const { ok, rows } = checkUpstream({
      mobileRoot: root,
      rpcMethodsRoot: path.join(root, 'src/main/runtime/rpc/methods')
    })
    expect(ok).toBe(false)
    expect(rows.map((row) => row.detail)).toContain('only a .web build exists')
  })

  it('fails a method the desktop no longer registers, and passes one it does', () => {
    const root = fixtureTree({
      'src/deck/operations.ts': deckFile(
        "import { useHostClient } from '../../transport/connection/host-client-hooks'",
        "await client.sendRequest('files.list')\nawait client.sendRequest('deck.removed')"
      ),
      'src/transport/connection/host-client-hooks.ts': 'export const useHostClient = 1\n',
      'src/main/runtime/rpc/methods/files.ts': methodsFile(['files.list'])
    })
    const { rows } = checkUpstream({
      mobileRoot: root,
      rpcMethodsRoot: path.join(root, 'src/main/runtime/rpc/methods')
    })
    expect(rows.filter((row) => row.check === 'rpc method')).toEqual([
      {
        check: 'rpc method',
        subject: 'src/deck/operations.ts → files.list',
        ok: true,
        detail: 'registered by the desktop'
      },
      {
        check: 'rpc method',
        subject: 'src/deck/operations.ts → deck.removed',
        ok: false,
        detail: 'not registered by the desktop'
      }
    ])
  })

  it('passes on this repository', () => {
    expect(checkUpstream().ok).toBe(true)
  })
})
