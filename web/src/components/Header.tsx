import React from 'react'
import { HelpCircle } from 'lucide-react'
import { useStudio } from '../store/useStudio'
import { useTheme } from '../store/useTheme'
import { Segmented } from '../ui/Segmented'
import { Tooltip } from '../ui/Tooltip'
import Appearance from './Appearance'

interface HeaderProps {
  onTourRestart?: () => void
}

export default function Header({ onTourRestart }: HeaderProps) {
  const view = useStudio((s) => s.view)
  const setView = useStudio((s) => s.setView)
  const engineOnline = useStudio((s) => s.engineOnline)

  return (
    <header className="sticky top-0 z-20 bg-paper/80 backdrop-blur-sm border-b border-line">
      <div className="max-w-[1280px] mx-auto px-8 py-4 flex items-center justify-between gap-8">

        {/* Branding */}
        <h1 className="text-xl font-display font-semibold text-ink whitespace-nowrap">
          Scheduler Lab
        </h1>

        {/* Tabs */}
        <Segmented
          value={view}
          onChange={(v) => setView(v as 'single' | 'compare')}
          options={[
            { value: 'single', label: 'Playground' },
            { value: 'compare', label: 'Compare All' },
          ]}
          ariaLabel="View mode"
        />

        {/* Right controls */}
        <div className="flex items-center gap-3">
          {/* Engine status */}
          <Tooltip content={engineOnline ? 'Engine online' : 'Engine offline — using cached traces'}>
            <div className="flex items-center gap-1.5 cursor-default">
              <div className={`w-2 h-2 rounded-full ${engineOnline ? 'bg-good' : 'bg-bad'}`} />
              <span className="text-xs text-muted hidden sm:block">
                {engineOnline ? 'online' : 'offline'}
              </span>
            </div>
          </Tooltip>

          {/* Tour restart */}
          {onTourRestart && (
            <Tooltip content="Restart guided tour">
              <button
                onClick={onTourRestart}
                className="h-9 w-9 rounded-lg border border-line bg-sheet text-muted hover:text-ink hover:bg-chip transition-colors flex items-center justify-center"
                aria-label="Restart tour"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </Tooltip>
          )}

          {/* Command palette hint */}
          <Tooltip content="Command palette">
            <button
              className="h-9 px-3 rounded-lg border border-line bg-sheet text-muted hover:text-ink hover:bg-chip transition-colors font-mono text-xs"
              onClick={() => {
                // Dispatch a synthetic Ctrl+K to open the palette
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))
              }}
            >
              ⌘K
            </button>
          </Tooltip>

          <Appearance />
        </div>
      </div>
    </header>
  )
}
