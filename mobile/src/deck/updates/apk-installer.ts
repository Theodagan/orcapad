/**
 * D6: handing the APK to Android. The result code belongs to the installer activity the user came
 * back from, not to the package manager's verdict, so it travels out as data — Orcapad never claims
 * an install happened because an activity returned.
 *
 * Size and digest are re-checked here, after the download and before a URI is handed over: a cache
 * eviction or a truncated file must fail as its own reason instead of an installer error.
 */
export type ApkInstallerDeps = {
  /** Bytes of the file at `fileUri`, or `null` when it is no longer there. */
  fileSize(fileUri: string): Promise<number | null>
  /** Lower-case hex sha256 of the file at `fileUri`. */
  digestSha256(fileUri: string): Promise<string>
  /** A `content://` URI Android's package installer may read. */
  getContentUriAsync(fileUri: string): Promise<string>
  startActivityAsync(
    action: 'android.intent.action.VIEW',
    options: {
      readonly data: string
      readonly flags: number
      readonly type?: string
    }
  ): Promise<{ readonly resultCode: number }>
  /** Android's own "install unknown apps" screen, per package. */
  openUnknownSourcesSettings(packageUri: string): Promise<unknown>
}

export const APK_MIME_TYPE = 'application/vnd.android.package-archive'
/** FLAG_GRANT_READ_URI_PERMISSION: the installer reads the file, not the app. */
export const GRANT_READ_URI_PERMISSION = 1
export const RESULT_OK = -1
export const RESULT_CANCELED = 0

export type InstallFailure =
  | { readonly kind: 'file-gone'; readonly reason: string }
  | { readonly kind: 'size'; readonly expected: number; readonly received: number }
  | { readonly kind: 'digest'; readonly expected: string; readonly received: string }
  | { readonly kind: 'unlaunchable'; readonly reason: string }

/** What the installer activity reported when the user returned. A report, never proof. */
export type InstallReport = { readonly resultCode: number }

export class ApkInstallError extends Error {
  readonly detail: InstallFailure

  constructor(detail: InstallFailure) {
    super(`apk install failed: ${detail.kind}`)
    this.detail = detail
  }
}

/** The platform's own words, so a refusal keeps its cause instead of becoming `cancelled`. */
export function failureReason(error: unknown, fallback: string): string {
  return error instanceof Error && error.message !== '' ? error.message : fallback
}

export async function installApk(args: {
  readonly fileUri: string
  readonly expectedBytes: number
  readonly expectedDigest: string | null
  readonly deps: ApkInstallerDeps
}): Promise<InstallReport> {
  const { fileUri, deps } = args

  let size: number | null
  try {
    size = await deps.fileSize(fileUri)
  } catch (error: unknown) {
    throw new ApkInstallError({
      kind: 'file-gone',
      reason: failureReason(error, 'the downloaded update cannot be read')
    })
  }
  if (size === null) {
    throw new ApkInstallError({
      kind: 'file-gone',
      reason: 'the downloaded update is no longer in the cache'
    })
  }
  if (size !== args.expectedBytes) {
    throw new ApkInstallError({ kind: 'size', expected: args.expectedBytes, received: size })
  }
  if (args.expectedDigest !== null) {
    let received: string
    try {
      received = (await deps.digestSha256(fileUri)).toLowerCase()
    } catch (error: unknown) {
      throw new ApkInstallError({
        kind: 'file-gone',
        reason: failureReason(error, 'the downloaded update cannot be read')
      })
    }
    if (received !== args.expectedDigest) {
      throw new ApkInstallError({
        kind: 'digest',
        expected: args.expectedDigest,
        received
      })
    }
  }

  let contentUri: string
  try {
    contentUri = await deps.getContentUriAsync(fileUri)
  } catch (error: unknown) {
    throw new ApkInstallError({
      kind: 'unlaunchable',
      reason: failureReason(error, 'Android would not expose the downloaded file')
    })
  }

  try {
    const result = await deps.startActivityAsync('android.intent.action.VIEW', {
      data: contentUri,
      flags: GRANT_READ_URI_PERMISSION,
      type: APK_MIME_TYPE
    })
    return { resultCode: result.resultCode }
  } catch (error: unknown) {
    // A missing installer, a blocked intent or a refused permission all arrive here with a reason.
    throw new ApkInstallError({
      kind: 'unlaunchable',
      reason: failureReason(error, 'the installer could not be opened')
    })
  }
}
