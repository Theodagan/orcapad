import { describe, expect, it } from 'vitest'
import { sha256OfBytes, sha256OfFile, ShortReadError, type ByteSource } from './file-sha256'

/** APK-shaped bytes: ZIP magic, a NUL, invalid UTF-8, CR/LF and a plain ASCII tail. */
const APK_BYTES = Uint8Array.from([
  0x50, 0x4b, 0x03, 0x04, 0x00, 0xff, 0xfe, 0x7f, 0x80, 0x0a, 0x0d, 0x00, 0x6f, 0x72, 0x63, 0x61,
  0x70, 0x61, 0x64, 0x00, 0x00, 0x00, 0xc3, 0x28
])

/** sha256 over those bytes, taken independently of the code under test. */
const APK_SHA256 = '4f4ee4d48ecbbd4975de61f5f5089558b59cfb41e28d6009411b11ff97a37ddb'

/** The digest of the same bytes' base64 text — what hashing the encoding would have produced. */
const BASE64_TEXT_SHA256 = '2f159af68754b48ec35a871bcfb6b76c5a605ca0eb1a63a8c28091a3f3bdca5b'

function source(bytes: Uint8Array, reportedSize = bytes.length): ByteSource {
  let offset = 0
  return {
    size: reportedSize,
    read(count) {
      const chunk = bytes.subarray(offset, offset + count)
      offset += chunk.length
      return chunk
    },
    close() {}
  }
}

const noPause = async (): Promise<void> => {}

describe('APK digest', () => {
  it('hashes the file’s bytes, not the text they were encoded to', async () => {
    const digest = await sha256OfFile('file:///cache/orcapad-update-1.5.0.apk', () =>
      source(APK_BYTES)
    )
    expect(digest).toBe(APK_SHA256)
    expect(APK_SHA256).not.toBe(BASE64_TEXT_SHA256)
  })

  it('answers the same digest whatever the chunk boundaries are', async () => {
    for (const chunkBytes of [1, 3, 7, 1024]) {
      expect(await sha256OfBytes(source(APK_BYTES), { chunkBytes, pause: noPause })).toBe(
        APK_SHA256
      )
    }
  })

  it('refuses a file shorter than it claims instead of hashing a truncated APK', async () => {
    await expect(
      sha256OfBytes(source(APK_BYTES, APK_BYTES.length + 1), { pause: noPause })
    ).rejects.toBeInstanceOf(ShortReadError)
  })
})
