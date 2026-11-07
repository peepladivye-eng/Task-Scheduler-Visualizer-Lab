import { color } from './design/tokens'

/** Placeholder panel — children go inside */
function Panel({
  title,
  children,
  className = '',
}: {
  title?: string
  children?: React.ReactNode
  className?: string
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
        <span style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.02em' }}>
          Scheduler Studio
        </span>
        <span style={{ color: color.muted, fontSize: '0.8rem' }}>
          [TopBar — algo tabs + engine status come in W12]
        </span>
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
          color: color.muted,
          fontSize: '0.82rem',
        }}
      >
        [Transport — playback controls come in W9]
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
          <span style={{ color: color.muted, fontSize: '0.82rem' }}>Editor comes in W7</span>
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
        <Panel title="Gantt Chart">
          <span style={{ color: color.muted, fontSize: '0.82rem' }}>Gantt comes in W8</span>
        </Panel>
        <Panel title="Event Log">
          <span style={{ color: color.muted, fontSize: '0.82rem' }}>Event log comes in W11</span>
        </Panel>
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
          <span style={{ color: color.muted, fontSize: '0.82rem' }}>CPU card comes in W10</span>
        </Panel>
        <Panel title="Ready Queue">
          <span style={{ color: color.muted, fontSize: '0.82rem' }}>Queue comes in W10</span>
        </Panel>
        <Panel title="Process Table">
          <span style={{ color: color.muted, fontSize: '0.82rem' }}>Table comes in W11</span>
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
          color: color.muted,
          fontSize: '0.82rem',
        }}
      >
        [Metrics cards come in W12]
      </div>
    </div>
  )
}
