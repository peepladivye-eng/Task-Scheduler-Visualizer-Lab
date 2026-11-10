import React, { useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../store/useTheme'
import { withThemeTransition } from '../lib/themeTransition'

const modes = [
  { value: 'light' as const, label: 'Light' },
  { value: 'dark' as const, label: 'Dark' },
  { value: 'system' as const, label: 'System' },
]

const accents = [
  { value: 'ink' as const, lightColor: '#2b3a8f', darkColor: '#a9b8ff' },
  { value: 'teal' as const, lightColor: '#0f766e', darkColor: '#5eead4' },
  { value: 'violet' as const, lightColor: '#6d28d9', darkColor: '#c4b5fd' },
  { value: 'amber' as const, lightColor: '#b45309', darkColor: '#fcd34d' },
]

export default function Appearance() {
  const { mode, accent, resolved, setMode, setAccent } = useTheme()
  const [open, setOpen] = useState(false)
  
  const handleModeChange = (newMode: typeof mode, event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    
    withThemeTransition({ x, y }, () => {
      setMode(newMode)
    })
  }
  
  const currentIcon = resolved === 'dark' ? Moon : Sun
  const Icon = currentIcon
  
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          className="h-11 w-11 flex items-center justify-center rounded-lg border border-line bg-sheet text-ink hover:bg-chip transition-colors"
          aria-label="Appearance"
        >
          <Icon className="w-5 h-5" />
        </button>
      </Popover.Trigger>
      
      <Popover.Portal>
        <Popover.Content
          className="bg-sheet border border-line rounded-[10px] shadow-sheet p-4 w-64 z-50"
          sideOffset={8}
          align="end"
        >
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted font-semibold mb-3">
                Theme Mode
              </p>
              <div className="grid grid-cols-3 gap-2">
                {modes.map((m) => (
                  <button
                    key={m.value}
                    onClick={(e) => handleModeChange(m.value, e)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      mode === m.value
                        ? 'bg-accent text-on-accent'
                        : 'bg-chip text-ink hover:bg-line'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <p className="text-xs uppercase tracking-wider text-muted font-semibold mb-3">
                Accent Color
              </p>
              <div className="grid grid-cols-4 gap-3">
                {accents.map((a) => {
                  const color = resolved === 'dark' ? a.darkColor : a.lightColor
                  return (
                    <button
                      key={a.value}
                      onClick={() => setAccent(a.value)}
                      className={`w-12 h-12 rounded-lg transition-all ${
                        accent === a.value
                          ? 'ring-2 ring-accent ring-offset-2 ring-offset-sheet scale-110'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={`Accent: ${a.value}`}
                    />
                  )
                })}
              </div>
            </div>
          </div>
          
          <Popover.Arrow className="fill-line" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
