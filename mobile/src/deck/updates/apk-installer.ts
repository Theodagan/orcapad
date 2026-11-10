/**
 * D6: the APK is handed to Android with `expo-file-system`'s content URI and `expo-intent-launcher`,
 * under the `REQUEST_INSTALL_PACKAGES` permission declared in `app.json`. No custom native module.
 */
export type ApkInstallerDeps = {
  /** A `content://` URI Android's package installer may read. */
  getContentUriAsync(fileUri: string): Promise<string>
  startActivityAsync(
    action: 'android.intent.action.VIEW' | 'android.intent.action.INSTALL_PACKAGE',
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

export type InstallFailure =
  | { readonly kind: 'missing-file' }
  | { readonly kind: 'refused'; readonly resultCode: number }
  | { readonly kind: 'no-handler'; readonly reason: string }

export class ApkInstallError extends Error {
  readonly detail: InstallFailure

  constructor(detail: InstallFailure) {
    super(`apk install failed: ${detail.kind}`)
    this.detail = detail
  }
}

/** Throws `ApkInstallError` when the file is gone, no installer answers, or the user cancels. */
export async function installApk(args: {
  readonly fileUri: string
  readonly deps: ApkInstallerDeps
}): Promise<void> {
  let contentUri: string
  try {
    contentUri = await args.deps.getContentUriAsync(args.fileUri)
  } catch {
    throw new ApkInstallError({ kind: 'missing-file' })
  }
  let result: { readonly resultCode: number }
  try {
    result = await args.deps.startActivityAsync('android.intent.action.VIEW', {
      data: contentUri,
      flags: GRANT_READ_URI_PERMISSION,
      type: APK_MIME_TYPE
    })
  } catch (error: unknown) {
    // Android refuses to launch an installer it cannot resolve; that is a refusal to show, not a crash.
    throw new ApkInstallError({
      kind: 'no-handler',
      reason: error instanceof Error ? error.message : 'the installer could not be opened'
    })
  }
  if (result.resultCode !== RESULT_OK) {
    throw new ApkInstallError({ kind: 'refused', resultCode: result.resultCode })
  }
}
