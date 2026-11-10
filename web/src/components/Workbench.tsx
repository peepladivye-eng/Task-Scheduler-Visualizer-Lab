import React, { useRef, useEffect, useState } from 'react'
import { useStudio } from '../store/useStudio'
import { useFocus, focusProps, dimClass } from '../store/useFocus'
import { totalTime } from '../lib/deriveState'
import type { Trace } from '../types/trace'

const PID_COLORS = [
  '#6ea8fe', '#3ddc97', '#ffb454', '#ff6b9d', '#b794f6',
  '#4fd1c5', '#f6e05e', '#fc8181', '#90cdf4', '#a3e635',
]
const pidColor = (pid: number) => PID_COLORS[(pid - 1) % 10]

const LABEL_W = 120   // px for label column
const ROW_H   = 44    // px per row
const RULER_H = 28    // px
const MIN_PPT = 16    // min pixels per tick
const MAX_PPT = 50    // max pixels per tick

interface Props { trace: Trace; t: number }

export default function Workbench({ trace, t }: Props) {
  // We measure the CONTAINER div width by giving it a ref and reading
  // its offsetWidth — crucially we set overflow:hidden so it can't expand.
  const containerRef = useRef<HTMLDivElement>(null)
  const [availW, setAvailW] = useState(800)
  const speed    = useStudio((s) => s.speed)
  const focusPid = useFocus((s) => s.pid)

  useEffect(() => {
    function measure() {
      const el = containerRef.current
      if (!el) return
      // offsetWidth gives the CSS layout width, unaffected by children
      const w = el.offsetWidth
      if (w > 200) setAvailW(w)
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const total  = totalTime(trace)
  const procs  = [...trace.processes].sort((a, b) => a.pid - b.pid)

  // Compute pixels-per-tick from AVAILABLE width (after label column)
  const timelineW = availW - LABEL_W
  const rawPpt    = timelineW / (total + 2)   // +2 for right padding
  const ppt       = Math.max(MIN_PPT, Math.min(MAX_PPT, rawPpt))
  const innerW    = LABEL_W + (total + 2) * ppt  // total inner width

  // Position helpers — always relative to full inner width
  const xFor     = (tick: number) => LABEL_W + tick * ppt
  const wFor     = (dt: number)   => dt * ppt

  const dur = `${(500 / speed) / 1000}s`

  // Ruler ticks
  const rulerStep = ppt >= 24 ? 1 : ppt >= 12 ? 2 : 5
  const rulerTicks: number[] = []
  for (let i = 0; i <= total; i += rulerStep) rulerTicks.push(i)

  return (
    <div
      className="sheet p-0"
      style={{ overflow: 'hidden' }}
    >
      {/* constraining wrapper — overflow:hidden prevents children from expanding it */}
      <div
        ref={containerRef}
        style={{ overflow: 'hidden', position: 'relative', width: '100%' }}
      >
        {/* scrollable inner when content is wider */}
        <div style={{ overflowX: 'auto', overflowY: 'hidden' }}>
          {/* fixed-width canvas */}
          <div
            className="grid-paper relative"
            style={{ width: innerW, minWidth: innerW, paddingBottom: 8 }}
          >

            {/* ── Ruler ── */}
            <div
              className="relative border-b border-line"
              style={{ height: RULER_H, marginLeft: LABEL_W }}
            >
              {rulerTicks.map((tick) => {
                const x = xFor(tick) - LABEL_W
                return (
                  <React.Fragment key={tick}>
                    <div
                      style={{
                        position: 'absolute', left: x,
                        top: 0, bottom: 0, width: 1,
                        background: 'rgb(var(--line) / 0.5)',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute', left: x, top: 6,
                        transform: 'translateX(-50%)',
                        fontFamily: 'var(--font-mono, monospace)',
                        fontSize: 10, color: 'rgb(var(--muted))',
                        userSelect: 'none', whiteSpace: 'nowrap',
                      }}
                    >
                      {tick}
                    </div>
                  </React.Fragment>
                )
              })}
            </div>

            {/* ── Per-process rows ── */}
            {procs.map((proc) => {
              const color   = pidColor(proc.pid)
              const runSegs = trace.timeline.filter(s => s.type === 'run' && s.pid === proc.pid)

              return (
                <div
                  key={proc.pid}
                  className={dimClass(focusPid, proc.pid)}
                  style={{
                    position: 'relative',
                    height: ROW_H,
                    borderBottom: '1px solid rgb(var(--line) / 0.3)',
                  }}
                  {...focusProps(proc.pid)}
                >
                  {/* Label */}
                  <div style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0,
                    width: LABEL_W, display: 'flex', alignItems: 'center',
                    gap: 6, padding: '0 8px',
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12, color: 'rgb(var(--ink))' }}>
                        P{proc.pid}
                      </div>
                      <div style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgb(var(--muted))' }}>
                        a={proc.arrival} b={proc.burst}
                      </div>
                    </div>
                  </div>

                  {/* Arrival line */}
                  <div style={{
                    position: 'absolute', top: 0, bottom: 0,
                    left: xFor(proc.arrival), width: 1,
                    background: 'rgb(var(--muted) / 0.3)',
                  }} />

                  {/* Run segments */}
                  {runSegs.map((seg, i) => {
                    const segL = xFor(seg.t_start)
                    const segW = wFor(seg.t_end - seg.t_start)
                    const fill = t <= seg.t_start ? 0
                      : t >= seg.t_end   ? 1
                      : (t - seg.t_start) / (seg.t_end - seg.t_start)

                    return (
                      <div
                        key={i}
                        style={{
                          position: 'absolute',
                          left: segL, width: segW,
                          top: 5, bottom: 5,
                          borderRadius: 4,
                          overflow: 'hidden',
                        }}
                      >
                        {/* ghost border */}
                        <div style={{
                          position: 'absolute', inset: 0,
                          borderRadius: 4,
                          border: `2px solid ${color}`,
                          opacity: 0.35,
                        }} />
                        {/* colored fill */}
                        <div style={{
                          position: 'absolute', top: 0, bottom: 0, left: 0,
                          borderRadius: 4,
                          background: color,
                          width: `${fill * 100}%`,
                          minWidth: fill > 0 ? 3 : 0,
                          transition: `width ${dur} linear`,
                          display: 'flex', alignItems: 'center',
                          overflow: 'hidden',
                        }}>
                          <span style={{
                            fontFamily: 'monospace', fontSize: 9, fontWeight: 700,
                            color: '#0b0f17', paddingLeft: 3, whiteSpace: 'nowrap',
                          }}>
                            P{proc.pid}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}

            {/* ── CPU row ── */}
            <div style={{ position: 'relative', height: ROW_H }}>
              {/* Label */}
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                width: LABEL_W, display: 'flex', alignItems: 'center',
                padding: '0 8px',
              }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12, color: 'rgb(var(--ink))' }}>
                  CPU
                </span>
              </div>

              {trace.timeline.map((seg, i) => {
                const segL = xFor(seg.t_start)
                const segW = wFor(seg.t_end - seg.t_start)
                const fill = t <= seg.t_start ? 0
                  : t >= seg.t_end   ? 1
                  : (t - seg.t_start) / (seg.t_end - seg.t_start)

                if (seg.type === 'idle') {
                  return (
                    <div
                      key={i}
                      className="hatch-idle"
                      style={{
                        position: 'absolute',
                        left: segL, width: segW, top: 5, bottom: 5,
                        borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <span style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgb(var(--muted))' }}>idle</span>
                    </div>
                  )
                }

                if (seg.type === 'context_switch' && seg.pid !== null) {
                  return (
                    <div
                      key={i}
                      className="hatch-cs"
                      style={{
                        position: 'absolute',
                        left: segL, width: segW, top: 5, bottom: 5,
                        borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: 'rgb(var(--ink))' }}>CS</span>
                    </div>
                  )
                }

                if (seg.type === 'run' && seg.pid !== null) {
                  const color = pidColor(seg.pid)
                  return (
                    <div
                      key={i}
                      style={{
                        position: 'absolute',
                        left: segL, width: segW, top: 5, bottom: 5,
                        borderRadius: 4, overflow: 'hidden',
                      }}
                    >
                      {/* ghost */}
                      <div style={{
                        position: 'absolute', inset: 0, borderRadius: 4,
                        border: `1px solid ${color}`, opacity: 0.25,
                      }} />
                      {/* fill */}
                      <div style={{
                        position: 'absolute', top: 0, bottom: 0, left: 0,
                        borderRadius: 4,
                        background: color,
                        width: `${fill * 100}%`,
                        minWidth: fill > 0 ? 3 : 0,
                        transition: `width ${dur} linear`,
                      }} />
                    </div>
                  )
                }

                return null
              })}
            </div>

            {/* ── Playhead ── */}
            <div
              style={{
                position: 'absolute', top: 0, bottom: 0,
                left: xFor(t), width: 2,
                background: 'rgb(var(--accent))',
                boxShadow: '0 0 6px rgb(var(--accent) / 0.7)',
                pointerEvents: 'none', zIndex: 10,
                transition: `left ${dur} linear`,
              }}
            />

          </div>
        </div>
      </div>
    </div>
  )
}
