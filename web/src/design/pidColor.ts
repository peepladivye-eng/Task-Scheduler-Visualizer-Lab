import { color } from './tokens'

/** SVG pattern id for idle segments (hatched muted). */
export const IDLE_PATTERN = 'pattern-idle'

/** SVG pattern id for context-switch segments (hatched warn). */
export const CS_PATTERN = 'pattern-cs'

/**
 * Map a pid to one of the 10 palette colors.
 * Uses ((pid - 1) % 10 + 10) % 10 to handle any integer pid safely.
 */
export function pidColor(pid: number): string {
  const idx = ((pid - 1) % 10 + 10) % 10
  return color.pid[idx]
}
