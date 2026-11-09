#!/usr/bin/env node
/**
 * Boots the Android emulator for the quick-iteration loop. Its sibling `start-emulator.mjs`
 * drives the iOS simulator; this one exists because the Android path is where controller work
 * happens.
 *
 * Usage:
 *   node scripts/start-android-emulator.mjs [--avd orca-controller] [--headless]
 */
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, openSync, readdirSync, rmSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { androidEnvironment, sdkTool } from './android-sdk-environment.mjs'

const args = process.argv.slice(2)
const avdIndex = args.indexOf('--avd')
const avd = avdIndex === -1 ? 'orca-controller' : args[avdIndex + 1]
const headless = args.includes('--headless')

const emulator = sdkTool('emulator')
const environment = androidEnvironment()

const known = spawnSync(emulator, ['-list-avds'], { encoding: 'utf8', env: environment })
const available = (known.stdout ?? '')
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
if (!available.includes(avd)) {
  console.error(`No AVD named '${avd}'. Available: ${available.join(', ') || '(none)'}`)
  console.error(
    'Create one with:\n' +
      '  sdkmanager "system-images;android-36;google_apis;arm64-v8a"\n' +
      `  avdmanager create avd -n ${avd} -k "system-images;android-36;google_apis;arm64-v8a"`
  )
  process.exit(1)
}

/**
 * An emulator that was killed rather than shut down leaves its locks behind, and the next
 * start dies instantly because of them. A running emulator is always visible to adb, so locks
 * with nothing attached are stale by definition.
 */
function clearStaleLocks() {
  const attached = spawnSync(sdkTool('adb'), ['devices'], { encoding: 'utf8', env: environment })
  if ((attached.stdout ?? '').includes('emulator-')) {
    return
  }
  const avdDirectory = join(homedir(), '.android', 'avd', `${avd}.avd`)
  if (!existsSync(avdDirectory)) {
    return
  }
  for (const entry of readdirSync(avdDirectory)) {
    if (entry.endsWith('.lock')) {
      rmSync(join(avdDirectory, entry), { force: true, recursive: true })
    }
  }
}

const emulatorArgs = ['-avd', avd, '-no-boot-anim']
if (headless) {
  emulatorArgs.push('-no-window', '-no-audio')
}

clearStaleLocks()

// Never discard the emulator's output: when it refuses to start it says why, once, and exits.
const logDirectory = join(tmpdir(), 'orca-android-emulator')
mkdirSync(logDirectory, { recursive: true })
const logPath = join(logDirectory, `${avd}.log`)
const logFile = openSync(logPath, 'a')

console.log(`Starting ${avd}${headless ? ' (headless)' : ''}… (log: ${logPath})`)
// Detached: this script leaves a booted emulator behind and exits rather than babysitting one.
const child = spawn(emulator, emulatorArgs, {
  detached: true,
  stdio: ['ignore', logFile, logFile],
  env: environment
})
child.unref()

const adb = sdkTool('adb')

function sleep(ms) {
  spawnSync(process.execPath, ['-e', `setTimeout(() => {}, ${ms})`])
}

// `wait-for-device` returns as soon as adb sees the device, which is well before Android has
// finished booting and can install anything.
const BOOT_TIMEOUT_MS = 180_000
const startedAt = Date.now()
let booted = false
while (Date.now() - startedAt < BOOT_TIMEOUT_MS) {
  const probe = spawnSync(adb, ['shell', 'getprop', 'sys.boot_completed'], {
    encoding: 'utf8',
    env: environment
  })
  if ((probe.stdout ?? '').trim() === '1') {
    booted = true
    break
  }
  sleep(2000)
}

if (!booted) {
  console.error(`${avd} did not finish booting within ${BOOT_TIMEOUT_MS / 1000}s.`)
  console.error(`Emulator output: ${logPath}`)
  process.exit(1)
}

// Metro is reached through the host loopback, so the port has to be forwarded before the app runs.
spawnSync(adb, ['reverse', 'tcp:8081', 'tcp:8081'], { stdio: 'inherit', env: environment })
console.log('\nEmulator ready. Next:\n  pnpm --dir mobile exec expo start --dev-client')
