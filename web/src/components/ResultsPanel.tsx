import React from 'react'
import { motion } from 'framer-motion'
import { Trophy, Clock, ArrowRight, TrendingDown } from 'lucide-react'
import { useStudio } from '../store/useStudio'
import { totalTime } from '../lib/deriveState'
import { ALGO_LABEL } from '../types/trace'
import { fmtMs, fmtPct, fmt } from '../lib/format'
import { spring, stagger } from '../design/motion'

const PID_COLORS = [
  '#6ea8fe', '#3ddc97', '#ffb454', '#ff6b9d', '#b794f6',
  '#4fd1c5', '#f6e05e', '#fc8181', '#90cdf4', '#a3e635',
]
const getPidColor = (pid: number) => PID_COLORS[(pid - 1) % 10]

export default function ResultsPanel() {
  const trace = useStudio((s) => s.trace)
  const t = useStudio((s) => s.t)
  const seekStart = useStudio((s) => s.seekStart)

  if (!trace) return null

  const total = totalTime(trace)
  // Only show when simulation is complete
  if (t < total) return null

  const m = trace.metrics
  const processes = [...trace.processes].sort((a, b) => a.waiting - b.waiting)

  const stars =
    m.cpu_utilization >= 90 ? 3
    : m.cpu_utilization >= 70 ? 2
    : 1

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring.snappy}
      className="sheet space-y-5 border-t-4 border-accent"
    >
      {/* Title */}
      <div className="flex items-center gap-3">
        <Trophy className="w-6 h-6 text-warn" />
        <div>
          <h2 className="font-display font-semibold text-ink text-xl">Simulation Complete</h2>
          <p className="text-muted text-sm">
            {ALGO_LABEL[trace.algo]}
            {trace.algo === 'rr' ? ` (Q = ${trace.quantum})` : ''}
            {trace.context_switch_cost > 0 ? ` · CS = ${trace.context_switch_cost} ms` : ''}
          </p>
        </div>
        {/* Star rating */}
        <div className="ml-auto flex gap-1">
          {[1, 2, 3].map((n) => (
            <span key={n} className={`text-2xl ${n <= stars ? 'text-warn' : 'text-line'}`}>
              ★
            </span>
          ))}
        </div>
      </div>

      {/* Key metrics row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Clock, label: 'Avg Waiting', value: fmtMs(m.avg_waiting), good: m.avg_waiting < 10 },
          { icon: ArrowRight, label: 'Avg Turnaround', value: fmtMs(m.avg_turnaround), good: m.avg_turnaround < 20 },
          { icon: TrendingDown, label: 'CPU Utilization', value: fmtPct(m.cpu_utilization), good: m.cpu_utilization > 80 },
        ].map(({ icon: Icon, label, value, good }) => (
          <div key={label} className="bg-chip rounded-lg px-4 py-3 space-y-1">
            <div className="flex items-center gap-2">
              <Icon className={`w-3.5 h-3.5 ${good ? 'text-good' : 'text-muted'}`} />
              <span className="text-xs text-muted">{label}</span>
            </div>
            <div className={`font-mono font-bold text-lg ${good ? 'text-good' : 'text-ink'}`}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Per-process breakdown */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
          Per-process breakdown
        </div>
        <div className="space-y-2">
          {processes.map((proc, i) => {
            const color = getPidColor(proc.pid)
            const waitFrac = m.avg_waiting > 0 ? proc.waiting / (m.avg_waiting * 2) : 0
            return (
              <motion.div
                key={proc.pid}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...spring.snappy, delay: i * 0.05 }}
                className="flex items-center gap-3"
              >
                {/* PID chip */}
                <div
                  className="w-10 text-center font-mono font-bold text-xs py-0.5 rounded"
                  style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}66` }}
                >
                  P{proc.pid}
                </div>
                {/* Wait bar */}
                <div className="flex-1 h-2 bg-chip rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, waitFrac * 100)}%` }}
                    transition={{ ...spring.soft, delay: i * 0.05 + 0.1 }}
                  />
                </div>
                {/* Stats */}
                <div className="font-mono text-xs text-muted tabular-nums w-32 text-right">
                  wait {proc.waiting} · tat {proc.turnaround}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Context switches note */}
      {m.context_switches > 0 && (
        <p className="text-xs text-muted">
          {m.context_switches} context switch{m.context_switches !== 1 ? 'es' : ''} occurred.
        </p>
      )}

      {/* Replay */}
      <button
        onClick={seekStart}
        className="text-sm text-accent hover:underline font-medium"
      >
        ← Replay from start
      </button>
    </motion.div>
  )
}
