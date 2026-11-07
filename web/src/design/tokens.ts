/** Design tokens V2 "lab notebook" — single source of truth.
 *  Light theme only. Every color, spacing, radius and motion value lives here.
 *  Components import from this file; never hardcode hex values. */

export const color = {
  // Lab notebook theme (light)
  paper:     '#f5f1e8',  // warm paper background
  sheet:     '#fffdf8',  // white sheet sections
  ink:       '#1d1b16',  // dark text
  muted:     '#6b665c',  // muted text
  line:      '#d9d2c0',  // borders and rules
  accent:    '#2b3a8f',  // ink blue for interactive things
  good:      '#1f8a5b',  // success/good state
  warn:      '#c77700',  // warning
  bad:       '#c0392b',  // error/bad state
  
  // Legacy aliases for compatibility during migration
  bg:        '#f5f1e8',
  panel:     '#fffdf8',
  raised:    '#fffdf8',
  border:    '#d9d2c0',
  text:      '#1d1b16',
  success:   '#1f8a5b',
  danger:    '#c0392b',

  /** 10-color PID palette (saturated marker colors) */
  pid: [
    '#ff7a59',  // coral
    '#3a86ff',  // blue
    '#2ec4a6',  // teal
    '#ffbe0b',  // yellow
    '#9b5de5',  // purple
    '#ef476f',  // pink
    '#06a77d',  // green
    '#f78c6b',  // salmon
    '#118ab2',  // ocean
    '#8ac926',  // lime
  ] as const,
} as const

export const space = {
  1:  '4px',
  2:  '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
} as const

export const radius = {
  panel:   '10px',
  control: '6px',
} as const

export const motion = {
  hover:   '200ms ease-out',
  panel:   '200ms ease-out',
  spring:  { stiffness: 300, damping: 30 } as const,
} as const

/** Font families */
export const font = {
  display: 'Fraunces, serif',
  ui:      'Inter, system-ui, sans-serif',
  mono:    '"IBM Plex Mono", "JetBrains Mono", Consolas, monospace',
} as const

/** Sheet shadow (ink at 12% opacity) */
export const sheetShadow = '3px 3px 0 rgba(29, 27, 22, 0.12)'
