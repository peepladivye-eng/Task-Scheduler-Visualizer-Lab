import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare } from 'lucide-react'
import { useStudio, useDerived } from '../store/useStudio'
import { spring } from '../design/motion'
import type { Trace, TraceEvent } from '../types/trace'

const PID_COLORS = [
  '#6ea8fe', '#3ddc97', '#ffb454', '#ff6b9d', '#b794f6',
  '#4fd1c5', '#f6e05e', '#fc8181', '#90cdf4', '#a3e635',
]

function getPidColor(pid: number): string {
  return PID_COLORS[(pid - 1) % 10]
}

function PidChip({ pid }: { pid: number }) {
  const color = getPidColor(pid)
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded font-mono font-bold text-xs mx-0.5"
      style={{
        backgroundColor: `${color}22`,
        border: `1px solid ${color}88`,
        color: color,
      }}
    >
      P{pid}
    </span>
  )
}

function generateNarration(trace: Trace, t: number, prevT: number): string | null {
  if (t === 0) {
    const arrivals = trace.processes.filter((p) => p.arrival === 0)
    if (arrivals.length > 0) {
      return `Simulation starts. ${arrivals.map((p) => `P${p.pid}`).join(', ')} ${arrivals.length === 1 ? 'arrives' : 'arrive'} at the ready queue.`
    }
    return 'Simulation starts. No processes have arrived yet.'
  }

  // Find events that occurred at this exact tick
  const eventsAtT = trace.events.filter((ev) => ev.t === t)
  
  if (eventsAtT.length === 0) {
    // No events, check what's happening
    const seg = trace.timeline.find((s) => s.t_start <= t && t < s.t_end)
    if (seg?.type === 'run' && seg.pid) {
      const proc = trace.processes.find(p => p.pid === seg.pid)
      const elapsed = Math.min(t - seg.t_start, seg.t_end - seg.t_start)
      const remaining = (proc?.burst ?? 0) - elapsed
      return `P${seg.pid} continues executing (${remaining} ms remaining).`
    } else if (seg?.type === 'context_switch' && seg.pid) {
      return `Context switch in progress, preparing to run P${seg.pid}...`
    } else if (seg?.type === 'idle') {
      return 'CPU is idle. No processes in the ready queue.'
    }
    return null
  }

  // Narrate events in order
  const parts: string[] = []
  
  for (const ev of eventsAtT) {
    switch (ev.type) {
      case 'arrive': {
        parts.push(`P${ev.pid} arrives at the ready queue.`)
        break
      }
      case 'dispatch': {
        const proc = trace.processes.find((p) => p.pid === ev.pid)
        const reason = getDispatchReason(trace, ev, proc)
        parts.push(`P${ev.pid} is dispatched to the CPU. ${reason}`)
        break
      }
      case 'preempt': {
        parts.push(`P${ev.pid} is preempted and moved back to the ready queue.`)
        break
      }
      case 'complete': {
        const proc = trace.processes.find((p) => p.pid === ev.pid)
        const turnaround = proc ? proc.turnaround : 0
        parts.push(`P${ev.pid} completes execution (turnaround: ${turnaround} ms).`)
        break
      }
    }
  }

  return parts.join(' ')
}

function getDispatchReason(trace: Trace, ev: TraceEvent, proc: any): string {
  const algo = trace.algo
  
  switch (algo) {
    case 'fcfs':
      return 'Selected by FCFS (first in queue).'
    case 'sjf':
      return `Selected by SJF (shortest burst: ${proc?.burst ?? '?'} ms).`
    case 'srtf':
      return 'Selected by SRTF (shortest remaining time).'
    case 'priority':
      return `Selected by Priority (priority ${proc?.priority ?? '?'}).`
    case 'priority-p':
      return `Selected by Preemptive Priority (priority ${proc?.priority ?? '?'}).`
    case 'rr':
      return `Selected by Round Robin (quantum: ${trace.quantum ?? 0} ms).`
    default:
      return 'Selected by the scheduler.'
  }
}

export default function Narrator() {
  const trace = useStudio((s) => s.trace)
  const t = useStudio((s) => s.t)
  const [prevT, setPrevT] = React.useState(0)
  const [narration, setNarration] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!trace) {
      setNarration(null)
      return
    }

    const text = generateNarration(trace, t, prevT)
    setNarration(text)
    setPrevT(t)
  }, [trace, t])

  if (!trace) {
    return (
      <div className="sheet space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-accent" />
          <h3 className="font-display font-semibold text-ink text-lg">Narrator</h3>
        </div>
        <div className="text-muted text-sm italic">
          Run a simulation to see step-by-step explanations.
        </div>
      </div>
    )
  }

  return (
    <div className="sheet space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-accent" />
        <h3 className="font-display font-semibold text-ink text-lg">Narrator</h3>
        <div className="flex-1" />
        <div className="font-mono text-xs text-muted tabular-nums">
          t = {t}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`narration-${t}`}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={spring.soft}
          className="min-h-[3rem] flex items-center"
        >
          {narration ? (
            <p className="text-sm text-ink leading-relaxed">
              {narration}
            </p>
          ) : (
            <p className="text-sm text-muted italic">
              No events at this tick.
            </p>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Algorithm hint */}
      <div className="pt-2 border-t border-line">
        <div className="text-xs text-muted">
          <span className="font-semibold text-ink">Algorithm:</span>{' '}
          {trace.algo.toUpperCase()}
          {trace.algo === 'rr' && ` (quantum ${trace.quantum})`}
          {trace.context_switch_cost > 0 && ` • CS cost: ${trace.context_switch_cost} ms`}
        </div>
      </div>
    </div>
  )
}
