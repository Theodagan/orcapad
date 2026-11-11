/** A hint chip's painted width, used to decide how many fit (VIS-6/SD-2: never overflow). */
export const CHIP_WIDTH = 96
export const STRIP_PADDING = 24

/** How many chips fit the available width; the lowest-priority ones are dropped, not wrapped. */
export function visibleHintCount(bindings: number, width: number): number {
  const room = Math.max(width - STRIP_PADDING, 0)
  return Math.max(Math.min(bindings, Math.floor(room / CHIP_WIDTH)), 0)
}
