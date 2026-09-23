#!/usr/bin/env node
/**
 * Builds the standalone APK to sideload onto a handheld. Release, not debug: a debug build
 * carries no JavaScript and expects a Metro server on the developer's machine, which is the
 * emulator workflow, not a device one.
 *
 * Usage:
 *   node scripts/build-android-apk.mjs [--debug] [--abi arm64-v8a]
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { androidEnvironment } from './android-sdk-environment.mjs'

const mobileRoot = join(import.meta.dirname, '..')
const androidRoot = join(mobileRoot, 'android')

const args = process.argv.slice(2)
const debug = args.includes('--debug')
const abiIndex = args.indexOf('--abi')
const abi = abiIndex === -1 ? null : args[abiIndex + 1]

if (!existsSync(androidRoot)) {
  console.log('No android/ directory yet — running prebuild.')
  const prebuild = spawnSync(
    process.execPath,
    [
      join(mobileRoot, 'node_modules', '.bin', 'expo'),
      'prebuild',
      '--platform',
      'android',
      '--no-install'
    ],
    { cwd: mobileRoot, stdio: 'inherit', env: androidEnvironment() }
  )
  if (prebuild.status !== 0) {
    process.exit(prebuild.status ?? 1)
  }
}

const variant = debug ? 'Debug' : 'Release'
const gradleArgs = [`:app:assemble${variant}`]
// One ABI cuts both build time and APK size roughly fourfold; the handhelds are all arm64.
if (abi !== null) {
  gradleArgs.push(`-PreactNativeArchitectures=${abi}`)
}

console.log(`Building ${variant} APK${abi === null ? '' : ` for ${abi}`}…`)
const gradle = spawnSync(join(androidRoot, 'gradlew'), gradleArgs, {
  cwd: androidRoot,
  stdio: 'inherit',
  env: androidEnvironment()
})
if (gradle.status !== 0) {
  process.exit(gradle.status ?? 1)
}

const apk = join(
  androidRoot,
  'app/build/outputs/apk',
  debug ? 'debug/app-debug.apk' : 'release/app-release.apk'
)
console.log(`\nAPK: ${apk}`)
console.log(`Install: adb install -r ${apk}`)
