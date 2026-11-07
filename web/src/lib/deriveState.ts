import type { Trace } from '../types/trace'

export type ProcStatus = 'new' | 'ready' | 'running' | 'done'

export interface DerivedState {
  t: number
  total: number
  /** The process currently using the CPU (type 'run'), or null (idle/cs/done). */
  running: { pid: number; segType: 'run' } | null
  /** True when the current segment is a context_switch. */
  csActive: boolean
  /** The pid being switched IN during a context_switch segment, or null. */
  csPid: number | null
  /** ready_queue from the last event with event.t <= t, or [] if none. */
  readyQueue: number[]
  /** Process status at time t. */
  status: Record<number, ProcStatus>
  /** Remaining burst ticks at time t (never negative). */
  remaining: Record<number, number>
}

/** Return the last timeline segment's t_end, or 0 if the timeline is empty. */
export function totalTime(trace: Trace): number {
  if (trace.timeline.length === 0) return 0
  return trace.timeline[trace.timeline.length - 1].t_end
}

/** Derive the full UI state at tick t for a given trace. */
export function deriveState(trace: Trace, t: number): DerivedState {
  const total = totalTime(trace)
  // Clamp t to [0, total]
  const tc = Math.max(0, Math.min(total, t))

  // --- Find segment at tc ---
  let running: DerivedState['running'] = null
  let csActive = false
  let csPid: number | null = null

  for (const seg of trace.timeline) {
    if (seg.t_start <= tc && tc < seg.t_end) {
      if (seg.type === 'run' && seg.pid !== null) {
        running = { pid: seg.pid, segType: 'run' }
      } else if (seg.type === 'context_switch' && seg.pid !== null) {
        csActive = true
        csPid = seg.pid
      }
      // idle: running stays null
      break
    }
  }

  // --- Ready queue: last event with event.t <= tc ---
  let readyQueue: number[] = []
  for (const ev of trace.events) {
    if (ev.t <= tc) {
      readyQueue = ev.ready_queue
    } else {
      break // events are in non-decreasing t order
    }
  }

  // --- Remaining burst for each process at tc ---
  // remaining[pid] = burst - sum of run ticks in [0, tc)
  const remaining: Record<number, number> = {}
  for (const p of trace.processes) {
    remaining[p.pid] = p.burst
  }
  for (const seg of trace.timeline) {
    if (seg.type !== 'run' || seg.pid === null) continue
    // overlap of this run segment with [0, tc)
    const overlapStart = seg.t_start
    const overlapEnd = Math.min(seg.t_end, tc)
    if (overlapEnd > overlapStart) {
      remaining[seg.pid] -= overlapEnd - overlapStart
    }
  }
  // Clamp to zero (never negative)
  for (const pid of Object.keys(remaining)) {
    if (remaining[Number(pid)] < 0) remaining[Number(pid)] = 0
  }

  // --- Status for each process ---
  const status: Record<number, ProcStatus> = {}
  for (const p of trace.processes) {
    if (tc >= p.completion) {
      status[p.pid] = 'done'
    } else if (running !== null && running.pid === p.pid) {
      status[p.pid] = 'running'
    } else if (tc >= p.arrival) {
      status[p.pid] = 'ready'
    } else {
      status[p.pid] = 'new'
    }
  }

  return { t: tc, total, running, csActive, csPid, readyQueue, status, remaining }
}
