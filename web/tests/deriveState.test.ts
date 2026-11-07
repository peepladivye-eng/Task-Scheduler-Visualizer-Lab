import { describe, it, expect } from 'vitest'
import { deriveState, totalTime } from '../src/lib/deriveState'
import type { Trace } from '../src/types/trace'

// ── FCFS textbook fixture (hand-computed) ───────────────────────────────
// Processes: P1 burst=24 arr=0, P2 burst=3 arr=0, P3 burst=3 arr=0
// Timeline: P1 0-24, P2 24-27, P3 27-30
const fcfsTrace: Trace = {
  version: '1.0',
  algo: 'fcfs',
  quantum: null,
  context_switch_cost: 0,
  processes: [
    { pid: 1, arrival: 0, burst: 24, priority: 3, start: 0,  completion: 24, waiting: 0,  turnaround: 24, response: 0  },
    { pid: 2, arrival: 0, burst: 3,  priority: 1, start: 24, completion: 27, waiting: 24, turnaround: 27, response: 24 },
    { pid: 3, arrival: 0, burst: 3,  priority: 2, start: 27, completion: 30, waiting: 27, turnaround: 30, response: 27 },
  ],
  timeline: [
    { t_start: 0,  t_end: 24, pid: 1, type: 'run' },
    { t_start: 24, t_end: 27, pid: 2, type: 'run' },
    { t_start: 27, t_end: 30, pid: 3, type: 'run' },
  ],
  events: [
    { t: 0,  type: 'arrive',   pid: 1, ready_queue: [1] },
    { t: 0,  type: 'arrive',   pid: 2, ready_queue: [1, 2] },
    { t: 0,  type: 'arrive',   pid: 3, ready_queue: [1, 2, 3] },
    { t: 0,  type: 'dispatch', pid: 1, ready_queue: [2, 3] },
    { t: 24, type: 'complete', pid: 1, ready_queue: [2, 3] },
    { t: 24, type: 'dispatch', pid: 2, ready_queue: [3] },
    { t: 27, type: 'complete', pid: 2, ready_queue: [3] },
    { t: 27, type: 'dispatch', pid: 3, ready_queue: [] },
    { t: 30, type: 'complete', pid: 3, ready_queue: [] },
  ],
  metrics: {
    avg_waiting: 17, avg_turnaround: 27, avg_response: 17,
    cpu_utilization: 100, throughput: 0.1, context_switches: 2,
  },
}

// ── Priority-P fixture (hand-computed) ──────────────────────────────────
// P1 arr=0 burst=6 pri=3, P2 arr=1 burst=4 pri=1, P3 arr=2 burst=2 pri=2
// Timeline: P1 0-1, P2 1-5, P3 5-7, P1 7-12
const priorityPTrace: Trace = {
  version: '1.0',
  algo: 'priority-p',
  quantum: null,
  context_switch_cost: 0,
  processes: [
    { pid: 1, arrival: 0, burst: 6, priority: 3, start: 0, completion: 12, waiting: 6,  turnaround: 12, response: 0 },
    { pid: 2, arrival: 1, burst: 4, priority: 1, start: 1, completion: 5,  waiting: 0,  turnaround: 4,  response: 0 },
    { pid: 3, arrival: 2, burst: 2, priority: 2, start: 5, completion: 7,  waiting: 3,  turnaround: 5,  response: 3 },
  ],
  timeline: [
    { t_start: 0, t_end: 1,  pid: 1, type: 'run' },
    { t_start: 1, t_end: 5,  pid: 2, type: 'run' },
    { t_start: 5, t_end: 7,  pid: 3, type: 'run' },
    { t_start: 7, t_end: 12, pid: 1, type: 'run' },
  ],
  events: [
    { t: 0,  type: 'arrive',   pid: 1, ready_queue: [1] },
    { t: 0,  type: 'dispatch', pid: 1, ready_queue: [] },
    { t: 1,  type: 'arrive',   pid: 2, ready_queue: [2] },
    { t: 1,  type: 'preempt',  pid: 1, ready_queue: [2, 1] },
    { t: 1,  type: 'dispatch', pid: 2, ready_queue: [1] },
    { t: 2,  type: 'arrive',   pid: 3, ready_queue: [1, 3] },
    { t: 5,  type: 'complete', pid: 2, ready_queue: [1, 3] },
    { t: 5,  type: 'dispatch', pid: 3, ready_queue: [1] },
    { t: 7,  type: 'complete', pid: 3, ready_queue: [1] },
    { t: 7,  type: 'dispatch', pid: 1, ready_queue: [] },
    { t: 12, type: 'complete', pid: 1, ready_queue: [] },
  ],
  metrics: {
    avg_waiting: 3, avg_turnaround: 7, avg_response: 1,
    cpu_utilization: 100, throughput: 0.25, context_switches: 3,
  },
}

