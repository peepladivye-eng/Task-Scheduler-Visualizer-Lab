// Segment types
export type SegType = 'run' | 'idle' | 'context_switch'
export type EvType = 'arrive' | 'dispatch' | 'preempt' | 'complete'
export type Algo = 'fcfs' | 'sjf' | 'srtf' | 'priority' | 'priority-p' | 'rr'

export const ALGO_ORDER: readonly Algo[] = [
  'fcfs', 'sjf', 'srtf', 'priority', 'priority-p', 'rr',
] as const

export const ALGO_LABEL: Record<Algo, string> = {
  fcfs: 'FCFS',
  sjf: 'SJF',
  srtf: 'SRTF',
  priority: 'Priority',
  'priority-p': 'Priority-P',
  rr: 'Round Robin',
}

// Timeline segment
export interface Segment {
  t_start: number
  t_end: number
  pid: number | null   // null for idle
  type: SegType
}

// Event
export interface TraceEvent {
  t: number
  type: EvType
  pid: number
  ready_queue: number[]
}

// Per-process result fields (as returned in trace.processes)
export interface ProcResult {
  pid: number
  arrival: number
  burst: number
  priority: number
  os_pid: number | null   // actual Linux PID from fork(); null in simulate mode
  start: number
  completion: number
  waiting: number
  turnaround: number
  response: number
}

// Aggregate metrics
export interface Metrics {
  avg_waiting: number
  avg_turnaround: number
  avg_response: number
  cpu_utilization: number
  throughput: number
  context_switches: number
}

// Single-run trace
export interface Trace {
  version: string
  algo: Algo
  quantum: number | null
  context_switch_cost: number
  processes: ProcResult[]
  timeline: Segment[]
  events: TraceEvent[]
  metrics: Metrics
}

// Compare trace (6 runs)
export interface CompareTrace {
  version: string
  compare: true
  runs: Trace[]
}

// Input types
export interface ProcInput {
  pid: number
  arrival: number
  burst: number
  priority: number
}

export interface RunRequest {
  processes: ProcInput[]
  algo: Algo | 'compare'
  quantum?: number
  contextSwitch?: number
  live?: boolean   // true = fork real child workers (Linux only)
}
