import React, { useRef, useEffect } from 'react'
import { useStudio } from '../store/useStudio'
import { color } from '../design/tokens'
import type { EvType } from '../types/trace'

// Color per event type
function evColor(type: EvType): string {
  switch (type) {
    case 'arrive':   return color.accent
    case 'dispatch': return color.success
    case 'preempt':  return color.warn
    case 'complete': return color.muted
  }
}

const MONO: React.CSSProperties = {
  fontFamily: '"JetBrains Mono", Consolas, monospace',
  fontSize: '0.78rem',
}

export default function EventLog() {
  const trace = useStudio((s) => s.trace)
  const t = useStudio((s) => s.t)

  // Ref to the last visible event element for auto-scroll
  const lastVisibleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    lastVisibleRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [t])

  if (!trace) {
    return (
      <span style={{ color: color.muted, fontSize: '0.82rem' }}>
        Run a simulation to see events.
      </span>
    )
  }

  const events = trace.events
  // Find index of last visible event (ev.t <= t)
  let lastVisibleIdx = -1
  for (let i = 0; i < events.length; i++) {
    if (events[i].t <= t) lastVisibleIdx = i
  }

  return (
    <div
      style={{
        overflowY: 'auto',
        maxHeight: '240px',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
      }}
    >
      {events.map((ev, idx) => {
        const visible = ev.t <= t
        const isLastVisible = idx === lastVisibleIdx
        const rq = ev.ready_queue.join(', ')
        const evC = evColor(ev.type)

        return (
          <div
            key={idx}
            ref={isLastVisible ? lastVisibleRef : undefined}
            style={{
              opacity: visible ? 1 : 0.25,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '3px 4px',
              borderRadius: '4px',
              background: visible ? `${evC}08` : 'transparent',
              transition: 'opacity 160ms ease-out',
            }}
          >
            {/* Timestamp */}
            <span style={{ ...MONO, color: color.muted, minWidth: '42px' }}>
              t={ev.t}
            </span>

            {/* Event type badge */}
            <span
              style={{
                ...MONO,
                background: `${evC}22`,
                color: evC,
                borderRadius: '3px',
                padding: '1px 6px',
                fontWeight: 600,
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                minWidth: '60px',
                textAlign: 'center',
              }}
            >
              {ev.type}
            </span>

            {/* PID */}
            <span style={{ ...MONO, color: color.text }}>
              P{ev.pid}
            </span>

            {/* Ready queue */}
            <span style={{ ...MONO, color: color.muted, fontSize: '0.72rem' }}>
              [{rq}]
            </span>
          </div>
        )
      })}
    </div>
  )
}
