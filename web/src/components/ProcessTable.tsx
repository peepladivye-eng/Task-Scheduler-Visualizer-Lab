import React from 'react'
import { useStudio, useDerived } from '../store/useStudio'
import { color } from '../design/tokens'
import { pidColor } from '../design/pidColor'
import type { ProcStatus } from '../lib/deriveState'

// Status badge colors: bg and text
function statusStyle(status: ProcStatus): React.CSSProperties {
  switch (status) {
    case 'new':
      return { background: `${color.muted}20`, color: color.muted }
    case 'ready':
      return { background: `${color.accent}20`, color: color.accent }
    case 'running':
      return { background: `${color.success}20`, color: color.success }
    case 'done':
      return { background: `${color.muted}10`, color: `${color.muted}88` }
  }
}

const MONO: React.CSSProperties = {
  fontFamily: '"JetBrains Mono", Consolas, monospace',
}

const TH_STYLE: React.CSSProperties = {
  padding: '4px 8px',
  color: color.muted,
  fontWeight: 500,
  fontSize: '0.7rem',
  textAlign: 'left',
  borderBottom: `1px solid ${color.border}`,
  whiteSpace: 'nowrap',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
}

const TD_STYLE: React.CSSProperties = {
  padding: '5px 8px',
  fontSize: '0.8rem',
  borderBottom: `1px solid ${color.border}20`,
  whiteSpace: 'nowrap',
}

export default function ProcessTable() {
  const trace = useStudio((s) => s.trace)
  const t = useStudio((s) => s.t)
  const derived = useDerived()

  if (!trace) {
    return (
      <span style={{ color: color.muted, fontSize: '0.82rem' }}>
        Run a simulation to see the process table.
      </span>
    )
  }

  return (
    <div>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.8rem', tableLayout: 'fixed' }}>
        <thead>
          <tr>
            <th style={TH_STYLE} title="Process ID">PID</th>
            <th style={{ ...TH_STYLE, color: 'rgb(var(--accent))' }} title="Actual Linux OS PID from fork()">OS PID</th>
            <th style={{ ...TH_STYLE, ...MONO }} title="Arrival time">Arr</th>
            <th style={{ ...TH_STYLE, ...MONO }} title="Burst time">Burst</th>
            <th style={{ ...TH_STYLE, ...MONO }} title="Priority">Pri</th>
            <th style={TH_STYLE} title="Current status">State</th>
            <th style={{ ...TH_STYLE, ...MONO }} title="Remaining time">Rem</th>
            <th style={{ ...TH_STYLE, ...MONO }} title="Start time">Start</th>
            <th style={{ ...TH_STYLE, ...MONO }} title="Completion time">End</th>
            <th style={{ ...TH_STYLE, ...MONO }} title="Waiting time">Wait</th>
            <th style={{ ...TH_STYLE, ...MONO }} title="Turnaround time">TAT</th>
            <th style={{ ...TH_STYLE, ...MONO }} title="Response time">Resp</th>
          </tr>
        </thead>
        <tbody>
          {trace.processes.map((proc) => {
            const status = derived?.status[proc.pid] ?? 'new'
            const remaining = derived?.remaining[proc.pid] ?? proc.burst
            const pc = pidColor(proc.pid)

            // Show start only once we've passed it
            const showStart = t > proc.start
            // Show completion-dependent fields once we've reached or passed completion
            const showComplete = t >= proc.completion

            // Highlight running rows
            const rowBg = status === 'running' ? `${pc}11` : 'transparent'

            return (
              <tr key={proc.pid} style={{ background: rowBg }}>
                {/* PID with colored dot */}
                <td style={TD_STYLE}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: pc,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ ...MONO, color: pc, fontWeight: 600 }}>P{proc.pid}</span>
                  </div>
                </td>
                {/* OS PID — real Linux PID from fork(), or — in simulate mode */}
                <td style={{ ...TD_STYLE, ...MONO, fontSize: '0.72rem' }}>
                  {proc.os_pid != null && proc.os_pid > 0
                    ? <span style={{ color: 'rgb(var(--good))', fontWeight: 600 }}>{proc.os_pid}</span>
                    : <span style={{ color: color.muted }}>—</span>
                  }
                </td>
                <td style={{ ...TD_STYLE, ...MONO }}>{proc.arrival}</td>                <td style={{ ...TD_STYLE, ...MONO }}>{proc.burst}</td>
                <td style={{ ...TD_STYLE, ...MONO }}>{proc.priority}</td>
                {/* Status badge */}
                <td style={TD_STYLE}>
                  <span
                    style={{
                      ...statusStyle(status),
                      borderRadius: '4px',
                      padding: '2px 6px',
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                  >
                    {status}
                  </span>
                </td>
                <td style={{ ...TD_STYLE, ...MONO }}>{remaining}</td>
                <td style={{ ...TD_STYLE, ...MONO }}>{showStart ? proc.start : '—'}</td>
                <td style={{ ...TD_STYLE, ...MONO }}>{showComplete ? proc.completion : '—'}</td>
                <td style={{ ...TD_STYLE, ...MONO }}>{showComplete ? proc.waiting : '—'}</td>
                <td style={{ ...TD_STYLE, ...MONO }}>{showComplete ? proc.turnaround : '—'}</td>
                <td style={{ ...TD_STYLE, ...MONO }}>{showComplete ? proc.response : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
