import React, { useRef, useEffect, useState } from 'react'
import type { Trace } from '../types/trace'
import { color } from '../design/tokens'
import { pidColor, IDLE_PATTERN, CS_PATTERN } from '../design/pidColor'
import { totalTime } from '../lib/deriveState'

interface Props {
  trace: Trace
  t: number
}

// Layout constants
const ROW_HEIGHT = 44
const AXIS_HEIGHT = 28
const PADDING_TOP = 6
const SVG_HEIGHT = ROW_HEIGHT + AXIS_HEIGHT + PADDING_TOP
const MIN_PPT = 28

export default function Gantt({ trace, t }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(800)

  // Measure container width with ResizeObserver
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w && w > 0) setContainerWidth(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const total = trace.timeline.length > 0 ? totalTime(trace) : 1
  const ppt = Math.max(MIN_PPT, Math.floor(containerWidth / total))
  const svgWidth = ppt * total

  // Segment opacity: fully visible if t_end <= t or t_start <= t < t_end; dimmed if future
  function segOpacity(seg: Trace['timeline'][number]): number {
    if (seg.t_end <= t) return 1.0
    if (seg.t_start <= t) return 1.0
    return 0.2
  }

  // Collect all tick boundaries for the axis
  const boundaries = new Set<number>()
  boundaries.add(0)
  boundaries.add(total)
  for (const seg of trace.timeline) {
    boundaries.add(seg.t_start)
    boundaries.add(seg.t_end)
  }
  // If ppt >= 28, also add every integer
  if (ppt >= MIN_PPT) {
    for (let tick = 0; tick <= total; tick++) boundaries.add(tick)
  }
  const sortedBoundaries = Array.from(boundaries).sort((a, b) => a - b)

  // Build axis labels, skipping any within 18px of the last placed label
  const axisLabels: { x: number; label: string }[] = []
  let lastLabelX = -Infinity
  for (const tick of sortedBoundaries) {
    const x = tick * ppt
    if (x - lastLabelX >= 18) {
      axisLabels.push({ x, label: String(tick) })
      lastLabelX = x
    }
  }

  const axisY = PADDING_TOP + ROW_HEIGHT

  return (
    <div
      ref={containerRef}
      style={{
        overflowX: 'auto',
        overflowY: 'hidden',
        position: 'relative',
        width: '100%',
        // Reserve vertical space so the outer panel doesn't collapse
        minHeight: SVG_HEIGHT + 4,
      }}
    >
      <svg
        width={svgWidth}
        height={SVG_HEIGHT}
        style={{ display: 'block', userSelect: 'none' }}
      >
        <defs>
          {/* Idle pattern: diagonal lines in color.muted at 0.4 opacity on color.raised */}
          <pattern id={IDLE_PATTERN} x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill={color.raised} />
            <line x1="0" y1="8" x2="8" y2="0" stroke={color.muted} strokeWidth="1.5" strokeOpacity="0.4" />
          </pattern>
          {/* CS pattern: diagonal lines in color.warn on darker warn background */}
          <pattern id={CS_PATTERN} x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="#7c5300" />
            <line x1="0" y1="8" x2="8" y2="0" stroke={color.warn} strokeWidth="1.5" />
          </pattern>
        </defs>

        {/* Render timeline segments */}
        {trace.timeline.map((seg, idx) => {
          const x = seg.t_start * ppt
          const w = (seg.t_end - seg.t_start) * ppt
          const opacity = segOpacity(seg)

          let fill: string
          let labelText: string | null = null

          if (seg.type === 'run' && seg.pid !== null) {
            fill = pidColor(seg.pid)
            if (w >= 24) labelText = `P${seg.pid}`
          } else if (seg.type === 'idle') {
            fill = `url(#${IDLE_PATTERN})`
            if (w >= 40) labelText = 'idle'
          } else {
            // context_switch
            fill = `url(#${CS_PATTERN})`
            if (w >= 24) labelText = 'CS'
          }

          return (
            <g key={idx} opacity={opacity}>
              <rect
                x={x}
                y={PADDING_TOP}
                width={w}
                height={ROW_HEIGHT}
                fill={fill}
                rx={4}
              />
              {labelText && (
                <text
                  x={x + w / 2}
                  y={PADDING_TOP + ROW_HEIGHT / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="white"
                  fontSize="11"
                  fontWeight="600"
                  fontFamily='"JetBrains Mono", Consolas, monospace'
                  style={{ pointerEvents: 'none' }}
                >
                  {labelText}
                </text>
              )}
            </g>
          )
        })}

        {/* Time axis line */}
        <line
          x1={0}
          y1={axisY}
          x2={svgWidth}
          y2={axisY}
          stroke={color.border}
          strokeWidth="1"
        />

        {/* Axis tick marks and labels */}
        {axisLabels.map(({ x, label }) => (
          <g key={label}>
            <line
              x1={x}
              y1={axisY}
              x2={x}
              y2={axisY + 4}
              stroke={color.muted}
              strokeWidth="1"
            />
            <text
              x={x}
              y={axisY + 14}
              textAnchor="middle"
              fill={color.muted}
              fontSize="9"
              fontFamily='"JetBrains Mono", Consolas, monospace'
            >
              {label}
            </text>
          </g>
        ))}

        {/* Playhead: downward triangle and vertical line */}
        {(() => {
          const px = t * ppt
          // Triangle pointing down, above the timeline
          const triSize = 6
          const triY = PADDING_TOP - 2
          const triPoints = `${px},${triY + triSize} ${px - triSize / 2},${triY} ${px + triSize / 2},${triY}`
          return (
            <g>
              <polygon
                points={triPoints}
                fill={color.accent}
              />
              <line
                x1={px}
                y1={PADDING_TOP}
                x2={px}
                y2={axisY}
                stroke={color.accent}
                strokeWidth="2"
              />
            </g>
          )
        })()}
      </svg>
    </div>
  )
}
