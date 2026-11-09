// V1 Temporary: Theme swatch test page
import React from 'react'

const colors = [
  { name: 'paper', class: 'bg-paper' },
  { name: 'sheet', class: 'bg-sheet' },
  { name: 'chip', class: 'bg-chip' },
  { name: 'line', class: 'bg-line' },
  { name: 'ink', class: 'bg-ink' },
  { name: 'muted', class: 'bg-muted' },
  { name: 'accent', class: 'bg-accent' },
  { name: 'on-accent', class: 'bg-on-accent' },
  { name: 'good', class: 'bg-good' },
  { name: 'warn', class: 'bg-warn' },
  { name: 'bad', class: 'bg-bad' },
]

const pidColors = [
  { pid: 1, class: 'bg-pid1' },
  { pid: 2, class: 'bg-pid2' },
  { pid: 3, class: 'bg-pid3' },
  { pid: 4, class: 'bg-pid4' },
  { pid: 5, class: 'bg-pid5' },
  { pid: 6, class: 'bg-pid6' },
  { pid: 7, class: 'bg-pid7' },
  { pid: 8, class: 'bg-pid8' },
  { pid: 9, class: 'bg-pid9' },
  { pid: 10, class: 'bg-pid10' },
]

export default function App() {
  return (
    <div className="min-h-screen bg-paper p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-display font-semibold text-ink">
          Theme Swatch Test
        </h1>
        
        <div className="sheet space-y-4">
          <h2 className="text-xl font-display text-ink mb-4">Theme Colors</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {colors.map(({ name, class: className }) => (
              <div key={name} className="space-y-2">
                <div className={`${className} h-16 rounded-lg border-2 border-line`} />
                <p className="font-mono text-sm text-muted">{name}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="sheet space-y-4">
          <h2 className="text-xl font-display text-ink mb-4">PID Colors</h2>
          <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
            {pidColors.map(({ pid, class: className }) => (
              <div key={pid} className="flex flex-col items-center gap-2">
                <div className={`${className} w-12 h-12 rounded-lg border-2 border-pidInk flex items-center justify-center text-pidInk font-mono font-semibold text-sm`}>
                  P{pid}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="sheet">
          <p className="text-sm text-muted">
            Toggle theme in DevTools: Open Console and run{' '}
            <code className="bg-chip px-2 py-1 rounded font-mono text-xs">
              document.documentElement.dataset.theme = 'dark'
            </code>{' '}
            or{' '}
            <code className="bg-chip px-2 py-1 rounded font-mono text-xs">
              'light'
            </code>
          </p>
        </div>
      </div>
    </div>
  )
}
