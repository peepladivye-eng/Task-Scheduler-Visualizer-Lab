/**
 * Time scale utility for converting between time (ms) and pixel positions.
 * Used to align all timeline visualizations (ruler, lanes, Gantt).
 */

export interface TimeScale {
  /** Pixels per tick (time unit) */
  ppt: number
  /** Convert time to x position */
  xFor: (t: number) => number
  /** Convert time duration to width */
  widthFor: (dt: number) => number
  /** Convert x position to time (rounded, clamped) */
  tFor: (x: number) => number
  /** Total width of the timeline in pixels */
  totalWidth: number
}

/**
 * Creates a time scale for the given total time and container width.
 * @param total Total time units (ms)
 * @param containerWidth Available width in pixels
 * @param labelWidth Reserved width for labels on the left (sticky column)
 * @returns TimeScale object with conversion functions
 */
export function makeScale(
  total: number,
  containerWidth: number,
  labelWidth: number
): TimeScale {
  // Available width for the timeline
  const available = containerWidth - labelWidth
  
  // Pixels per tick: at least 14px, at most 48px
  // Add 2 ticks of padding on the right
  const rawPpt = available / (total + 2)
  const ppt = Math.max(14, Math.min(48, Math.floor(rawPpt)))
  
  // Functions
  const xFor = (t: number) => labelWidth + t * ppt
  const widthFor = (dt: number) => dt * ppt
  const tFor = (x: number) => {
    const raw = (x - labelWidth) / ppt
    return Math.max(0, Math.round(raw))
  }
  const totalWidth = labelWidth + (total + 2) * ppt

  return { ppt, xFor, widthFor, tFor, totalWidth }
}
