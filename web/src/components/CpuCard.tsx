import React from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useFocus, focusProps, dimClass } from '../store/useFocus'
import { useStudio, useDerived } from '../store/useStudio'
import { totalTime } from '../lib/deriveState'
import { spring } from '../design/motion'

const PID_COLORS = [
  '#6ea8fe', '#3ddc97', '#ffb454', '#ff6b9d', '#b794f6',
  '#4fd1c5', '#f6e05e', '#fc8181', '#90cdf4', '#a3e635',
]

function getPidColor(pid: number): string {
  return PID_COLORS[(pid - 1) % 10]
}

export default function CpuCard() {
  const trace = useStudio((s) => s.trace)
  const t = useStudio((s) => s.t)
  const state = useDerived()
  const reducedMotion = useReducedMotion()
  const focusPid = useFocus((s) => s.pid)

  if (!state || !trace) {
    return (
      <div className="sheet space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-good" />
          <h3 className="font-display font-semibold text-ink text-lg">CPU</h3>
        </div>
        <div className="text-muted text-sm">—</div>
      </div>
    )
  }

  const total = totalTime(trace)
  const fadeDuration = reducedMotion ? 0 : 0.16

  // Determine current content and key for AnimatePresence
  let contentKey: string
  let content: React.ReactNode

  if (state.csActive && state.csPid !== null) {
    const pid = state.csPid
    const color = getPidColor(pid)
    contentKey = `cs-${pid}`
    content = (
      <motion.div
        key={contentKey}
        layoutId={`process-chip-${pid}`}
        className="border rounded-lg p-3 space-y-2"
        style={{
          borderColor: '#ffb45488',
          backgroundColor: '#ffb45411',
        }}
      >
        <div className="text-xs font-semibold uppercase tracking-wider text-warn">
          Context Switch
        </div>
        <div className="font-mono font-bold text-lg text-warn">
          → P{pid}
        </div>
      </motion.div>
    )
  } else if (state.running !== null) {
    const pid = state.running.pid
    const color = getPidColor(pid)
    const proc = trace.processes.find((p) => p.pid === pid)
    const burst = proc?.burst ?? 1
    const rem = state.remaining[pid] ?? 0
    const progressPct = Math.max(0, Math.min(100, ((burst - rem) / burst) * 100))
    
    contentKey = `run-${pid}`
    content = (
      <motion.div
        key={contentKey}
        layoutId={`process-chip-${pid}`}
        className={`border rounded-lg p-3 space-y-2 ${dimClass(focusPid, pid)}`}
        style={{
          borderColor: `${color}88`,
          backgroundColor: `${color}22`,
        }}
        {...focusProps(pid)}
      >
        <div className="font-mono font-bold text-2xl" style={{ color }}>
          P{pid}
        </div>
        <div className="text-xs font-semibold uppercase tracking-wider" style={{ color }}>
          Running
        </div>
        <div className="font-mono text-sm text-muted">
          {rem} / {burst} ms remaining
        </div>
        {/* Progress bar */}
        <div className="bg-chip rounded h-1.5 overflow-hidden">
          <motion.div
            className="h-full rounded"
            style={{ backgroundColor: color }}
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.3, ease: 'easeOut' }}
          />
        </div>
      </motion.div>
    )
  } else if (t >= total) {
    contentKey = 'done'
    content = (
      <div className="text-good font-semibold text-sm">
        All done ✓
      </div>
    )
  } else {
    contentKey = 'idle'
    content = (
      <div className="text-muted text-sm">
        CPU idle
      </div>
    )
  }

  return (
    <div className="sheet space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-good" />
        <h3 className="font-display font-semibold text-ink text-lg">CPU</h3>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={contentKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: fadeDuration }}
        >
          {content}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
