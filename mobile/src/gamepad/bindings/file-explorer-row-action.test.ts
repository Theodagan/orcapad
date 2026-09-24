import { describe, expect, it, vi } from 'vitest'
import {
  EXPLORER_WHEEL_ACTION_IDS,
  explorerWheelActions,
  rowAction
} from './file-explorer-row-action'

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

describe('explorer wheel actions', () => {
  const callbacks = {
    previewSelected: vi.fn(),
    collapseAll: vi.fn(),
    reloadSelected: vi.fn(),
    hasSelection: true
  }

  it('offers every id a preset can name', () => {
    expect(explorerWheelActions(callbacks).map((action) => action.id)).toEqual([
      EXPLORER_WHEEL_ACTION_IDS.preview,
      EXPLORER_WHEEL_ACTION_IDS.collapseAll,
      EXPLORER_WHEEL_ACTION_IDS.reload
    ])
  })

  // `002` §6: a segment with nothing to act on renders disabled and cancels, rather than firing.
  it('disables what needs a selection when there is none', () => {
    const actions = explorerWheelActions({ ...callbacks, hasSelection: false })
    const availability = new Map(actions.map((action) => [action.id, action.availability]))

    expect(availability.get(EXPLORER_WHEEL_ACTION_IDS.preview)).toBe('unavailable')
    expect(availability.get(EXPLORER_WHEEL_ACTION_IDS.reload)).toBe('unavailable')
    // Collapsing the tree needs no selection at all.
    expect(availability.get(EXPLORER_WHEEL_ACTION_IDS.collapseAll)).toBe('available')
  })

  // The `files.` prefix is reserved for the RPC layer a binding must never become (FND-AC2).
  it('claims no id in the file RPC namespace', () => {
    for (const id of Object.values(EXPLORER_WHEEL_ACTION_IDS)) {
      expect(id.startsWith('files.')).toBe(false)
    }
  })
})
