import { sha256 } from '@noble/hashes/sha256'
import { bytesToHex } from '@noble/hashes/utils'

/**
 * DECK-R45: the release digest is over the APK's bytes, so the file is hashed as bytes. Feeding
 * `digestStringAsync` the base64 text hashed the encoding instead, which no release could match.
 *
 * The read half is a platform detail (`expo-file-system`'s `FileHandle`), so the chunk loop takes it
 * as a parameter and a test can drive it with known bytes.
 */
export type ByteSource = {
  /** Bytes the file reports; a short read below it is a broken download, not a valid digest. */
  readonly size: number
  /** The next `bytes` bytes from the current offset. */
  read(bytes: number): Uint8Array
  close(): void
}

/** 1 MiB chunks: large enough to keep native calls rare, small enough to never hold the APK twice. */
export const HASH_CHUNK_BYTES = 1024 * 1024
/** Hashing runs on the JS thread, so it hands the UI back once per this many bytes. */
export const HASH_YIELD_BYTES = 8 * 1024 * 1024

export class ShortReadError extends Error {
  constructor(read: number, size: number) {
    super(`the file ended after ${read} of ${size} bytes`)
  }
}

const nextTask = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

/** Lower-case hex SHA-256 of the source's bytes, hashed as they arrive. */
export async function sha256OfBytes(
  source: ByteSource,
  options: {
    readonly chunkBytes?: number
    readonly yieldBytes?: number
    readonly pause?: () => Promise<void>
  } = {}
): Promise<string> {
  const chunkBytes = options.chunkBytes ?? HASH_CHUNK_BYTES
  const yieldBytes = options.yieldBytes ?? HASH_YIELD_BYTES
  const pause = options.pause ?? nextTask
  const hash = sha256.create()
  let read = 0
  let sinceYield = 0
  try {
    while (read < source.size) {
      const chunk = source.read(Math.min(chunkBytes, source.size - read))
      if (chunk.length === 0) {
        throw new ShortReadError(read, source.size)
      }
      hash.update(chunk)
      read += chunk.length
      sinceYield += chunk.length
      if (sinceYield >= yieldBytes) {
        sinceYield = 0
        await pause()
      }
    }
  } finally {
    source.close()
  }
  return bytesToHex(hash.digest())
}

/** The same digest for an on-disk file, opened through whichever platform handle the caller has. */
export function sha256OfFile(
  uri: string,
  open: (uri: string) => ByteSource,
  options?: Parameters<typeof sha256OfBytes>[1]
): Promise<string> {
  return sha256OfBytes(open(uri), options)
}
