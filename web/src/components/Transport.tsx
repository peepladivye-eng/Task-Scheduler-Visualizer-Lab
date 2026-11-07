import React from 'react'
import { SkipBack, ChevronLeft, Play, Pause, ChevronRight, SkipForward, RotateCcw } from 'lucide-react'
import { useStudio } from '../store/useStudio'
import { totalTime } from '../lib/deriveState'
import { color, radius } from '../design/tokens'

// Speed options shown as labels
const SPEED_OPTIONS = [0.5, 1, 2, 4] as const
type Speed = typeof SPEED_OPTIONS[number]

export default function Transport() {
  const t = useStudio((s) => s.t)
  const playing = useStudio((s) => s.playing)
  const speed = useStudio((s) => s.speed)
  const trace = useStudio((s) => s.trace)

  const seekStart = useStudio((s) => s.seekStart)
  const step = useStudio((s) => s.step)
  const toggle = useStudio((s) => s.toggle)
  const seekEnd = useStudio((s) => s.seekEnd)
  const setSpeed = useStudio((s) => s.setSpeed)
  const setT = useStudio((s) => s.setT)

  const total = trace ? totalTime(trace) : 0
  const atEnd = t >= total

  // Shared button style
  const btnBase: React.CSSProperties = {
    background: color.raised,
    border: `1px solid ${color.border}`,
    borderRadius: radius.control,
    padding: '5px 10px',
    color: color.text,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
    transition: 'border-color 160ms ease-out, color 160ms ease-out',
  }

  // Speed button — active gets accent style
  function speedBtn(s: Speed): React.CSSProperties {
    const active = speed === s
    return {
      ...btnBase,
      borderColor: active ? color.accent : color.border,
      color: active ? color.accent : color.muted,
      fontFamily: '"JetBrains Mono", Consolas, monospace',
      fontSize: '0.78rem',
      padding: '4px 8px',
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexWrap: 'wrap',
        width: '100%',
      }}
    >
      {/* Transport buttons */}
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        <button
          aria-label="Seek to start"
          style={btnBase}
          onClick={seekStart}
        >
          <SkipBack size={14} />
        </button>
        <button
          aria-label="Step back"
          style={btnBase}
          onClick={() => step(-1)}
        >
          <ChevronLeft size={14} />
        </button>
        <button
          aria-label={playing ? 'Pause' : atEnd ? 'Replay' : 'Play'}
          style={{ ...btnBase, borderColor: color.accent, color: color.accent, padding: '5px 12px' }}
          onClick={toggle}
        >
          {playing ? <Pause size={14} /> : atEnd ? <RotateCcw size={14} /> : <Play size={14} />}
        </button>
        <button
          aria-label="Step forward"
          style={btnBase}
          onClick={() => step(1)}
        >
          <ChevronRight size={14} />
        </button>
        <button
          aria-label="Seek to end"
          style={btnBase}
          onClick={seekEnd}
        >
          <SkipForward size={14} />
        </button>
      </div>

      {/* Speed segmented control */}
      <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
        {SPEED_OPTIONS.map((s) => (
          <button
            key={s}
            aria-label={`Speed ${s}x`}
            style={speedBtn(s)}
            onClick={() => setSpeed(s)}
          >
            {s}×
          </button>
        ))}
      </div>

      {/* Timeline slider */}
      <input
        type="range"
        min={0}
        max={total}
        value={t}
        onChange={(e) => setT(Number(e.target.value))}
        aria-label="Scrub timeline"
        style={{
          flex: '1 1 120px',
          minWidth: '80px',
          accentColor: color.accent,
          cursor: 'pointer',
        }}
      />

      {/* Readout */}
      <span
        style={{
          fontFamily: '"JetBrains Mono", Consolas, monospace',
          fontSize: '0.8rem',
          color: color.muted,
          whiteSpace: 'nowrap',
        }}
      >
        t = {t} / {total} ms
      </span>
    </div>
  )
}
