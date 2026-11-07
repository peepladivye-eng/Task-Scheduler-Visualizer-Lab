import type { Config } from 'tailwindcss'
import { color, radius } from './src/design/tokens'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:      color.bg,
        panel:   color.panel,
        raised:  color.raised,
        border:  color.border,
        text:    color.text,
        muted:   color.muted,
        accent:  color.accent,
        success: color.success,
        warn:    color.warn,
        danger:  color.danger,
      },
      borderRadius: {
        panel:   radius.panel,
        control: radius.control,
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config
