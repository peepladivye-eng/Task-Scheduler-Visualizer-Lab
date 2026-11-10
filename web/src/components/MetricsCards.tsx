import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useStudio } from '../store/useStudio'
import { color } from '../design/tokens'
import { fmtMs, fmtPct, fmt } from '../lib/format'

interface CardDef {
  label: string
  value: string
  formula: string
}

export default function MetricsCards() {
  const trace = useStudio((s) => s.trace)
  const reducedMotion = useReducedMotion()

  if (!trace) {
    return (
      <span style={{ color: color.muted, fontSize: '0.82rem' }}>
        Run a simulation to see metrics.
      </span>
    )
  }

  const m = trace.metrics

  const cards: CardDef[] = [
    {
      label:   'Avg Waiting',
      value:   fmtMs(m.avg_waiting),
      formula: 'turnaround ΓêÆ burst',
    },
    {
      label:   'Avg Turnaround',
      value:   fmtMs(m.avg_turnaround),
      formula: 'completion ΓêÆ arrival',
    },
    {
      label:   'Avg Response',
      value:   fmtMs(m.avg_response),
      formula: 'first run ΓêÆ arrival',
    },
    {
      label:   'CPU Utilization',
      value:   fmtPct(m.cpu_utilization),
      formula: 'run ticks / total ├ù 100',
    },
    {
      label:   'Throughput',
      value:   `${fmt(m.throughput)} jobs/ms`,
      formula: 'n / total time',
    },
    {
      label:   'Context Switches',
      value:   String(m.context_switches),
      formula: 'count of preemptions',
    },
  ]

  return (
    /* Key on algo + avg_waiting so the grid re-mounts (re-animates) when a new run completes */
    <div
      key={trace.algo + trace.metrics.avg_waiting}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '8px',
      }}
    >
      {cards.map((card, index) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: reducedMotion ? 0 : 0.22,
            delay: reducedMotion ? 0 : index * 0.03,
          }}
          style={{
            background: color.raised,
            border: `1px solid ${color.border}`,
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {/* Large value */}
          <span
            style={{
              fontFamily: '"JetBrains Mono", Consolas, monospace',
              fontSize: '1.1rem',
              fontWeight: 700,
              color: color.accent,
              lineHeight: 1.2,
            }}
          >
            {card.value}
          </span>
          {/* Label */}
          <span style={{ fontSize: '0.72rem', color: color.text, fontWeight: 500 }}>
            {card.label}
          </span>
          {/* Formula */}
          <span style={{ fontSize: '0.65rem', color: color.muted }}>
            {card.formula}
          </span>
        </motion.div>
      ))}
    </div>
  )
}
