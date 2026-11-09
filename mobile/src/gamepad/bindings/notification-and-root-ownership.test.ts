import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { extname, join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * BIND-T8. The controller layer is additive, and this is the proof rather than the intention:
 * push registration, catch-up, dismissal reconciliation and notification routing stay owned by
 * the modules that already owned them, and the home route is still the root surface.
 *
 * Written as a source ratchet, not as behaviour tests. The upstream behaviour already has its
 * own suites — the task's own verify command runs four of them — so what is missing is a check
 * that a future binding does not quietly take one of these over. A test that only asserted the
 * current behaviour would pass just as happily against a controller-owned reimplementation.
 */

const mobileRoot = fileURLToPath(new URL('../../..', import.meta.url))
const gamepadRoot = join(mobileRoot, 'src', 'gamepad')
const appRoot = join(mobileRoot, 'app')
const layoutFile = join(appRoot, '_layout.tsx')
const homeRouteFile = join(appRoot, 'index.tsx')

const sourceExtensions = new Set(['.ts', '.tsx'])
const testFile = /\.test\.[jt]sx?$/

function sourceFiles(directory: string): string[] {
  if (!existsSync(directory)) {
    return []
  }
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? sourceFiles(path) : [path]
  })
}

function controllerSources(): { path: string; source: string }[] {
  return sourceFiles(gamepadRoot)
    .filter((path) => sourceExtensions.has(extname(path)) && !testFile.test(path))
    .map((path) => ({ path, source: readFileSync(path, 'utf8') }))
}

/** Everything that owns a notification concern, by the module path a reimplementation would copy. */
const NOTIFICATION_OWNERS = [
  'notifications/push-registration',
  'notifications/push-background-dismissal',
  'notifications/push-receive',
  'notifications/notification-routing',
  'notifications/desktop-notification-channel',
  'notifications/android-foreground-push',
  'notifications/native-notification-data',
  'notifications/notification-viewing-policy',
  'notifications/use-open-notification-route'
]

describe('the controller layer leaves notifications alone', () => {
  it('owns no push registration, catch-up, dismissal or routing module', () => {
    const offenders = controllerSources().flatMap(({ path, source }) => {
      const hits = NOTIFICATION_OWNERS.filter((owner) => source.includes(owner))
      return hits.map((owner) => `${relative(mobileRoot, path)} reaches ${owner}`)
    })

    expect(offenders).toEqual([])
  })

  it('never imports the notification SDK itself', () => {
    const offenders = controllerSources()
      .filter(({ source }) => /from '(expo-notifications|expo-task-manager)'/.test(source))
      .map(({ path }) => relative(mobileRoot, path))

    expect(offenders).toEqual([])
  })

  // BIND-R9: the shell still starts every notification concern it started before. A controller
  // provider wrapping the navigator must not have displaced any of this.
  it('keeps the shell wiring every existing notification owner', () => {
    const layout = readFileSync(layoutFile, 'utf8')

    for (const owner of NOTIFICATION_OWNERS) {
      expect(layout, owner).toContain(owner)
    }
    expect(layout).toContain('startPushTokenSync')
    expect(layout).toContain('registerPushDismissalTask')
    expect(layout).toContain('ensureDesktopNotificationChannel')
    expect(layout).toContain('addNotificationResponseReceivedListener')
  })

  // BIND-R9 and the MVP non-goal: no replacement dashboard.
  it('leaves the home route as the root information surface', () => {
    const home = readFileSync(homeRouteFile, 'utf8')

    expect(home).toContain('MobileHomeScreen')
    expect(home).not.toMatch(/gamepad|controller|dashboard/i)
  })

  it('adds no controller-owned route', () => {
    const routes = sourceFiles(appRoot)
      .filter((path) => sourceExtensions.has(extname(path)))
      .map((path) => relative(appRoot, path))
      .filter((path) => /gamepad|controller|dashboard/i.test(path))

    expect(routes).toEqual([])
  })
})
