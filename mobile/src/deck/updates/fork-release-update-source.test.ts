import { describe, expect, it, vi } from 'vitest'
import {
  createForkReleaseUpdateSource,
  FORK_REPO,
  FORK_TAG_PREFIX,
  installableRelease,
  parseForkTagVersions
} from './fork-release-update-source'

const APK_DIGEST = 'sha256:3f9c2b7d4e1a58c6b0d2f4a6e8c0b2d4f6a8c0e2b4d6f8a0c2e4b6d8f0a2c4e6'

function json(body: unknown, status = 200): Response {
  return { ok: status < 400, status, json: async () => body } as unknown as Response
}

function sourceWith(replies: Record<string, Response>) {
  const fetchImpl = vi.fn(async (url: string) => {
    const reply = replies[url]
    if (reply === undefined) {
      throw new Error(`unexpected request: ${url}`)
    }
    return reply
  })
  return { source: createForkReleaseUpdateSource(fetchImpl as unknown as typeof fetch), fetchImpl }
}

const tagsUrl = `https://api.github.com/repos/${FORK_REPO}/git/matching-refs/tags/${FORK_TAG_PREFIX}`
const releaseUrl = (version: string) =>
  `https://api.github.com/repos/${FORK_REPO}/releases/tags/${FORK_TAG_PREFIX}${version}`

function release(version: string, withApk = true) {
  return json({
    draft: false,
    assets: withApk
      ? [
          {
            name: `orcapad-${version}.apk`,
            browser_download_url: `https://github.com/${FORK_REPO}/releases/download/${FORK_TAG_PREFIX}${version}/orcapad-${version}.apk`,
            size: 48_000_000,
            digest: APK_DIGEST
          }
        ]
      : []
  })
}

describe('fork release update source', () => {
  it('finds a newer release with its APK, size and digest', async () => {
    const { source } = sourceWith({
      [tagsUrl]: json([{ ref: `refs/tags/${FORK_TAG_PREFIX}1.5.0` }]),
      [releaseUrl('1.5.0')]: release('1.5.0')
    })
    const result = await source.checkRelease('1.4.214', new AbortController().signal)
    expect(result).toEqual({
      kind: 'available',
      release: {
        version: '1.5.0',
        apkUrl: `https://github.com/${FORK_REPO}/releases/download/${FORK_TAG_PREFIX}1.5.0/orcapad-1.5.0.apk`,
        sizeBytes: 48_000_000,
        digest: APK_DIGEST
      }
    })
    expect(await source.check('1.4.214', new AbortController().signal)).toEqual({
      kind: 'available',
      version: '1.5.0',
      url: `https://github.com/${FORK_REPO}/releases/download/${FORK_TAG_PREFIX}1.5.0/orcapad-1.5.0.apk`
    })
  })

  it('says current when nothing newer exists', async () => {
    const { source } = sourceWith({
      [tagsUrl]: json([{ ref: `refs/tags/${FORK_TAG_PREFIX}1.4.214` }])
    })
    expect(await source.checkRelease('1.4.214', new AbortController().signal)).toEqual({
      kind: 'current'
    })
  })

  it('skips a tag whose release carries no APK', async () => {
    const { source } = sourceWith({
      [tagsUrl]: json([
        { ref: `refs/tags/${FORK_TAG_PREFIX}1.5.0` },
        { ref: `refs/tags/${FORK_TAG_PREFIX}1.4.300` }
      ]),
      [releaseUrl('1.5.0')]: release('1.5.0', false),
      [releaseUrl('1.4.300')]: release('1.4.300')
    })
    const result = await source.checkRelease('1.4.214', new AbortController().signal)
    expect(result.kind === 'available' ? result.release.version : null).toBe('1.4.300')
  })

  it('surfaces a rate-limited reply instead of reporting the app up to date', async () => {
    const { source } = sourceWith({ [tagsUrl]: json({ message: 'rate limited' }, 403) })
    await expect(source.checkRelease('1.4.214', new AbortController().signal)).rejects.toThrow(
      'tag refs HTTP 403'
    )
    await expect(source.check('1.4.214', new AbortController().signal)).rejects.toThrow(
      'tag refs HTTP 403'
    )
  })

  it('never asks upstream for anything', async () => {
    const { source, fetchImpl } = sourceWith({
      [tagsUrl]: json([{ ref: `refs/tags/${FORK_TAG_PREFIX}1.5.0` }]),
      [releaseUrl('1.5.0')]: release('1.5.0')
    })
    await source.checkRelease('1.4.214', new AbortController().signal)
    const urls = fetchImpl.mock.calls.map(([url]) => String(url))
    expect(urls.length).toBeGreaterThan(0)
    for (const url of urls) {
      expect(url).toContain(FORK_REPO)
      expect(url).not.toContain('stablyai')
    }
  })

  it('reads tag refs and release assets leniently', () => {
    expect(
      parseForkTagVersions([
        { ref: `refs/tags/${FORK_TAG_PREFIX}1.5.0`, extra: true },
        { ref: 'refs/tags/mobile-android-v9.9.9' }
      ])
    ).toEqual(['1.5.0'])
    expect(installableRelease({ draft: false, assets: [] }, '1.5.0')).toBeNull()
    expect(installableRelease({ draft: true, assets: [] }, '1.5.0')).toBeNull()
    expect(installableRelease({ nope: true }, '1.5.0')).toBeNull()
  })
})
