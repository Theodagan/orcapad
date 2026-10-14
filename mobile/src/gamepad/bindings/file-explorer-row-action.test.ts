import { describe, expect, it } from 'vitest'
import { rowAction } from './file-explorer-row-action'

describe('file explorer row action', () => {
  it('gives each kind of row the action it actually has', () => {
    expect(rowAction({ kind: 'directory' })).toBe('toggle-directory')
    expect(rowAction({ kind: 'text' })).toBe('preview-file')
    expect(rowAction({ kind: 'binary' })).toBe('preview-file')
    expect(rowAction({ kind: 'error' })).toBe('retry-directory')
  })

  // A placeholder is a row with nothing behind it yet; pressing it must not guess at one.
  it('does nothing on a loading placeholder, or on no row at all', () => {
    expect(rowAction({ kind: 'loading' })).toBe('none')
    expect(rowAction(null)).toBe('none')
  })
})
