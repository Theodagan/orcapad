import type { CompatVerdict } from '../transport/protocol-compat'

export type BlockedCompatVerdict = Extract<CompatVerdict, { kind: 'blocked' }>

/** The strip that stands in for the version wall: the host stays usable, the mismatch is said once. */
export function hostVersionNoticeMessage(input: {
  verdict: BlockedCompatVerdict
  /** Newest Orca Mobile release, when the update check has found one. */
  available: string | null
  installed: string | null
}): string {
  const installed = input.installed === null ? 'unknown' : `v${input.installed}`
  if (input.available !== null) {
    return `There is a new version of Orca v${input.available}, last sync was ${installed}`
  }
  return input.verdict.reason === 'desktop-too-old'
    ? 'Orca on your computer is older than this app expects; some features may not work'
    : `This desktop expects a newer Orca Mobile than ${installed}; some features may not work`
}
