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
        overflow: 'hidden',
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
        display: 'grid',
        /* Row 1: TopBar | Row 2: Banner (collapses to 0 when hidden) | Row 3: Transport | Row 4: panels | Row 5: metrics */
        gridTemplateRows: 'auto auto auto 1fr auto',
        gridTemplateColumns: '320px 1fr 340px',
        height: '100vh',
        background: color.bg,
        gap: '0',
        overflow: 'hidden',
      }}
    >
      {/* Row 1 — TopBar, spans all 3 columns */}
      <div
        style={{
          gridColumn: '1 / -1',
          gridRow: '1',
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

      {/* Row 2 — Engine banner (zero-height when not needed) */}
      <div
        style={{
          gridColumn: '1 / -1',
          gridRow: '2',
          padding: '0 20px',
        }}
      >
        <EngineBanner />
      </div>

      {/* Row 3 — Transport bar, spans all 3 columns */}
      <div
        style={{
          gridColumn: '1 / -1',
          gridRow: '3',
          background: color.raised,
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

      {/* Row 4 — Left rail */}
      <div
        style={{
          gridColumn: '1',
          gridRow: '4',
          borderRight: `1px solid ${color.border}`,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '12px',
          overflowY: 'auto',
        }}
      >
        <Panel title="Task Editor">
          <TaskEditor />
        </Panel>
      </div>

      {/* Row 4 — Center */}
      <div
        style={{
          gridColumn: '2',
          gridRow: '4',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '12px',
          overflowY: 'auto',
        }}
      >
        {view === 'compare' ? (
          <Panel title="Compare" style={{ flex: 1 }}>
            <CompareView />
          </Panel>
        ) : (
          <>
            <Panel title="Gantt Chart" style={{ flex: '0 0 auto' }}>
              {trace
                ? <Gantt trace={trace} t={t} />
                : <span style={{ color: color.muted, fontSize: '0.82rem' }}>Run a simulation to see the Gantt chart.</span>}
            </Panel>
            <Panel title="Event Log">
              <EventLog />
            </Panel>
          </>
        )}
      </div>

      {/* Row 4 — Right inspector */}
      <div
        style={{
          gridColumn: '3',
          gridRow: '4',
          borderLeft: `1px solid ${color.border}`,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '12px',
          overflowY: 'auto',
        }}
      >
        <Panel title="CPU">
          <CpuCard />
        </Panel>
        <Panel title="Ready Queue">
          <ReadyQueue />
        </Panel>
        <Panel title="Process Table">
          <ProcessTable />
        </Panel>
      </div>

      {/* Row 5 — Metrics bar, spans all 3 columns */}
      <div
        style={{
          gridColumn: '1 / -1',
          gridRow: '5',
          borderTop: `1px solid ${color.border}`,
          background: color.panel,
          padding: '10px 20px',
        }}
      >
        <MetricsCards />
      </div>

      {/* Keyboard shortcuts popover (portal-style, fixed position) */}
      {showShortcuts && (
        <ShortcutsPopover onClose={() => setShowShortcuts(false)} />
      )}
    </div>
  )
}
