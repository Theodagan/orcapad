import { describe, expect, it } from 'vitest'
import {
  lenientEnum,
  lenientList,
  lenientNumber,
  lenientParse,
  lenientRecord,
  lenientText,
  withUnknownFields
} from './lenient-host-data'

const STATUSES = ['running', 'waiting', 'idle'] as const

describe('lenient host data', () => {
  it('keeps a field this build has never heard of', () => {
    const reply = { status: 'running', turnsUntilCompaction: 12 }
    const parsed = withUnknownFields({ status: lenientEnum(reply.status, STATUSES) }, reply)
    expect(parsed).toEqual({ status: 'running', turnsUntilCompaction: 12 })
  })

  it('maps an unknown status to a neutral value instead of failing', () => {
    expect(lenientEnum('hibernating', STATUSES)).toBe('unknown')
    expect(lenientEnum(undefined, STATUSES)).toBe('unknown')
    expect(lenientEnum(7, STATUSES)).toBe('unknown')
    expect(lenientEnum('waiting', STATUSES)).toBe('waiting')
  })

  it('drops one unreadable row and keeps the rest of the list', () => {
    const rows = [{ id: 'a' }, { nope: true }, { id: 'b' }, null]
    expect(
      lenientList(rows, (row) => {
        const id = lenientText(lenientRecord(row).id)
        return id === '' ? null : id
      })
    ).toEqual(['a', 'b'])
    expect(lenientList({ not: 'a list' }, () => 'x')).toEqual([])
  })

  it('treats a parser that throws as one unreadable row', () => {
    expect(
      lenientParse(() => {
        throw new Error('schema mismatch')
      }, {})
    ).toBeNull()
    expect(lenientParse((raw) => lenientText(raw), 'kept')).toBe('kept')
  })

  it('reads a number the host sent as text, and keeps the fallback for anything else', () => {
    expect(lenientNumber('42', 0)).toBe(42)
    expect(lenientNumber(7, 0)).toBe(7)
    expect(lenientNumber('', 5)).toBe(5)
    expect(lenientNumber(Number.NaN, 5)).toBe(5)
    expect(lenientNumber(null, 5)).toBe(5)
  })
})
