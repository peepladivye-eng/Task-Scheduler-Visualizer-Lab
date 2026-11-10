import React, { useRef, useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useStudio } from '../store/useStudio'
import { useFocus, focusProps, dimClass } from '../store/useFocus'
import { makeScale } from '../lib/timeScale'
import { totalTime } from '../lib/deriveState'
import type { Trace } from '../types/trace'

/* Contract PID_COLORS: pid1→index0, etc. */
const PID_COLORS = [
  '#6ea8fe', '#3ddc97', '#ffb454', '#ff6b9d', '#b794f6',
  '#4fd1c5', '#f6e05e', '#fc8181', '#90cdf4', '#a3e635',
]
function pidColor(pid: number) { return PID_COLORS[(pid - 1) % 10] }

const LABEL_W = 130  // px — sticky left column

interface WorkbenchProps {
  trace: Trace
  t: number
}

export default function Workbench({ trace, t }: WorkbenchProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(900)
  const reducedMotion = useReducedMotion()
  const speed = useStudio((s) => s.speed)
  const focusPid = useFocus((s) => s.pid)

  /* Measure the outer container so the scale stays correct */
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w && w > 100) setContainerWidth(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const total = totalTime(trace)
  /* Pass labelWidth so xFor() returns proper pixel positions */
  const scale = makeScale(total, containerWidth, LABEL_W)
  const { ppt, xFor, widthFor, totalWidth } = scale

  /* Duration of one-tick animation in seconds */
  const tickDur = reducedMotion ? 0 : (500 / speed) / 1000

  const processList = [...trace.processes].sort((a, b) => a.pid - b.pid)

  /* Ruler ticks: show every tick if ppt>=20, else every 5 */
  const rulerTicks: number[] = []
  for (let i = 0; i <= total; i++) {
    if (ppt >= 20 || i % 5 === 0) rulerTicks.push(i)
  }

  return (
    <div className="sheet p-0 overflow-hidden">
      <div className="p-4 overflow-x-auto" ref={containerRef}>
        {/* Fixed-width inner so the scroll works */}
        <div style={{ width: totalWidth, minWidth: totalWidth }}>

          {/* ── Ruler ─────────────────────────────────────────── */}
          <div className="relative h-8 border-b border-line" style={{ marginLeft: LABEL_W }}>
            {rulerTicks.map((tick) => {
              const x = xFor(tick) - LABEL_W   /* relative to timeline area */
              return (
                <div key={tick} className="absolute top-0" style={{ left: x }}>
                  <div className="w-px h-2 bg-line" />
                  <div className="absolute top-2 left-0 -translate-x-1/2 font-mono text-[10px] text-muted select-none">
                    {tick}
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── Process rows ──────────────────────────────────── */}
          {processList.map((proc) => {
            const color = pidColor(proc.pid)
            const runSegs = trace.timeline.filter(
              (s) => s.type === 'run' && s.pid === proc.pid
            )

            return (
              <div
                key={proc.pid}
                className={`relative h-12 border-b border-line/40 flex items-center ${dimClass(focusPid, proc.pid)}`}
                {...focusProps(proc.pid)}
              >
                {/* Label */}
                <div
                  className="absolute left-0 top-0 bottom-0 flex items-center gap-2 px-2"
                  style={{ width: LABEL_W }}
                >
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                  <div>
                    <div className="font-mono font-semibold text-sm text-ink leading-none">P{proc.pid}</div>
                    <div className="font-mono text-[10px] text-muted leading-none mt-0.5">
                      {proc.arrival} · {proc.burst}
                    </div>
                  </div>
                </div>

                {/* Timeline area */}
                <div className="absolute inset-y-0" style={{ left: LABEL_W, right: 0 }}>
                  {/* Arrival marker */}
                  <div
                    className="absolute top-0 bottom-0 w-px bg-muted/40"
                    style={{ left: xFor(proc.arrival) - LABEL_W }}
                  />

                  {/* Run segments */}
                  {runSegs.map((seg, i) => {
                    const left = xFor(seg.t_start) - LABEL_W
                    const width = widthFor(seg.t_end - seg.t_start)
                    /* How far the playhead has crossed this segment: 0..1 */
                    const fill = seg.t_start >= t ? 0
                      : Math.min(1, (t - seg.t_start) / (seg.t_end - seg.t_start))

                    return (
                      <div
                        key={i}
                        className="absolute top-2 bottom-2 overflow-hidden rounded"
                        style={{ left, width }}
                      >
                        {/* Ghost outline — always visible */}
                        <div
                          className="absolute inset-0 rounded border-2 opacity-30"
                          style={{ borderColor: color }}
                        />
                        {/* Animated fill */}
                        <motion.div
                          className="absolute inset-y-0 left-0 rounded flex items-center justify-center overflow-hidden"
                          animate={{ width: `${fill * 100}%` }}
                          transition={fill === 0 ? { duration: 0 } : { duration: tickDur, ease: 'linear' }}
                          style={{ backgroundColor: color }}
                        >
                          <span
                            className="font-mono text-[10px] font-bold whitespace-nowrap px-1"
                            style={{ color: '#0b0f17' }}
                          >
                            P{proc.pid}
                          </span>
                        </motion.div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* ── CPU row ───────────────────────────────────────── */}
          <div className="relative h-12 flex items-center">
            {/* Label */}
            <div
              className="absolute left-0 top-0 bottom-0 flex items-center px-2"
              style={{ width: LABEL_W }}
            >
              <span className="font-mono font-semibold text-sm text-ink">CPU</span>
            </div>

            {/* Timeline area */}
            <div className="absolute inset-y-0" style={{ left: LABEL_W, right: 0 }}>
              {trace.timeline.map((seg, i) => {
                const left = xFor(seg.t_start) - LABEL_W
                const width = widthFor(seg.t_end - seg.t_start)
                const fill = seg.t_start >= t ? 0
                  : Math.min(1, (t - seg.t_start) / (seg.t_end - seg.t_start))

                if (seg.type === 'idle') {
                  return (
                    <div
                      key={i}
                      className="absolute top-2 bottom-2 rounded hatch-idle flex items-center justify-center"
                      style={{ left, width }}
                    >
                      <span className="font-mono text-[10px] text-muted">idle</span>
                    </div>
                  )
                }

                if (seg.type === 'context_switch' && seg.pid !== null) {
                  return (
                    <div
                      key={i}
                      className="absolute top-2 bottom-2 rounded hatch-cs flex items-center justify-center"
                      style={{ left, width }}
                    >
                      <span className="font-mono text-[10px] font-semibold text-warn">CS</span>
                    </div>
                  )
                }

                if (seg.type === 'run' && seg.pid !== null) {
                  const color = pidColor(seg.pid)
                  return (
                    <div
                      key={i}
                      className="absolute top-2 bottom-2 overflow-hidden rounded"
                      style={{ left, width }}
                    >
                      {/* ghost */}
                      <div
                        className="absolute inset-0 rounded border opacity-20"
                        style={{ borderColor: color }}
                      />
                      {/* fill */}
                      <motion.div
                        className="absolute inset-y-0 left-0 rounded"
                        animate={{ width: `${fill * 100}%` }}
                        transition={fill === 0 ? { duration: 0 } : { duration: tickDur, ease: 'linear' }}
                        style={{ backgroundColor: color }}
                      />
                    </div>
                  )
                }

                return null
              })}
            </div>
          </div>

          {/* ── Playhead ──────────────────────────────────────── */}
          <motion.div
            className="absolute top-0 bottom-0 w-0.5 pointer-events-none z-10"
            style={{
              left: xFor(t),
              backgroundColor: 'rgb(var(--accent))',
              boxShadow: '0 0 8px rgb(var(--accent) / 0.5)',
            }}
            animate={{ left: xFor(t) }}
            transition={reducedMotion ? { duration: 0 } : { duration: tickDur, ease: 'linear' }}
          />
        </div>
      </div>
    </div>
  )
}
