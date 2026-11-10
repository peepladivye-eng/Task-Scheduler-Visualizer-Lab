import React from 'react'
import { motion } from 'framer-motion'
import { useStudio } from '../store/useStudio'
import { ALGO_ORDER, ALGO_LABEL, type Metrics } from '../types/trace'
import { fmtMs, fmtPct, fmt } from '../lib/format'

/* One color per algo in ALGO_ORDER */
const ALGO_COLORS = ['#6ea8fe', '#3ddc97', '#ffb454', '#ff6b9d', '#b794f6', '#fc8181']

/* Bar charts — four metrics, lower is better */
const BAR_METRICS: { key: keyof Metrics; label: string; higherBetter?: boolean }[] = [
  { key: 'avg_waiting',      label: 'Avg Waiting (ms)' },
  { key: 'avg_turnaround',   label: 'Avg Turnaround (ms)' },
  { key: 'avg_response',     label: 'Avg Response (ms)' },
  { key: 'context_switches', label: 'Context Switches' },
]

/* Table columns */
const TABLE_COLS: { key: keyof Metrics; label: string; fmt: (v: number) => string; higherBetter?: boolean }[] = [
  { key: 'avg_waiting',      label: 'Avg Wait',    fmt: fmtMs },
  { key: 'avg_turnaround',   label: 'Avg TAT',     fmt: fmtMs },
  { key: 'avg_response',     label: 'Avg Response', fmt: fmtMs },
  { key: 'cpu_utilization',  label: 'CPU %',       fmt: (v) => fmt(v) + ' %', higherBetter: true },
  { key: 'throughput',       label: 'Throughput',  fmt: (v) => fmt(v, 4),     higherBetter: true },
  { key: 'context_switches', label: 'CS',          fmt: (v) => String(v) },
]

export default function CompareView() {
  const compare = useStudio((s) => s.compare)

  if (!compare || compare.runs.length !== 6) {
    return (
      <div className="sheet flex items-center justify-center min-h-[200px]">
        <p className="text-muted text-sm">Switch to <strong className="text-ink">Compare All</strong> mode to see results.</p>
      </div>
    )
  }

  const runs = compare.runs

  return (
    <div className="space-y-5">

      {/* ── Bar charts ── */}
      <div className="grid grid-cols-2 gap-4">
        {BAR_METRICS.map((metric) => {
          const values = runs.map((r) => r.metrics[metric.key] as number)
          const best   = metric.higherBetter ? Math.max(...values) : Math.min(...values)
          const maxVal = Math.max(...values, 0.001)   /* avoid div/0 */

          return (
            <div key={metric.key} className="sheet space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted">
                {metric.label} — {metric.higherBetter ? 'higher' : 'lower'} is better
              </div>

              <div className="flex items-end gap-2 h-20">
                {values.map((val, i) => {
                  const isBest  = val === best
                  const pct     = (val / maxVal) * 100
                  return (
                    <div
                      key={ALGO_ORDER[i]}
                      className="flex-1 flex flex-col items-center gap-1 h-full justify-end"
                    >
                      {isBest && (
                        <span className="text-[9px] font-bold text-good">best</span>
                      )}
                      <span className="font-mono text-[10px] text-ink">
                        {Number.isInteger(val) ? val : fmt(val)}
                      </span>
                      <motion.div
                        className="w-full rounded-t"
                        style={{ background: ALGO_COLORS[i], outline: isBest ? `2px solid rgb(var(--good))` : 'none', outlineOffset: 2 }}
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(pct, 3)}%` }}
                        transition={{ duration: 0.4, ease: 'easeOut', delay: i * 0.05 }}
                      />
                    </div>
                  )
                })}
              </div>

              {/* Algo labels */}
              <div className="flex gap-2">
                {ALGO_ORDER.map((a, i) => (
                  <div
                    key={a}
                    className="flex-1 text-center font-mono text-[9px] truncate"
                    style={{ color: ALGO_COLORS[i] }}
                  >
                    {ALGO_LABEL[a].replace('Round Robin', 'RR')}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Summary table ── */}
      <div className="sheet overflow-x-auto p-0">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-line">
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">
                Algorithm
              </th>
              {TABLE_COLS.map((col) => (
                <th
                  key={col.key}
                  className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted whitespace-nowrap"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {runs.map((run, ri) => (
              <tr key={run.algo} className="border-b border-line/30 last:border-0">
                <td
                  className="px-4 py-2.5 font-mono font-bold text-sm"
                  style={{ color: ALGO_COLORS[ri] }}
                >
                  {ALGO_LABEL[run.algo]}
                </td>
                {TABLE_COLS.map((col) => {
                  const val     = run.metrics[col.key] as number
                  const allVals = runs.map((r) => r.metrics[col.key] as number)
                  const isBest  = col.higherBetter
                    ? val === Math.max(...allVals)
                    : val === Math.min(...allVals)
                  return (
                    <td
                      key={col.key}
                      className="px-4 py-2.5 text-right font-mono text-xs tabular-nums"
                      style={{ color: isBest ? 'rgb(var(--good))' : undefined, fontWeight: isBest ? 700 : 400 }}
                    >
                      {col.fmt(val)}
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
