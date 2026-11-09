import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        paper: 'rgb(var(--paper) / <alpha-value>)',
        sheet: 'rgb(var(--sheet) / <alpha-value>)',
        chip: 'rgb(var(--chip) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'on-accent': 'rgb(var(--on-accent) / <alpha-value>)',
        good: 'rgb(var(--good) / <alpha-value>)',
        warn: 'rgb(var(--warn) / <alpha-value>)',
        bad: 'rgb(var(--bad) / <alpha-value>)',
        pidInk: 'rgb(var(--pid-ink) / <alpha-value>)',
        pid1: '#ff7a59',
        pid2: '#3a86ff',
        pid3: '#2ec4a6',
        pid4: '#ffbe0b',
        pid5: '#9b5de5',
        pid6: '#ef476f',
        pid7: '#06a77d',
        pid8: '#f78c6b',
        pid9: '#118ab2',
        pid10: '#8ac926',
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        ui: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'Consolas', 'monospace'],
      },
      boxShadow: {
        sheet: '3px 3px 0 rgb(var(--shadow) / var(--shadow-a))',
      },
    },
  },
  plugins: [],
} satisfies Config
