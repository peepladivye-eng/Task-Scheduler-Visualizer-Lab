import React from 'react'
import { useStudio } from '../store/useStudio'
import { ALGO_ORDER, ALGO_LABEL } from '../types/trace'
import { color } from '../design/tokens'
import { fmt, fmtMs } from '../lib/format'

// Metric definitions for the bar charts
const CHART_METRICS = [
  { key: 'avg_waiting',     label: 'Avg Waiting',     unit: 'ms',      higherBetter: false },
  { key: 'avg_turnaround',  label: 'Avg Turnaround',  unit: 'ms',      higherBetter: false },
  { key: 'avg_response',    label: 'Avg Response',    unit: 'ms',      higherBetter: false },
  { key: 'context_switches',label: 'Context Switches',unit: '',        higherBetter: false },
] as const

const TABLE_METRICS = [
  { key: 'avg_waiting',     label: 'Avg Wait',         format: fmtMs },
  { key: 'avg_turnaround',  label: 'Avg TAT',          format: fmtMs },
  { key: 'avg_response',    label: 'Avg Response',     format: fmtMs },
  { key: 'cpu_utilization', label: 'CPU %',            format: (n: number) => fmt(n) + '%' },
  { key: 'throughput',      label: 'Throughput',       format: (n: number) => fmt(n) },
  { key: 'context_switches',label: 'CS Count',         format: (n: number) => String(n) },
] as const

// One color per algo, aligned to ALGO_ORDER
const BAR_COLORS = [
  '#6ea8fe', '#3ddc97', '#ffb454', '#ff6b9d', '#b794f6', '#fc8181',
]

export default function CompareView() {
  const compare = useStudio((s) => s.compare)

  if (!compare || compare.runs.length !== 6) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px', color: color.muted, fontSize: '0.88rem' }}>
        Run "Compare All" to see results here.
      </div>
    )
  }

  const runs = compare.runs

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
      {/* Bar charts grid — 2 columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        {CHART_METRICS.map((metric) => {
          const values = runs.map((r) => r.metrics[metric.key as keyof typeof r.metrics] as number)
          const best   = metric.higherBetter ? Math.max(...values) : Math.min(...values)
          const maxVal = Math.max(...values)

          return (
            <div
              key={metric.key}
              style={{
                background: color.raised,
                border: `1px solid ${color.border}`,
                borderRadius: '8px',
                padding: '12px',
              }}
            >
              {/* Chart header */}
              <div style={{
                fontSize: '0.72rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: color.muted,
                marginBottom: '10px',
                fontWeight: 600,
              }}>
                {metric.label}{metric.unit ? ` (${metric.unit})` : ''} — lower is better
              </div>

              {/* Bars */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '80px' }}>
                {values.map((val, i) => {
                  const isBest    = val === best
                  const barHeight = maxVal > 0 ? (val / maxVal) * 100 : 0
                  return (
                    <div
                      key={ALGO_ORDER[i]}
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '3px',
                        height: '100%',
                        justifyContent: 'flex-end',
                        position: 'relative',
                      }}
                    >
                      {/* "best" badge */}
                      {isBest && (
                        <span style={{
                          position: 'absolute',
                          top: 0,
                          fontSize: '0.6rem',
                          color: color.success,
                          fontWeight: 700,
                        }}>
                          best
                        </span>
                      )}
                      {/* Numeric label above bar */}
                      <span style={{
                        fontSize: '0.65rem',
                        color: color.text,
                        fontFamily: '"JetBrains Mono", Consolas, monospace',
                      }}>
                        {typeof val === 'number' && !Number.isInteger(val) ? fmt(val) : val}
                      </span>
                      {/* Bar */}
                      <div
                        style={{
                          width: '100%',
                          height: `${Math.max(barHeight, 2)}%`,
                          background: BAR_COLORS[i],
                          borderRadius: '3px 3px 0 0',
                          outline: isBest ? `2px solid ${color.success}` : 'none',
                          outlineOffset: '1px',
                        }}
                      />
                    </div>
                  )
                })}
              </div>

              {/* Algo labels */}
              <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                {ALGO_ORDER.map((a) => (
                  <div key={a} style={{
                    flex: 1,
                    textAlign: 'center',
                    fontSize: '0.6rem',
                    color: color.muted,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {ALGO_LABEL[a].replace('Round Robin', 'RR')}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.8rem' }}>
          <thead>
            <tr>
              <th style={{
                padding: '6px 10px',
                color: color.muted,
                fontWeight: 500,
                textAlign: 'left',
                borderBottom: `1px solid ${color.border}`,
                whiteSpace: 'nowrap',
                fontSize: '0.72rem',
              }}>
                Algorithm
              </th>
              {TABLE_METRICS.map((m) => (
                <th key={m.key} style={{
                  padding: '6px 10px',
                  color: color.muted,
                  fontWeight: 500,
                  textAlign: 'right',
                  borderBottom: `1px solid ${color.border}`,
                  whiteSpace: 'nowrap',
                  fontSize: '0.72rem',
                }}>
                  {m.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {runs.map((run, i) => (
              <tr key={run.algo}>
                {/* Algo name colored by its BAR_COLORS entry */}
                <td style={{
                  padding: '5px 10px',
                  fontWeight: 600,
                  color: BAR_COLORS[i],
                  borderBottom: `1px solid ${color.border}20`,
                  fontFamily: '"JetBrains Mono", Consolas, monospace',
                  fontSize: '0.8rem',
                }}>
                  {ALGO_LABEL[run.algo]}
                </td>
                {TABLE_METRICS.map((m) => {
                  const val     = run.metrics[m.key as keyof typeof run.metrics] as number
                  const allVals = runs.map((r) => r.metrics[m.key as keyof typeof r.metrics] as number)
                  // cpu_utilization and throughput: higher is better; rest: lower is better
                  const isBest = (m.key === 'cpu_utilization' || m.key === 'throughput')
                    ? val === Math.max(...allVals)
                    : val === Math.min(...allVals)
                  return (
                    <td
                      key={m.key}
                      style={{
                        padding: '5px 10px',
                        textAlign: 'right',
                        fontFamily: '"JetBrains Mono", Consolas, monospace',
                        color: isBest ? color.success : color.text,
                        fontWeight: isBest ? 700 : 400,
                        borderBottom: `1px solid ${color.border}20`,
                        fontSize: '0.8rem',
                      }}
                    >
                      {m.format(val)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