describe('totalTime', () => {
  it('returns last t_end of the timeline', () => {
    expect(totalTime(fcfsTrace)).toBe(30)
    expect(totalTime(priorityPTrace)).toBe(12)
  })

  it('returns 0 for an empty timeline', () => {
    const empty: Trace = { ...fcfsTrace, timeline: [], events: [] }
    expect(totalTime(empty)).toBe(0)
  })
})

describe('deriveState — FCFS textbook', () => {
  it('a) totalTime consistent with metrics', () => {
    // total_time = last completion = 30
    expect(totalTime(fcfsTrace)).toBe(30)
  })

  it('b) at t=0: P1 is running, others are ready (all arrive at 0)', () => {
    const s = deriveState(fcfsTrace, 0)
    expect(s.running?.pid).toBe(1)
    expect(s.status[1]).toBe('running')
    expect(s.status[2]).toBe('ready')
    expect(s.status[3]).toBe('ready')
  })

  it('b2) at t=0: a process arriving later would be new (test with priority_p)', () => {
    // In priority_p, P2 arrives at t=1 and P3 at t=2; at t=0 they are new
    const s = deriveState(priorityPTrace, 0)
    expect(s.status[2]).toBe('new')
    expect(s.status[3]).toBe('new')
  })

  it('c) at t=total: nothing running, all done, all remaining=0', () => {
    const total = totalTime(fcfsTrace)
    const s = deriveState(fcfsTrace, total)
    expect(s.running).toBeNull()
    for (const p of fcfsTrace.processes) {
      expect(s.status[p.pid]).toBe('done')
      expect(s.remaining[p.pid]).toBe(0)
    }
  })

  it('d) remaining never increases as t increases', () => {
    const total = totalTime(fcfsTrace)
    const prevRemaining: Record<number, number> = {}
    for (const p of fcfsTrace.processes) prevRemaining[p.pid] = p.burst
    for (let t = 0; t <= total; t++) {
      const s = deriveState(fcfsTrace, t)
      for (const p of fcfsTrace.processes) {
        expect(s.remaining[p.pid]).toBeLessThanOrEqual(prevRemaining[p.pid])
        prevRemaining[p.pid] = s.remaining[p.pid]
      }
    }
  })

  it('e) sum of ticks where running!==null equals sum of run segment lengths', () => {
    const total = totalTime(fcfsTrace)
    let runningTicks = 0
    for (let t = 0; t < total; t++) {
      const s = deriveState(fcfsTrace, t)
      if (s.running !== null) runningTicks++
    }
    const runSegLen = fcfsTrace.timeline
      .filter(s => s.type === 'run')
      .reduce((sum, s) => sum + (s.t_end - s.t_start), 0)
    expect(runningTicks).toBe(runSegLen)
  })
})

describe('deriveState — priority-p trace', () => {
  it('c) at t=total: all done, all remaining=0', () => {
    const total = totalTime(priorityPTrace)
    const s = deriveState(priorityPTrace, total)
    expect(s.running).toBeNull()
    for (const p of priorityPTrace.processes) {
      expect(s.status[p.pid]).toBe('done')
      expect(s.remaining[p.pid]).toBe(0)
    }
  })

  it('remaining decreases only during run ticks for that pid', () => {
    // P1 runs t=0-1 and t=7-12. At t=1, remaining[1] should be 5.
    expect(deriveState(priorityPTrace, 1).remaining[1]).toBe(5)
    // P2 runs t=1-5. At t=5, remaining[2] should be 0.
    expect(deriveState(priorityPTrace, 5).remaining[2]).toBe(0)
  })
})
