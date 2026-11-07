import React, { useEffect, useState } from 'react'
import { color } from './design/tokens'
import TaskEditor from './components/TaskEditor'
import Gantt from './components/Gantt'
import Transport from './components/Transport'
import CpuCard from './components/CpuCard'
import ReadyQueue from './components/ReadyQueue'
import ProcessTable from './components/ProcessTable'
import EventLog from './components/EventLog'
import MetricsCards from './components/MetricsCards'
import TopBar from './components/TopBar'
import CompareView from './components/CompareView'
import EngineBanner from './components/EngineBanner'
import ScenarioBar from './components/ScenarioBar'
import { useStudio } from './store/useStudio'

/** Reusable panel with optional title */
function Panel({
  title,
  children,
  className = '',
  style: extraStyle,
}: {
  title?: string
  children?: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      style={{
        background: color.panel,
        border: `1px solid ${color.border}`,
        borderRadius: '10px',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        ...extraStyle,
      }}
      className={className}
    >
      {title && (
        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: color.muted, fontWeight: 600 }}>
          {title}
        </div>
      )}
      {children}
    </div>
  )
}

/** Small floating shortcuts cheat-sheet */
function ShortcutsPopover({ onClose }: { onClose: () => void }) {
  const shortcuts = [
    { key: 'Space',    desc: 'Play / Pause' },
    { key: '←',       desc: 'Step back 1 tick' },
    { key: '→',       desc: 'Step forward 1 tick' },
    { key: 'Home',    desc: 'Seek to start' },
    { key: 'End',     desc: 'Seek to end' },
  ]
  return (
    /* Backdrop — clicking outside dismisses */
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
      }}
    >
      {/* Card — stopPropagation so clicks inside don't close */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          bottom: '48px',
          right: '20px',
          background: color.raised,
          border: `1px solid ${color.border}`,
          borderRadius: '10px',
          padding: '14px 16px',
          minWidth: '220px',
          boxShadow: '0 8px 32px #00000066',
          zIndex: 101,
        }}
      >
        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: color.muted, fontWeight: 600, marginBottom: '10px' }}>
          Keyboard Shortcuts
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {shortcuts.map(({ key, desc }) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
              <kbd style={{
                background: color.panel,
                border: `1px solid ${color.border}`,
                borderRadius: '4px',
                padding: '2px 7px',
                fontFamily: '"JetBrains Mono", Consolas, monospace',
                fontSize: '0.75rem',
                color: color.accent,
                whiteSpace: 'nowrap',
              }}>
                {key}
              </kbd>
              <span style={{ fontSize: '0.78rem', color: color.text }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const trace     = useStudio((s) => s.trace)
  const t         = useStudio((s) => s.t)
  const playing   = useStudio((s) => s.playing)
  const speed     = useStudio((s) => s.speed)
  const tick      = useStudio((s) => s.tick)
  const toggle    = useStudio((s) => s.toggle)
  const step      = useStudio((s) => s.step)
  const seekStart = useStudio((s) => s.seekStart)
  const seekEnd   = useStudio((s) => s.seekEnd)
  const view      = useStudio((s) => s.view)

  const [showShortcuts, setShowShortcuts] = useState(false)

  // Playback loop
  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => tick(), 500 / speed)
    return () => clearInterval(id)
  }, [playing, speed, tick])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
      if (e.key === '?')          { setShowShortcuts((v) => !v) }
      if (e.key === 'Escape')     { setShowShortcuts(false) }
      if (e.key === ' ')          { e.preventDefault(); toggle() }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); step(-1) }
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1) }
      if (e.key === 'Home')       { e.preventDefault(); seekStart() }
      if (e.key === 'End')        { e.preventDefault(); seekEnd() }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [toggle, step, seekStart, seekEnd])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: color.bg,
      }}
    >
      {/* TopBar */}
      <div
        style={{
          background: color.panel,
          borderBottom: `1px solid ${color.border}`,
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <TopBar />
      </div>

      {/* Sticky Transport bar */}
      <div
        style={{
          position: 'sticky',
          bottom: 0,
          zIndex: 10,
          background: color.raised,
          borderTop: `1px solid ${color.border}`,
          borderBottom: `1px solid ${color.border}`,
          padding: '8px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <Transport />
        {/* Shortcuts "?" button at far right of transport bar */}
        <button
          onClick={() => setShowShortcuts((v) => !v)}
          aria-label="Show keyboard shortcuts"
          title="Keyboard shortcuts (?)"
          style={{
            marginLeft: 'auto',
            background: showShortcuts ? `${color.accent}22` : 'transparent',
            border: `1px solid ${showShortcuts ? color.accent : color.border}`,
            borderRadius: '6px',
            padding: '4px 9px',
            color: showShortcuts ? color.accent : color.muted,
            cursor: 'pointer',
            fontSize: '0.82rem',
            fontFamily: '"JetBrains Mono", Consolas, monospace',
            fontWeight: 600,
            lineHeight: 1,
            transition: 'color 160ms, border-color 160ms, background 160ms',
          }}
        >
          ?
        </button>
      </div>

      {/* Engine banner */}
      <div style={{ padding: '0 20px' }}>
        <EngineBanner />
      </div>

      {/* Main content column */}
      <div
        style={{
          flex: '1 1 auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        {/* Scenario Bar */}
        <ScenarioBar />

        {/* Task Editor section */}
        <Panel title="Task Editor">
          <TaskEditor />
        </Panel>

        {/* Gantt Chart section */}
        {view === 'compare' ? (
          <Panel title="Compare">
            <CompareView />
          </Panel>
        ) : (
          <Panel title="Gantt Chart">
            {trace
              ? <Gantt trace={trace} t={t} />
              : <span style={{ color: color.muted, fontSize: '0.82rem' }}>Run a simulation to see the Gantt chart.</span>}
          </Panel>
        )}

        {/* Two-column grid: CPU+Queue | Event log */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Panel title="CPU">
              <CpuCard />
            </Panel>
            <Panel title="Ready Queue">
              <ReadyQueue />
            </Panel>
          </div>

          <Panel title="Event Log">
            <EventLog />
          </Panel>
        </div>

        {/* Process Table section */}
        <Panel title="Process Table">
          <ProcessTable />
        </Panel>

        {/* Metrics section */}
        <Panel title="Metrics">
          <MetricsCards />
        </Panel>
      </div>

      {/* Keyboard shortcuts popover (portal-style, fixed position) */}
      {showShortcuts && (
        <ShortcutsPopover onClose={() => setShowShortcuts(false)} />
      )}
    </div>
  )
}
