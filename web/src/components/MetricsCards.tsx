import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useStudio } from '../store/useStudio'
import { fmtMs, fmtPct, fmt } from '../lib/format'

const CARDS = [
  { key: 'avg_waiting',      label: 'Avg Waiting',      formula: 'turnaround − burst',         format: (v: number) => fmtMs(v) },
  { key: 'avg_turnaround',   label: 'Avg Turnaround',   formula: 'completion − arrival',       format: (v: number) => fmtMs(v) },
  { key: 'avg_response',     label: 'Avg Response',     formula: 'first run − arrival',        format: (v: number) => fmtMs(v) },
  { key: 'cpu_utilization',  label: 'CPU Utilization',  formula: 'run ticks / total × 100',    format: (v: number) => fmtPct(v) },
  { key: 'throughput',       label: 'Throughput',       formula: 'n / total time',             format: (v: number) => `${fmt(v, 4)} /ms` },
  { key: 'context_switches', label: 'Context Switches', formula: 'count of CS events',         format: (v: number) => String(v) },
] as const

export default function MetricsCards() {
  const trace = useStudio((s) => s.trace)
  const reducedMotion = useReducedMotion()

  if (!trace) {
    return (
      <div className="sheet">
        <p className="text-muted text-sm">Run a simulation to see metrics.</p>
      </div>
    )
  }

  const m = trace.metrics

  return (
    <div
      key={`${trace.algo}-${m.avg_waiting}`}
      className="grid grid-cols-3 gap-3"
    >
      {CARDS.map((card, i) => {
        const value = m[card.key as keyof typeof m] as number
        return (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reducedMotion ? 0 : 0.22,
              delay: reducedMotion ? 0 : i * 0.04,
            }}
            className="sheet space-y-1"
          >
            {/* Value */}
            <div className="font-mono font-bold text-lg text-accent leading-none">
              {card.format(value)}
            </div>
            {/* Label */}
            <div className="text-xs font-medium text-ink">{card.label}</div>
            {/* Formula */}
            <div className="text-xs text-muted">{card.formula}</div>
          </motion.div>
        )
      })}
    </div>
  )
}
