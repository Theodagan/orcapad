import type { DictationActivity } from './active-dictation'

/**
 * The existing hook's status, as the controller layer needs it (BIND-R6: the listening state is
 * derived from the existing status, never tracked separately).
 *
 * `error` folds to `idle` deliberately: a failed session holds no microphone, so `R3` should
 * start a new one rather than try to stop something that is not running.
 */
export function dictationActivityOf(
  status: 'idle' | 'starting' | 'recording' | 'processing' | 'error'
): DictationActivity {
  return status === 'error' ? 'idle' : status
}
