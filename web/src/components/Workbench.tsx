import React, { useRef, useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useStudio } from '../store/useStudio'
import { useFocus, focusProps, dimClass } from '../store/useFocus'
import { makeScale } from '../lib/timeScale'
import { totalTime } from '../lib/deriveState'
import type { Trace } from '../types/trace'

const PID_COLORS = [
  '#ff7a59', '#3a86ff', '#2ec4a6', '#ffbe0b', '#9b5de5',
  '#ef476f', '#06a77d', '#f78c6b', '#118ab2', '#8ac926'
]

function getPidColor(pid: number): string {
  return PID_COLORS[(pid - 1) % 10]
}

interface WorkbenchProps {
  trace: Trace
  t: number
}

export default function Workbench({ trace, t }: WorkbenchProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(1000)
  const reducedMotion = useReducedMotion()
  const speed = useStudio((s) => s.speed)
  const focusPid = useFocus((s) => s.pid)
  
  // Measure container
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w && w > 0) setContainerWidth(w - 130) // subtract label column
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  
  const total = totalTime(trace)
  const scale = makeScale(total, containerWidth)
  const { ppt, xFor, width: timelineWidth } = scale
  
  // Playhead animation duration
  const playheadDuration = reducedMotion ? 0 : (500 / speed) / 1000
  
  // Group timeline by pid
  const processList = trace.processes.sort((a, b) => a.pid - b.pid)
  
  return (
    <div className="sheet space-y-0 p-0 overflow-hidden">
      <div className="grid-paper p-4">
        <div ref={containerRef} className="overflow-x-auto">
          <div className="flex">
            {/* Sticky label column */}
            <div className="w-[130px] flex-shrink-0 space-y-0">
              {/* Ruler header */}
              <div className="h-8" />
              
              {/* Process labels */}
              {processList.map((proc) => {
                const color = getPidColor(proc.pid)
                return (
                  <div
                    key={proc.pid}
                    className={`h-12 flex items-center gap-2 px-2 ${dimClass(focusPid, proc.pid)}`}
                    {...focusProps(proc.pid)}
                  >
                    <div
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <div className="flex-1">
                      <div className="font-mono font-semibold text-sm text-ink">
                        P{proc.pid}
                      </div>
                      <div className="font-mono text-xs text-muted">
                        {proc.arrival} · {proc.burst}
                      </div>
                    </div>
                  </div>
                )
              })}
              
              {/* CPU row label */}
              <div className="h-12 flex items-center px-2">
                <div className="font-mono font-semibold text-sm text-ink">CPU</div>
              </div>
            </div>
            
            {/* Timeline area */}
            <div className="flex-1 relative" style={{ width: timelineWidth }}>
              {/* Ruler */}
              <div className="h-8 relative border-b border-line">
                {Array.from({ length: total + 1 }, (_, i) => i).map((tick) => {
                  const x = xFor(tick)
                  const showLabel = ppt >= 20 || tick % 5 === 0
                  return (
                    <div
                      key={tick}
                      className="absolute top-0"
                      style={{ left: x }}
                    >
                      <div className="w-px h-2 bg-line" />
                      {showLabel && (
                        <div className="absolute top-2 left-0 -translate-x-1/2 font-mono text-xs text-muted">
                          {tick}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              
              {/* Process lanes */}
              {processList.map((proc) => {
                const color = getPidColor(proc.pid)
                const segments = trace.timeline.filter((seg) => seg.pid === proc.pid && seg.type === 'run')
                
                return (
                  <div
                    key={proc.pid}
                    className={`h-12 relative border-b border-line/50 ${dimClass(focusPid, proc.pid)}`}
                    {...focusProps(proc.pid)}
                  >
                    {/* Arrival tick */}
                    <div
                      className="absolute top-0 w-0.5 h-full bg-muted/50"
                      style={{ left: xFor(proc.arrival) }}
                    />
                    
                    {/* Run segments */}
                    {segments.map((seg, idx) => {
                      const x = xFor(seg.t_start)
                      const w = xFor(seg.t_end) - x
                      const progress = seg.t_start < t
                        ? Math.min(1, (t - seg.t_start) / (seg.t_end - seg.t_start))
                        : 0
                      
                      return (
                        <div key={idx} className="absolute top-2 bottom-2" style={{ left: x, width: w }}>
                          {/* Ghost outline */}
                          <div
                            className="absolute inset-0 rounded opacity-25 border-2"
                            style={{ borderColor: color }}
                          />
                          {/* Progressive fill */}
                          <motion.div
                            className="absolute inset-0 rounded"
                            style={{
                              backgroundColor: color,
                              width: `${progress * 100}%`,
                            }}
                            transition={
                              reducedMotion
                                ? { duration: 0 }
                                : { duration: playheadDuration, ease: 'linear' }
                            }
                          >
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="font-mono text-xs font-semibold" style={{ color: 'rgb(21 20 15)' }}>
                                P{proc.pid}
                              </span>
                            </div>
                          </motion.div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
              
              {/* CPU row */}
              <div className="h-12 relative">
                {trace.timeline.map((seg, idx) => {
                  const x = xFor(seg.t_start)
                  const w = xFor(seg.t_end) - x
                  const progress = seg.t_start < t
                    ? Math.min(1, (t - seg.t_start) / (seg.t_end - seg.t_start))
                    : 0
                  
                  if (seg.type === 'idle') {
                    return (
                      <div key={idx} className="absolute top-2 bottom-2 hatch-idle rounded" style={{ left: x, width: w }}>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="font-mono text-xs text-muted">idle</span>
                        </div>
                      </div>
                    )
                  }
                  
                  if (seg.type === 'context_switch' && seg.pid) {
                    return (
                      <div key={idx} className="absolute top-2 bottom-2 hatch-cs rounded" style={{ left: x, width: w }}>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="font-mono text-xs font-semibold text-ink">CS</span>
                        </div>
                      </div>
                    )
                  }
                  
                  if (seg.type === 'run' && seg.pid) {
                    const color = getPidColor(seg.pid)
                    return (
                      <div key={idx} className="absolute top-2 bottom-2" style={{ left: x, width: w }}>
                        <motion.div
                          className="absolute inset-0 rounded"
                          style={{
                            backgroundColor: color,
                            width: `${progress * 100}%`,
                          }}
                          transition={
                            reducedMotion
                              ? { duration: 0 }
                              : { duration: playheadDuration, ease: 'linear' }
                          }
                        />
                      </div>
                    )
                  }
                  
                  return null
                })}
              </div>
              
              {/* Playhead */}
              <motion.div
                className="absolute top-0 bottom-0 w-0.5 bg-accent pointer-events-none"
                style={{
                  left: xFor(t),
                  boxShadow: '0 0 8px rgb(var(--accent) / 0.5)',
                }}
                transition={
                  reducedMotion
                    ? { duration: 0 }
                    : { duration: playheadDuration, ease: 'linear' }
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
