import type { Config } from 'tailwindcss'
import { color, radius, font, sheetShadow } from './src/design/tokens'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper:   color.paper,
        sheet:   color.sheet,
        ink:     color.ink,
        muted:   color.muted,
        line:    color.line,
        accent:  color.accent,
        good:    color.good,
        warn:    color.warn,
        bad:     color.bad,
        // Legacy aliases
        bg:      color.bg,
        panel:   color.panel,
        raised:  color.raised,
        border:  color.border,
        text:    color.text,
        success: color.success,
        danger:  color.danger,
      },
      borderRadius: {
        panel:   radius.panel,
        control: radius.control,
      },
      fontFamily: {
        display: font.display.split(',').map(f => f.trim()),
        ui:      font.ui.split(',').map(f => f.trim()),
        mono:    font.mono.split(',').map(f => f.trim()),
        // Legacy
        sans:    font.ui.split(',').map(f => f.trim()),
      },
      boxShadow: {
        sheet: sheetShadow,
      },
    },
  },
  plugins: [],
} satisfies Config
