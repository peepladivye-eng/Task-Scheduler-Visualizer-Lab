import React, { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Terminal } from 'lucide-react'
import { useStudio } from '../store/useStudio'
import { spring } from '../design/motion'

// Generate a human-readable terminal log from the trace events + process data.
// This shows what "actually happened" in a terminal-style log matching the
// execution order: fork, READY, DISPATCH, UNIT_COMPLETED, COMPLETE, waitpid.

function formatTime(t: number): string {
  return t.toString().padStart(4, ' ')
}

type LogLine = {
  key: string
  t: number
  tag: string        // e.g. FORK, READY, DISPATCH, COMPLETE
  color: string
  text: string
}

function buildLog(trace: ReturnType<typeof useStudio extends (f: (s: any) => infer R) => infer R ? never : any> | null, t: number, liveMode: boolean): LogLine[] {
  if (!trace) return []

  const lines: LogLine[] = []

  // Session created
  lines.push({
    key: 'session',
    t: 0,
    tag: 'SESSION',
    color: 'text-muted',
    text: `Simulation started — algo: ${trace.algo.toUpperCase()}${trace.algo === 'rr' ? ` Q=${trace.quantum}` : ''}${trace.context_switch_cost > 0 ? ` CS=${trace.context_switch_cost}ms` : ''}`,
  })

  // Process creation lines
  for (const proc of trace.processes) {
    const osPidPart = liveMode && proc.os_pid != null && proc.os_pid > 0
      ? ` → OS PID ${proc.os_pid}`
      : ''
    lines.push({
      key: `fork-${proc.pid}`,
      t: proc.arrival,
      tag: liveMode ? 'FORK' : 'NEW',
      color: liveMode ? 'text-good' : 'text-accent',
      text: `P${proc.pid} created${osPidPart} | arrival=${proc.arrival} burst=${proc.burst} priority=${proc.priority}`,
    })
  }

  // Events from trace
  for (const ev of trace.events) {
    switch (ev.type) {
      case 'arrive':
        lines.push({
          key: `ev-arrive-${ev.t}-${ev.pid}`,
          t: ev.t,
          tag: 'READY',
          color: 'text-accent',
          text: `P${ev.pid} → ready queue [${ev.ready_queue.map(p => `P${p}`).join(', ')}]`,
        })
        break
      case 'dispatch':
        lines.push({
          key: `ev-dispatch-${ev.t}-${ev.pid}`,
          t: ev.t,
          tag: 'DISPATCH',
          color: 'text-good',
          text: `P${ev.pid} → CPU at t=${ev.t}`,
        })
        break
      case 'preempt':
        lines.push({
          key: `ev-preempt-${ev.t}-${ev.pid}`,
          t: ev.t,
          tag: 'PREEMPT',
          color: 'text-warn',
          text: `P${ev.pid} preempted at t=${ev.t} → back to queue`,
        })
        break
      case 'complete': {
        const proc = trace.processes.find(p => p.pid === ev.pid)
        const waitPidPart = liveMode && proc?.os_pid != null && proc.os_pid > 0
          ? ` | waitpid(${proc.os_pid}) collected`
          : ''
        lines.push({
          key: `ev-complete-${ev.t}-${ev.pid}`,
          t: ev.t,
          tag: 'COMPLETE',
          color: 'text-muted',
          text: `P${ev.pid} finished at t=${ev.t} | wait=${proc?.waiting ?? '?'} tat=${proc?.turnaround ?? '?'}${waitPidPart}`,
        })
        break
      }
    }
  }

  // Sort by t, stable
  lines.sort((a, b) => a.t - b.t || (a.key < b.key ? -1 : 1))
  return lines
}

export default function ExecutionTerminal() {
  const trace = useStudio((s) => s.trace)
  const t     = useStudio((s) => s.t)
  const liveMode = useStudio((s) => s.liveMode)
  const liveLog = useStudio((s) => s.liveLog)
  const scrollRef = useRef<HTMLDivElement>(null)

  const lines = buildLog(trace as any, t, liveMode)
  const visible = lines.filter(l => l.t <= t)

  // Auto-scroll to bottom when new lines appear
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [visible.length, liveLog.length])

  return (
    <div className="sheet space-y-3">
      <div className="flex items-center gap-2">
        <Terminal className="w-4 h-4 text-accent" />
        <h3 className="font-display font-semibold text-ink text-lg">Execution Log</h3>
        {liveMode && (
          <span className="text-xs font-mono text-good bg-good/10 border border-good/30 px-2 py-0.5 rounded">
            live
          </span>
        )}
        <span className="ml-auto font-mono text-xs text-muted">{visible.length} events</span>
      </div>

      <div
        ref={scrollRef}
        className="bg-ink/5 dark:bg-ink/20 rounded-lg font-mono text-xs overflow-y-auto max-h-64 p-3 space-y-1"
        style={{ background: 'rgb(var(--surface, 11 15 23) / 0.5)' }}
      >
        {!trace ? (
          <div className="text-muted italic">Run a simulation to see the execution log.</div>
        ) : visible.length === 0 && liveLog.length === 0 ? (
          <div className="text-muted italic">Waiting for t=0…</div>
        ) : (
          <>
            <AnimatePresence initial={false}>
              {visible.map((line) => (
                <motion.div
                  key={line.key}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={spring.snappy}
                  className="flex items-start gap-2 leading-relaxed"
                >
                  <span className="text-muted tabular-nums flex-shrink-0">
                    t={formatTime(line.t)}
                  </span>
                  <span className={`font-bold flex-shrink-0 w-16 ${line.color}`}>
                    {line.tag}
                  </span>
                  <span className="text-ink/70 break-all">{line.text}</span>
                </motion.div>
              ))}
            </AnimatePresence>
            {liveLog.length > 0 && (
              <>
                <div className="border-t border-ink/10 my-2" />
                <div className="text-xs font-mono text-good mb-1">— Live engine output —</div>
                {liveLog.map((line, i) => (
                  <div key={`live-${i}`} className="text-ink/60 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                    {line}
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
