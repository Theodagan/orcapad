import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir, platform } from 'node:os'
import { join } from 'node:path'

/**
 * Where the Android SDK and a JDK live on this machine. Gradle needs both exported, and the
 * locations differ per install route — Homebrew's cask, Android Studio, or a CI image — so
 * every Android script resolves them here rather than hard-coding one developer's setup.
 */

const SDK_CANDIDATES = [
  process.env.ANDROID_HOME,
  process.env.ANDROID_SDK_ROOT,
  '/opt/homebrew/share/android-commandlinetools',
  '/usr/local/share/android-commandlinetools',
  join(homedir(), 'Library', 'Android', 'sdk'),
  join(homedir(), 'Android', 'Sdk'),
  process.env.LOCALAPPDATA === undefined
    ? undefined
    : join(process.env.LOCALAPPDATA, 'Android', 'Sdk')
]

export function resolveAndroidSdk() {
  const found = SDK_CANDIDATES.find((path) => path !== undefined && existsSync(path))
  if (found === undefined) {
    throw new Error(
      'No Android SDK found. Install it with `brew install --cask android-commandlinetools`, ' +
        'or set ANDROID_HOME to an existing SDK.'
    )
  }
  return found
}

/** Null when the platform has no java_home helper; gradle then falls back to JAVA_HOME or PATH. */
function macJavaHome() {
  try {
    return execFileSync('/usr/libexec/java_home', ['-v', '17'], { encoding: 'utf8' }).trim()
  } catch {
    return null
  }
}

export function resolveJavaHome() {
  if (process.env.JAVA_HOME !== undefined && existsSync(process.env.JAVA_HOME)) {
    return process.env.JAVA_HOME
  }
  return platform() === 'darwin' ? macJavaHome() : null
}

/** The environment an Android toolchain command needs, on top of the current one. */
export function androidEnvironment() {
  const sdk = resolveAndroidSdk()
  const java = resolveJavaHome()
  return {
    ...process.env,
    ANDROID_HOME: sdk,
    ANDROID_SDK_ROOT: sdk,
    ...(java === null ? {} : { JAVA_HOME: java })
  }
}

export function sdkTool(name) {
  const sdk = resolveAndroidSdk()
  const suffix = platform() === 'win32' ? '.exe' : ''
  for (const directory of ['platform-tools', 'emulator', join('cmdline-tools', 'latest', 'bin')]) {
    const candidate = join(sdk, directory, `${name}${suffix}`)
    if (existsSync(candidate)) {
      return candidate
    }
  }
  throw new Error(`Android SDK has no ${name}. Install it with sdkmanager.`)
}
