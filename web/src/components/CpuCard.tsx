import React from 'react'
import { useStudio, useDerived } from '../store/useStudio'
import { totalTime } from '../lib/deriveState'
import { color } from '../design/tokens'
import { pidColor } from '../design/pidColor'

export default function CpuCard() {
  const trace = useStudio((s) => s.trace)
  const t = useStudio((s) => s.t)
  const derived = useDerived()

  // null derived → no trace loaded
  if (!derived || !trace) {
    return (
      <span style={{ color: color.muted, fontSize: '0.88rem' }}>—</span>
    )
  }

  const total = totalTime(trace)

  // Context switch active
  if (derived.csActive && derived.csPid !== null) {
    return (
      <div
        style={{
          border: `1px solid ${color.warn}88`,
          background: `${color.warn}11`,
          borderRadius: '8px',
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: color.warn, fontWeight: 600 }}>
          Context Switch
        </span>
        <span style={{ color: color.warn, fontWeight: 700, fontSize: '1rem' }}>
          → P{derived.csPid}
        </span>
      </div>
    )
  }

  // Running
  if (derived.running !== null) {
    const pid = derived.running.pid
    const pc = pidColor(pid)
    const proc = trace.processes.find((p) => p.pid === pid)
    const burst = proc?.burst ?? 1
    const rem = derived.remaining[pid] ?? 0
    const progressPct = Math.max(0, Math.min(100, (rem / burst) * 100))

    return (
      <div
        style={{
          border: `1px solid ${pc}88`,
          background: `${pc}22`,
          borderRadius: '8px',
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        {/* PID label */}
        <span style={{ color: pc, fontWeight: 700, fontSize: '1.4rem', fontFamily: '"JetBrains Mono", Consolas, monospace', lineHeight: 1 }}>
          P{pid}
        </span>
        {/* Status */}
        <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: pc, fontWeight: 600 }}>
          Running
        </span>
        {/* Remaining info */}
        <span style={{ fontSize: '0.78rem', color: color.muted, fontFamily: '"JetBrains Mono", Consolas, monospace' }}>
          remaining {rem} of {burst} ms
        </span>
        {/* Progress bar */}
        <div style={{ background: color.raised, borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
          <div
            style={{
              background: pc,
              height: '100%',
              width: `${progressPct}%`,
              borderRadius: '4px',
              transition: 'width 120ms ease-out',
            }}
          />
        </div>
      </div>
    )
  }

  // Idle / all done
  if (t >= total) {
    return (
      <span style={{ color: color.success, fontSize: '0.88rem', fontWeight: 600 }}>
        All done ✓
      </span>
    )
  }

  return (
    <span style={{ color: color.muted, fontSize: '0.88rem' }}>
      CPU idle
    </span>
  )
}
