import React, { useState } from 'react'
import { useStudio } from '../store/useStudio'
import { ALGO_LABEL, ALGO_ORDER, type Algo, type ProcInput } from '../types/trace'
import { PRESETS } from '../lib/presets.generated'
import { color, radius } from '../design/tokens'

// Validation limits from web-contract.md
const LIMITS = {
  pid:      { min: 1,    max: 1_000_000 },
  arrival:  { min: 0,    max: 10_000 },
  burst:    { min: 1,    max: 10_000 },
  priority: { min: 0,    max: 1_000 },
  quantum:  { min: 1,    max: 10_000 },
  cs:       { min: 0,    max: 100 },
}

type Field = 'pid' | 'arrival' | 'burst' | 'priority'

interface RowError {
  pid?: string
  arrival?: string
  burst?: string
  priority?: string
}

function validateProcesses(procs: ProcInput[]): { rowErrors: RowError[]; globalError: string | null } {
  const rowErrors: RowError[] = procs.map(() => ({}))
  let globalError: string | null = null

  // Check individual field ranges
  procs.forEach((p, i) => {
    if (!Number.isInteger(p.pid) || p.pid < LIMITS.pid.min || p.pid > LIMITS.pid.max)
      rowErrors[i].pid = `PID must be ${LIMITS.pid.min}..${LIMITS.pid.max}`
    if (!Number.isInteger(p.arrival) || p.arrival < LIMITS.arrival.min || p.arrival > LIMITS.arrival.max)
      rowErrors[i].arrival = `0..${LIMITS.arrival.max}`
    if (!Number.isInteger(p.burst) || p.burst < LIMITS.burst.min || p.burst > LIMITS.burst.max)
      rowErrors[i].burst = `1..${LIMITS.burst.max}`
    if (!Number.isInteger(p.priority) || p.priority < LIMITS.priority.min || p.priority > LIMITS.priority.max)
      rowErrors[i].priority = `0..${LIMITS.priority.max}`
  })

  // Check duplicate pids
  const seen = new Map<number, number>()
  procs.forEach((p, i) => {
    if (seen.has(p.pid)) {
      rowErrors[i].pid = `Duplicate PID ${p.pid}`
      const prev = seen.get(p.pid)!
      rowErrors[prev].pid = `Duplicate PID ${p.pid}`
    } else {
      seen.set(p.pid, i)
    }
  })

  if (procs.length === 0) globalError = 'Add at least one process.'
  if (procs.length > 64)  globalError = 'Maximum 64 processes.'

  return { rowErrors, globalError }
}

/** A single number input cell */
function NumCell({
  value,
  min,
  max,
  onChange,
  error,
}: {
  value: number
  min: number
  max: number
  onChange: (v: number) => void
  error?: string
}) {
  return (
    <td style={{ padding: '2px 4px' }}>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
        title={error}
        style={{
          width: '62px',
          background: color.raised,
          color: error ? color.danger : color.text,
          border: `1px solid ${error ? color.danger : color.border}`,
          borderRadius: radius.control,
          padding: '3px 6px',
          fontFamily: '"JetBrains Mono", Consolas, monospace',
          fontSize: '0.82rem',
          outline: 'none',
        }}
      />
    </td>
  )
}

