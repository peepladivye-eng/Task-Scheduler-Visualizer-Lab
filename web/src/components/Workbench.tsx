import React, { useRef, useEffect, useState } from 'react'
import { useStudio } from '../store/useStudio'
import { useFocus, focusProps, dimClass } from '../store/useFocus'
import { makeScale } from '../lib/timeScale'
import { totalTime } from '../lib/deriveState'
import type { Trace } from '../types/trace'

/* Contract: pid1 → index0 */
const PID_COLORS = [
  '#6ea8fe', '#3ddc97', '#ffb454', '#ff6b9d', '#b794f6',
  '#4fd1c5', '#f6e05e', '#fc8181', '#90cdf4', '#a3e635',
]
const pidColor = (pid: number) => PID_COLORS[(pid - 1) % 10]

const LABEL_W = 130

interface Props { trace: Trace; t: number }

export default function Workbench({ trace, t }: Props) {
  const outerRef = useRef<HTMLDivElement>(null)
  const [outerW, setOuterW] = useState(1000)
  const speed    = useStudio((s) => s.speed)
  const focusPid = useFocus((s) => s.pid)

  useEffect(() => {
    const el = outerRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      const w = e.contentRect.width
      if (w > 200) setOuterW(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const total  = totalTime(trace)
  const scale  = makeScale(total, outerW, LABEL_W)
  const { ppt, xFor, widthFor, totalWidth } = scale

  /* CSS transition duration for fills */
  const dur = `${(500 / speed) / 1000}s`

  const procs = [...trace.processes].sort((a, b) => a.pid - b.pid)

  /* Ruler: tick every 1 when ppt>=24, every 5 otherwise */
  const rulerStep = ppt >= 24 ? 1 : 5
  const rulerTicks: number[] = []
  for (let i = 0; i <= total; i += rulerStep) rulerTicks.push(i)

  return (
    <div className="sheet p-0 overflow-hidden">
      {/* grid-paper background */}
      <div className="grid-paper" ref={outerRef}>
        <div
          className="relative"
          style={{ width: totalWidth, minWidth: totalWidth, paddingTop: 8, paddingBottom: 8 }}
        >

          {/* ── Ruler ── */}
          <div
            className="relative h-7 border-b border-line mb-1"
            style={{ marginLeft: LABEL_W }}
          >
            {rulerTicks.map((tick) => {
              const x = xFor(tick) - LABEL_W
              return (
                <React.Fragment key={tick}>
                  <div className="absolute top-0 bottom-0 w-px bg-line/60" style={{ left: x }} />
                  <div
                    className="absolute top-1 font-mono text-[10px] text-muted select-none"
                    style={{ left: x, transform: 'translateX(-50%)' }}
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
                className={`relative h-11 border-b border-line/30 ${dimClass(focusPid, proc.pid)}`}
                {...focusProps(proc.pid)}
              >
                {/* Label */}
                <div
                  className="absolute left-0 inset-y-0 flex items-center gap-1.5 px-2"
                  style={{ width: LABEL_W }}
                >
                  <div
                    className="w-2 h-2 rounded-sm flex-shrink-0"
                    style={{ background: color }}
                  />
                  <div>
                    <div className="font-mono font-bold text-xs text-ink leading-none">P{proc.pid}</div>
                    <div className="font-mono text-[9px] text-muted leading-none mt-0.5">
                      a={proc.arrival} b={proc.burst}
                    </div>
                  </div>
                </div>

                {/* Arrival line */}
                <div
                  className="absolute inset-y-0 w-px bg-muted/30"
                  style={{ left: xFor(proc.arrival) }}
                />

                {/* Run segments */}
                {runSegs.map((seg, i) => {
                  const left  = xFor(seg.t_start)
                  const width = widthFor(seg.t_end - seg.t_start)
                  const fill  = t <= seg.t_start ? 0
                    : t >= seg.t_end ? 1
                    : (t - seg.t_start) / (seg.t_end - seg.t_start)

                  return (
                    <div
                      key={i}
                      className="absolute rounded overflow-hidden"
                      style={{ left, width, top: 6, bottom: 6 }}
                    >
                      {/* ghost */}
                      <div
                        className="absolute inset-0 rounded"
                        style={{ border: `2px solid ${color}`, opacity: 0.3 }}
                      />
                      {/* fill — plain CSS transition */}
                      <div
                        className="absolute inset-y-0 left-0 rounded flex items-center overflow-hidden"
                        style={{
                          width: `${fill * 100}%`,
                          background: color,
                          transition: `width ${dur} linear`,
                          minWidth: fill > 0 ? 2 : 0,
                        }}
                      >
                        <span
                          className="font-mono font-bold text-[9px] px-1 whitespace-nowrap"
                          style={{ color: '#0b0f17' }}
                        >
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
          <div className="relative h-11 mt-1">
            {/* Label */}
            <div
              className="absolute left-0 inset-y-0 flex items-center px-2"
              style={{ width: LABEL_W }}
            >
              <span className="font-mono font-bold text-xs text-ink">CPU</span>
            </div>

            {/* Segments */}
            {trace.timeline.map((seg, i) => {
              const left  = xFor(seg.t_start)
              const width = widthFor(seg.t_end - seg.t_start)
              const fill  = t <= seg.t_start ? 0
                : t >= seg.t_end ? 1
                : (t - seg.t_start) / (seg.t_end - seg.t_start)

              if (seg.type === 'idle') {
                return (
                  <div
                    key={i}
                    className="absolute hatch-idle rounded flex items-center justify-center"
                    style={{ left, width, top: 4, bottom: 4 }}
                  >
                    <span className="font-mono text-[9px] text-muted">idle</span>
                  </div>
                )
              }

              if (seg.type === 'context_switch' && seg.pid !== null) {
                return (
                  <div
                    key={i}
                    className="absolute hatch-cs rounded flex items-center justify-center"
                    style={{ left, width, top: 4, bottom: 4 }}
                  >
                    <span className="font-mono text-[9px] font-bold text-ink">CS</span>
                  </div>
                )
              }

              if (seg.type === 'run' && seg.pid !== null) {
                const color = pidColor(seg.pid)
                return (
                  <div
                    key={i}
                    className="absolute rounded overflow-hidden"
                    style={{ left, width, top: 4, bottom: 4 }}
                  >
                    <div
                      className="absolute inset-0 rounded"
                      style={{ border: `1px solid ${color}`, opacity: 0.25 }}
                    />
                    <div
                      className="absolute inset-y-0 left-0 rounded"
                      style={{
                        width: `${fill * 100}%`,
                        background: color,
                        transition: `width ${dur} linear`,
                        minWidth: fill > 0 ? 2 : 0,
                      }}
                    />
                  </div>
                )
              }
              return null
            })}
          </div>

          {/* ── Playhead ── */}
          <div
            className="absolute top-0 bottom-0 w-0.5 pointer-events-none z-10"
            style={{
              left: xFor(t),
              background: 'rgb(var(--accent))',
              boxShadow: '0 0 6px rgb(var(--accent) / 0.6)',
              transition: `left ${dur} linear`,
            }}
          />

        </div>
      </div>
    </div>
  )
}
