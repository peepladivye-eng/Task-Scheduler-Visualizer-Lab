import React from 'react'
import { useStudio } from '../store/useStudio'
import { RULE_TEXT } from '../lib/explain'
import { ALGO_ORDER, ALGO_LABEL, type Algo } from '../types/trace'
import { color, font, radius } from '../design/tokens'

export default function ScenarioBar() {
  const algo = useStudio((s) => s.algo)
  const quantum = useStudio((s) => s.quantum)
  const contextSwitch = useStudio((s) => s.contextSwitch)
  const sim = useStudio((s) => s.sim)
  const problems = useStudio((s) => s.problems)
  
  const setAlgo = useStudio((s) => s.setAlgo)
  const setQuantum = useStudio((s) => s.setQuantum)
  const setContextSwitch = useStudio((s) => s.setContextSwitch)

  // Status chip
  const statusChip = () => {
    switch (sim) {
      case 'working':
        return { label: 'Simulating…', color: color.muted }
      case 'fresh':
        return { label: 'Up to date', color: color.good }
      case 'invalid':
        return { label: 'Fix inputs', color: color.bad }
      case 'error':
        return { label: 'Error', color: color.bad }
      default:
        return { label: 'Idle', color: color.muted }
    }
  }

  const status = statusChip()

  return (
    <div
      style={{
        background: color.sheet,
        border: `1px solid ${color.line}`,
        borderRadius: radius.panel,
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {/* Algorithm selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600, color: color.muted, fontSize: '0.8rem' }}>
          Algorithm:
        </span>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {ALGO_ORDER.map((a) => (
            <button
              key={a}
              onClick={() => setAlgo(a)}
              style={{
                background: a === algo ? color.accent : 'transparent',
                color: a === algo ? color.sheet : color.ink,
                border: `1.5px solid ${a === algo ? color.accent : color.line}`,
                borderRadius: radius.control,
                padding: '6px 12px',
                fontSize: '0.8rem',
                fontWeight: a === algo ? 600 : 500,
                cursor: 'pointer',
                fontFamily: font.ui,
                transition: 'all 200ms ease-out',
              }}
            >
              {ALGO_LABEL[a]}
            </button>
          ))}
        </div>

        {/* Status chip on the right */}
        <div
          style={{
            marginLeft: 'auto',
            background: `${status.color}20`,
            color: status.color,
            border: `1.5px solid ${status.color}`,
            borderRadius: radius.control,
            padding: '4px 10px',
            fontSize: '0.75rem',
            fontWeight: 600,
            fontFamily: font.mono,
          }}
        >
          {status.label}
        </div>
      </div>

      {/* Rule text */}
      <div
        style={{
          fontStyle: 'italic',
          color: color.muted,
          fontSize: '0.85rem',
          lineHeight: 1.5,
        }}
      >
        Rule: {RULE_TEXT[algo]}
      </div>

      {/* Controls row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
        {/* Quantum stepper (only for RR) */}
        {algo === 'rr' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: color.muted, fontWeight: 500 }}>
              Quantum:
            </span>
            <button
              onClick={() => setQuantum(Math.max(1, quantum - 1))}
              disabled={quantum <= 1}
              style={{
                background: color.sheet,
                border: `1px solid ${color.line}`,
                borderRadius: radius.control,
                padding: '4px 8px',
                color: quantum <= 1 ? color.muted : color.ink,
                cursor: quantum <= 1 ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontFamily: font.mono,
              }}
            >
              −
            </button>
            <span
              style={{
                fontFamily: font.mono,
                fontSize: '0.9rem',
                fontWeight: 600,
                minWidth: '2ch',
                textAlign: 'center',
              }}
            >
              {quantum}
            </span>
            <button
              onClick={() => setQuantum(quantum + 1)}
              style={{
                background: color.sheet,
                border: `1px solid ${color.line}`,
                borderRadius: radius.control,
                padding: '4px 8px',
                color: color.ink,
                cursor: 'pointer',
                fontWeight: 600,
                fontFamily: font.mono,
              }}
            >
              +
            </button>
          </div>
        )}

        {/* Context switch stepper */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: color.muted, fontWeight: 500 }}>
            Context switch cost:
          </span>
          <button
            onClick={() => setContextSwitch(Math.max(0, contextSwitch - 1))}
            disabled={contextSwitch <= 0}
            style={{
              background: color.sheet,
              border: `1px solid ${color.line}`,
              borderRadius: radius.control,
              padding: '4px 8px',
              color: contextSwitch <= 0 ? color.muted : color.ink,
              cursor: contextSwitch <= 0 ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontFamily: font.mono,
            }}
          >
            −
          </button>
          <span
            style={{
              fontFamily: font.mono,
              fontSize: '0.9rem',
              fontWeight: 600,
              minWidth: '2ch',
              textAlign: 'center',
            }}
          >
            {contextSwitch}
          </span>
          <button
            onClick={() => setContextSwitch(Math.min(100, contextSwitch + 1))}
            disabled={contextSwitch >= 100}
            style={{
              background: color.sheet,
              border: `1px solid ${color.line}`,
              borderRadius: radius.control,
              padding: '4px 8px',
              color: contextSwitch >= 100 ? color.muted : color.ink,
              cursor: contextSwitch >= 100 ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontFamily: font.mono,
            }}
          >
            +
          </button>
        </div>
      </div>

      {/* Validation problems */}
      {problems.length > 0 && (
        <div
          style={{
            background: `${color.bad}15`,
            border: `1px solid ${color.bad}`,
            borderRadius: radius.control,
            padding: '8px 12px',
            fontSize: '0.8rem',
            color: color.bad,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>Input Problems:</div>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {problems.map((p, i) => (
              <li key={i}>{p.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
