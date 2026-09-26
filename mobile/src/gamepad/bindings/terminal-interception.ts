import type { ControllerInterception } from '../controller-input/native-controller-reader'

/**
 * The CTRL-T4 question, answered so that either answer is safe.
 *
 * `001/tech.md` §6 made it a device checkpoint: does a focused terminal WebView swallow
 * controller input before the app sees it? Nobody knows yet, and the honest thing is not to
 * guess. What this does instead is make the two possible worlds behave the same.
 *
 * If the WebView consumed the event, it has already acted on it, and the binding acting too
 * would double it — a scroll that jumps twice, a key sent twice. If it did not, the binding is
 * the only thing that will act, and it must. So the policy is simply "defer to whoever already
 * took it", and BIND-T10 records which world the device is actually in.
 */

/** Views that can plausibly consume a controller event themselves. */
const CONSUMING_VIEW = /webview/i

export function shouldDeferToFocusedView(interception: ControllerInterception | null): boolean {
  if (interception === null) {
    // No native module — nothing consumed anything, because nothing was delivered natively.
    return false
  }
  return interception.consumedByViewTree && CONSUMING_VIEW.test(interception.focusedView)
}
