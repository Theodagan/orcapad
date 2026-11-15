import { describe, expect, it } from 'vitest'
import {
  deleteBeforeSplitCursor,
  insertAtSplitCursor,
  splitKeysPlacement
} from './split-keys-layout'

const base = {
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
  occlusions: []
}

describe('split keys layout and cursors', () => {
  it('uses side halves in landscape and bottom keys in portrait', () => {
    expect(splitKeysPlacement({ ...base, windowWidth: 800, windowHeight: 400 }).orientation).toBe(
      'landscape'
    )
    expect(splitKeysPlacement({ ...base, windowWidth: 400, windowHeight: 800 }).orientation).toBe(
      'portrait'
    )
  })

  it("inserts and deletes at the owning half's cursor", () => {
    expect(insertAtSplitCursor('ab', 1, 'X')).toEqual({ text: 'aXb', cursor: 2 })
    expect(deleteBeforeSplitCursor('aXb', 2)).toEqual({ text: 'ab', cursor: 1 })
  })
})
