import { describe, expect, it } from 'vitest'
import { hostVersionNoticeMessage } from './host-version-notice'

const mobileTooOld = { kind: 'blocked', reason: 'mobile-too-old', desktopVersion: 9 } as const
const desktopTooOld = { kind: 'blocked', reason: 'desktop-too-old', desktopVersion: 1 } as const

describe('hostVersionNoticeMessage', () => {
  it('names the new release and the installed one', () => {
    expect(
      hostVersionNoticeMessage({ verdict: mobileTooOld, available: '1.4.0', installed: '1.3.2' })
    ).toBe('There is a new version of Orca v1.4.0, last sync was v1.3.2')
  })

  it('says which side is behind when no release is known', () => {
    expect(
      hostVersionNoticeMessage({ verdict: mobileTooOld, available: null, installed: '1.3.2' })
    ).toBe('This desktop expects a newer Orca Mobile than v1.3.2; some features may not work')
    expect(
      hostVersionNoticeMessage({ verdict: desktopTooOld, available: null, installed: null })
    ).toBe('Orca on your computer is older than this app expects; some features may not work')
  })
})
