import React from 'react'
import { useTheme } from '../store/useTheme'
import { Segmented } from '../ui/Segmented'
import { Tooltip } from '../ui/Tooltip'
import Appearance from './Appearance'

type Tab = 'playground' | 'lessons' | 'race'

export default function Header() {
  const [tab, setTab] = React.useState<Tab>('playground')
  const { resolved } = useTheme()
  
  // Mock engine status - will be connected to actual engine later
  const engineOnline = true
  
  return (
    <header className="sticky top-0 z-20 bg-paper/80 backdrop-blur-sm border-b border-line">
      <div className="max-w-[1280px] mx-auto px-8 py-4 flex items-center justify-between gap-8">
        {/* Left: Branding */}
        <h1 className="text-xl font-display font-semibold text-ink whitespace-nowrap">
          Scheduler Lab
        </h1>
        
        {/* Center: Tabs */}
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'playground', label: 'Playground' },
            { value: 'lessons', label: 'Lessons' },
            { value: 'race', label: 'Race' },
          ]}
          ariaLabel="Navigation tabs"
        />
        
        {/* Right: Status + Controls */}
        <div className="flex items-center gap-3">
          <Tooltip content={engineOnline ? 'Engine online' : 'Engine offline'}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${engineOnline ? 'bg-good' : 'bg-bad'}`} />
            </div>
          </Tooltip>
          
          <Tooltip content="Command palette (⌘K)">
            <button
              className="h-9 px-3 rounded-lg border border-line bg-sheet text-muted hover:text-ink hover:bg-chip transition-colors font-mono text-xs"
              onClick={() => {/* Will open palette in V16 */}}
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