export default function TaskEditor() {
  const processes     = useStudio((s) => s.processes)
  const algo          = useStudio((s) => s.algo)
  const quantum       = useStudio((s) => s.quantum)
  const contextSwitch = useStudio((s) => s.contextSwitch)
  const status        = useStudio((s) => s.status)
  const view          = useStudio((s) => s.view)

  const setProcesses     = useStudio((s) => s.setProcesses)
  const setAlgo          = useStudio((s) => s.setAlgo)
  const setQuantum       = useStudio((s) => s.setQuantum)
  const setContextSwitch = useStudio((s) => s.setContextSwitch)
  const loadPreset       = useStudio((s) => s.loadPreset)
  const run              = useStudio((s) => s.run)
  const setView          = useStudio((s) => s.setView)

  const [presetId, setPresetId] = useState('')

  const { rowErrors, globalError } = validateProcesses(processes)
  const hasErrors = globalError !== null || rowErrors.some((r) => Object.keys(r).length > 0)
  const isRunning = status === 'running'

  function updateRow(idx: number, field: Field, value: number) {
    const next = processes.map((p, i) => i === idx ? { ...p, [field]: value } : p)
    setProcesses(next)
  }

  function addRow() {
    const maxPid = processes.reduce((m, p) => Math.max(m, p.pid), 0)
    setProcesses([...processes, { pid: maxPid + 1, arrival: 0, burst: 1, priority: 1 }])
  }

  function deleteRow(idx: number) {
    setProcesses(processes.filter((_, i) => i !== idx))
  }

  function handlePreset(id: string) {
    setPresetId(id)
    if (id) loadPreset(id)
  }

  const needsQuantum = algo === 'rr' || view === 'compare'

  const inputStyle: React.CSSProperties = {
    background: color.raised,
    color: color.text,
    border: `1px solid ${color.border}`,
    borderRadius: radius.control,
    padding: '4px 8px',
    fontSize: '0.82rem',
    fontFamily: 'inherit',
    outline: 'none',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '0.72rem',
    color: color.muted,
    marginBottom: '2px',
    display: 'block',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Presets */}
      <div>
        <label style={labelStyle}>Preset</label>
        <select
          value={presetId}
          onChange={(e) => handlePreset(e.target.value)}
          style={{ ...inputStyle, width: '100%', appearance: 'none', WebkitAppearance: 'none' }}
        >
          <option value="">ΓÇö choose preset ΓÇö</option>
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* Process table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.82rem' }}>
          <thead>
            <tr>
              {(['PID', 'Arr', 'Burst', 'Pri'] as const).map((h) => (
                <th key={h} style={{ padding: '3px 4px', color: color.muted, fontWeight: 500, textAlign: 'left', fontSize: '0.72rem', borderBottom: `1px solid ${color.border}` }}>{h}</th>
              ))}
              <th style={{ width: '24px', borderBottom: `1px solid ${color.border}` }} />
            </tr>
          </thead>
          <tbody>
            {processes.map((p, i) => (
              <tr key={i}>
                <NumCell value={p.pid}      min={1} max={1_000_000} onChange={(v) => updateRow(i, 'pid', v)}      error={rowErrors[i]?.pid} />
                <NumCell value={p.arrival}  min={0} max={10_000}    onChange={(v) => updateRow(i, 'arrival', v)}  error={rowErrors[i]?.arrival} />
                <NumCell value={p.burst}    min={1} max={10_000}    onChange={(v) => updateRow(i, 'burst', v)}    error={rowErrors[i]?.burst} />
                <NumCell value={p.priority} min={0} max={1_000}     onChange={(v) => updateRow(i, 'priority', v)} error={rowErrors[i]?.priority} />
                <td style={{ padding: '2px 2px' }}>
                  <button
                    onClick={() => deleteRow(i)}
                    aria-label={`Delete process ${p.pid}`}
                    style={{ background: 'none', border: 'none', color: color.danger, cursor: 'pointer', fontSize: '1rem', padding: '0 4px', lineHeight: 1 }}
                  >
                    ├ù
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add process button */}
      <button
        onClick={addRow}
        style={{ ...inputStyle, cursor: 'pointer', color: color.accent, borderColor: color.accent, background: 'transparent', width: '100%', padding: '5px' }}
      >
        + Add process
      </button>

      {/* Global error */}
      {globalError && (
        <div style={{ color: color.danger, fontSize: '0.78rem' }}>{globalError}</div>
      )}

      {/* Algorithm */}
      <div>
        <label style={labelStyle}>Algorithm</label>
        <select
          value={view === 'compare' ? 'compare' : algo}
          onChange={(e) => {
            if (e.target.value === 'compare') {
              setView('compare')
            } else {
              setView('single')
              setAlgo(e.target.value as Algo)
            }
          }}
          style={{ ...inputStyle, width: '100%', appearance: 'none', WebkitAppearance: 'none' }}
        >
          {ALGO_ORDER.map((a) => (
            <option key={a} value={a}>{ALGO_LABEL[a]}</option>
          ))}
          <option value="compare">Compare All</option>
        </select>
      </div>

      {/* Quantum */}
      <div style={{ opacity: needsQuantum ? 1 : 0.4 }}>
        <label style={labelStyle}>Quantum (ms)</label>
        <input
          type="number"
          value={quantum}
          min={1}
          max={10_000}
          disabled={!needsQuantum}
          onChange={(e) => setQuantum(parseInt(e.target.value, 10) || 1)}
          style={{ ...inputStyle, width: '80px', fontFamily: '"JetBrains Mono", Consolas, monospace' }}
        />
      </div>

      {/* Context switch */}
      <div>
        <label style={labelStyle}>Context switch cost (ms)</label>
        <input
          type="number"
          value={contextSwitch}
          min={0}
          max={100}
          onChange={(e) => setContextSwitch(parseInt(e.target.value, 10) || 0)}
          style={{ ...inputStyle, width: '80px', fontFamily: '"JetBrains Mono", Consolas, monospace' }}
        />
      </div>
    </div>
  )
}
