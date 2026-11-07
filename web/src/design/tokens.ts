/** Design tokens — single source of truth.
 *  Every color, spacing, radius and motion value lives here.
 *  Components import from this file; never hardcode hex values. */

export const color = {
  bg:        '#0b0e14',
  panel:     '#111621',
  raised:    '#171d2b',
  border:    '#232b3d',
  text:      '#e6eaf2',
  muted:     '#8b95ab',
  accent:    '#6ea8fe',
  success:   '#3ddc97',
  warn:      '#ffb454',
  danger:    '#ff6b6b',
  /** 10-color PID palette */
  pid: [
    '#6ea8fe',
    '#3ddc97',
    '#ffb454',
    '#ff6b9d',
    '#b794f6',
    '#4fd1c5',
    '#f6e05e',
    '#fc8181',
    '#90cdf4',
    '#a3e635',
  ] as const,
} as const

export const space = {
  1:  '4px',
  2:  '8px',
  3: '12px',
  4: '16px',
  6: '24px',
} as const

export const radius = {
  panel:   '10px',
  control: '6px',
} as const

export const motion = {
  hover:   '160ms ease-out',
  panel:   '220ms ease-out',
  spring:  { stiffness: 300, damping: 30 } as const,
} as const
