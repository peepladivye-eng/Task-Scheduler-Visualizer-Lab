import React, { useEffect } from 'react'
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
import { useStudio } from './store/useStudio'

/** Placeholder panel — children go inside */
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

export default function App() {
  const trace = useStudio((s) => s.trace)
  const t = useStudio((s) => s.t)
  const playing = useStudio((s) => s.playing)
  const speed = useStudio((s) => s.speed)
  const tick = useStudio((s) => s.tick)
  const toggle = useStudio((s) => s.toggle)
  const step = useStudio((s) => s.step)
  const seekStart = useStudio((s) => s.seekStart)
  const seekEnd = useStudio((s) => s.seekEnd)
  const view = useStudio((s) => s.view)

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
        gridTemplateRows: 'auto auto 1fr auto',
        gridTemplateColumns: '320px 1fr 340px',
        height: '100vh',
        background: color.bg,
        gap: '0',
        overflow: 'hidden',
      }}
    >
      {/* TopBar — spans all 3 columns */}
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

      {/* Transport bar — spans all 3 columns */}
      <div
        style={{
          gridColumn: '1 / -1',
          gridRow: '2',
          background: color.raised,
          borderBottom: `1px solid ${color.border}`,
          padding: '8px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <Transport />
      </div>

      {/* Left rail */}
      <div
        style={{
          gridColumn: '1',
          gridRow: '3',
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

      {/* Center */}
      <div
        style={{
          gridColumn: '2',
          gridRow: '3',
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

      {/* Right inspector */}
      <div
        style={{
          gridColumn: '3',
          gridRow: '3',
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

      {/* Metrics bar — spans all 3 columns */}
      <div
        style={{
          gridColumn: '1 / -1',
          gridRow: '4',
          borderTop: `1px solid ${color.border}`,
          background: color.panel,
          padding: '10px 20px',
        }}
      >
        <MetricsCards />
      </div>
    </div>
  )
}
