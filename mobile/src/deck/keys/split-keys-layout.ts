import type { ReservedRect } from '../../../modules/orca-reserved-regions/src'
import {
  getSideRailStrip,
  sideRailStripAboveKeyboard,
  type SideRailStrip
} from '../../layout/side-rail-strip'

export type SplitKeysPlacement = {
  readonly orientation: 'landscape' | 'portrait'
  readonly strip: SideRailStrip | null
}

export function splitKeysPlacement(args: {
  windowWidth: number
  windowHeight: number
  insets: { top: number; right: number; bottom: number; left: number }
  occlusions: readonly ReservedRect[]
  keyboardHeight?: number
}): SplitKeysPlacement {
  const strip = getSideRailStrip(args)
  return {
    orientation: args.windowWidth > args.windowHeight ? 'landscape' : 'portrait',
    strip: sideRailStripAboveKeyboard(strip, args.keyboardHeight ?? 0)
  }
}

export function insertAtSplitCursor(
  text: string,
  cursor: number,
  insertion: string
): {
  text: string
  cursor: number
} {
  const at = Math.max(0, Math.min(text.length, cursor))
  return {
    text: `${text.slice(0, at)}${insertion}${text.slice(at)}`,
    cursor: at + insertion.length
  }
}

export function deleteBeforeSplitCursor(
  text: string,
  cursor: number
): { text: string; cursor: number } {
  const at = Math.max(0, Math.min(text.length, cursor))
  return {
    text: `${text.slice(0, Math.max(0, at - 1))}${text.slice(at)}`,
    cursor: Math.max(0, at - 1)
  }
}
