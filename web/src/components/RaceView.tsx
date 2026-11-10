import React from 'react'
import { motion } from 'framer-motion'
import { Zap } from 'lucide-react'
import { useStudio } from '../store/useStudio'
import { totalTime } from '../lib/deriveState'
import { ALGO_ORDER, ALGO_LABEL } from '../types/trace'
import { fmtMs } from '../lib/format'
import { spring } from '../design/motion'

// One color per algo slot
const ALGO_COLORS = [
  '#6ea8fe', '#3ddc97', '#ffb454', '#ff6b9d', '#b794f6', '#fc8181',
]

const PID_COLORS = [
  '#6ea8fe', '#3ddc97', '#ffb454', '#ff6b9d', '#b794f6',
  '#4fd1c5', '#f6e05e', '#fc8181', '#90cdf4', '#a3e635',
]
const getPidColor = (pid: number) => PID_COLORS[(pid - 1) % 10]

export default function RaceView() {
  const compare = useStudio((s) => s.compare)
  const t = useStudio((s) => s.t)

  if (!compare || compare.runs.length !== 6) {
    return (
      <div className="sheet space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-warn" />
          <h3 className="font-display font-semibold text-ink text-lg">Race Mode</h3>
        </div>
        <p className="text-muted text-sm">
          Switch to <span className="font-semibold text-ink">Compare All</span> mode above to race all 6 algorithms side-by-side.
        </p>
      </div>
    )
  }

  // Max timeline across all runs
  const maxTime = Math.max(...compare.runs.map((r) => totalTime(r)))
  if (maxTime === 0) return null

  return (
    <div className="sheet space-y-5 overflow-hidden">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-warn" />
        <h3 className="font-display font-semibold text-ink text-lg">Race</h3>
        <span className="text-muted text-sm">— all algorithms, same workload</span>
      </div>

      <div className="space-y-3">
        {compare.runs.map((run, algoIdx) => {
          const algoColor = ALGO_COLORS[algoIdx]
          const runTotal = totalTime(run)
          // The "current" position of this run's playhead clamped to its own total
          const tClamped = Math.min(t, runTotal)
          const fraction = runTotal > 0 ? tClamped / runTotal : 0

          return (
            <div key={run.algo} className="space-y-1">
              {/* Label + metric */}
              <div className="flex items-baseline gap-2">
                <span
                  className="font-mono font-bold text-xs w-24 flex-shrink-0"
                  style={{ color: algoColor }}
                >
                  {ALGO_LABEL[run.algo].replace('Round Robin', 'RR')}
                </span>
                <span className="text-xs text-muted">
                  avg wait {fmtMs(run.metrics.avg_waiting)}
                </span>
                <span className="text-xs text-muted ml-auto">
                  {runTotal} ms
                </span>
              </div>

              {/* Gantt strip */}
              <div
                className="relative h-7 rounded overflow-hidden bg-chip"
                style={{ width: '100%' }}
              >
                {/* Segments */}
                {run.timeline.map((seg, i) => {
                  const x = (seg.t_start / maxTime) * 100
                  const w = ((seg.t_end - seg.t_start) / maxTime) * 100

                  if (seg.type === 'idle') {
                    return (
                      <div
                        key={i}
                        className="absolute inset-y-0 hatch-idle"
                        style={{ left: `${x}%`, width: `${w}%` }}
                      />
                    )
                  }
                  if (seg.type === 'context_switch') {
                    return (
                      <div
                        key={i}
                        className="absolute inset-y-0"
                        style={{ left: `${x}%`, width: `${w}%`, backgroundColor: '#ffb45466' }}
                      />
                    )
                  }
                  if (seg.type === 'run' && seg.pid !== null) {
                    const pidColor = getPidColor(seg.pid)
                    return (
                      <div
                        key={i}
                        className="absolute inset-y-0 flex items-center justify-center"
                        style={{ left: `${x}%`, width: `${w}%`, backgroundColor: `${pidColor}cc` }}
                        title={`P${seg.pid}`}
                      />
                    )
                  }
                  return null
                })}

                {/* Playhead */}
                <motion.div
                  className="absolute inset-y-0 w-0.5 bg-ink/70 z-10"
                  style={{ left: `${fraction * 100}%` }}
                  transition={{ duration: 0.1, ease: 'linear' }}
                />

                {/* Progress tint overlay */}
                <div
                  className="absolute inset-y-0 left-0 bg-accent/10 pointer-events-none"
                  style={{ width: `${fraction * 100}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Ruler */}
      <div className="relative h-4 mt-1">
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
          <div
            key={frac}
            className="absolute top-0 text-xs font-mono text-muted"
            style={{ left: `${frac * 100}%`, transform: frac > 0 ? 'translateX(-50%)' : '' }}
          >
            {Math.round(frac * maxTime)}
          </div>
        ))}
      </div>
    </div>
  )
}
