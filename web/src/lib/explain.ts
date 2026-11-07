/**
 * Explanation engine: analyzes trace events to explain scheduling decisions.
 * This is a CROSS-CHECK, not a second scheduler. It reads the engine's output
 * and explains WHY each decision was made, with the actual numbers compared.
 */

import type { Trace, TraceEvent, Algo } from '../types/trace'

/** Rule text for each algorithm (exact wording from the plan) */
export const RULE_TEXT: Record<Algo, string> = {
  fcfs: 'First come, first served: the process that arrived earliest goes first.',
  sjf: 'Shortest Job First: the smallest total burst goes first.',
  srtf: 'Shortest Remaining Time First: the smallest remaining time goes first, and a shorter newcomer can preempt.',
  priority: 'Priority (non-preemptive): the lowest priority number (highest priority) goes first.',
  'priority-p': 'Priority (preemptive): a higher-priority arrival takes the CPU immediately.',
  rr: 'Round Robin: the front of the queue runs for at most one quantum, then goes to the back.',
}

/** Key name for each algorithm's selection criterion */
export type KeyName = 'arrival' | 'burst' | 'remaining' | 'priority' | 'queue position'

function keyForAlgo(algo: Algo): KeyName {
  switch (algo) {
    case 'fcfs': return 'arrival'
    case 'sjf': return 'burst'
    case 'srtf': return 'remaining'
    case 'priority':
    case 'priority-p': return 'priority'
    case 'rr': return 'queue position'
  }
}

/** Candidate in the decision */
export interface Candidate {
  pid: number
  keyValue: number
}

/** Explanation of a dispatch decision */
export interface DispatchExplanation {
  t: number
  algo: Algo
  chosen: number
  ruleText: string
  keyName: KeyName
  candidates: Candidate[]
  tieBreak: boolean
  consistent: boolean
}

/**
 * Derives remaining time for each process at time t.
 * Scans timeline segments to count run ticks for each process up to time t.
 */
function getRemainingAt(trace: Trace, t: number): Record<number, number> {
  const remaining: Record<number, number> = {}
  
  // Initialize with burst times
  for (const proc of trace.processes) {
    remaining[proc.pid] = proc.burst
  }
  
  // Subtract run ticks up to time t
  for (const seg of trace.timeline) {
    if (seg.type === 'run' && seg.pid !== null && seg.t_start < t) {
      const end = Math.min(seg.t_end, t)
      const ticks = end - seg.t_start
      remaining[seg.pid] = Math.max(0, remaining[seg.pid] - ticks)
    }
  }
  
  return remaining
}

/**
 * Explains a dispatch event: why was this PID chosen from the ready queue?
 */
export function explainDispatch(trace: Trace, eventIndex: number): DispatchExplanation {
  const event = trace.events[eventIndex]
  if (event.type !== 'dispatch') {
    throw new Error(`Event ${eventIndex} is not a dispatch`)
  }
  
  const algo = trace.algo
  const keyName = keyForAlgo(algo)
  const ruleText = RULE_TEXT[algo]
  const chosen = event.pid
  
  // Candidates = ready_queue (snapshot AFTER dispatch) + chosen pid
  // The ready_queue in the event is AFTER the dispatched process was removed
  // So to get the original candidate list, we add chosen back
  const candidatePids = [...event.ready_queue, chosen]
  
  // Get key values for each candidate
  const candidates: Candidate[] = []
  const remaining = (algo === 'srtf') ? getRemainingAt(trace, event.t) : {}
  
  for (const pid of candidatePids) {
    const proc = trace.processes.find(p => p.pid === pid)
    if (!proc) continue
    
    let keyValue: number
    switch (algo) {
      case 'fcfs':
        keyValue = proc.arrival
        break
      case 'sjf':
        keyValue = proc.burst
        break
      case 'srtf':
        keyValue = remaining[pid] ?? proc.burst
        break
      case 'priority':
      case 'priority-p':
        keyValue = proc.priority
        break
      case 'rr':
        // For RR, the chosen was at queue front before dispatch
        // Position in the reconstructed list doesn't matter; RR always picks front
        keyValue = (pid === chosen) ? 0 : 1
        break
    }
    candidates.push({ pid, keyValue })
  }
  
  // Check consistency: is chosen the best candidate?
  let consistent = false
  const chosenCand = candidates.find(c => c.pid === chosen)
  
  if (!chosenCand) {
    consistent = false
  } else if (algo === 'rr') {
    // For RR, chosen is always consistent (it was at front)
    consistent = true
  } else {
    // Find candidates with the best key (lowest)
    const bestKey = Math.min(...candidates.map(c => c.keyValue))
    const bestCands = candidates.filter(c => c.keyValue === bestKey)
    
    if (bestCands.some(c => c.pid === chosen)) {
      // Chosen is among the best
      if (bestCands.length === 1) {
        consistent = true
      } else {
        // Tie: check arrival time
        const tiedWithArrival = bestCands.map(c => {
          const p = trace.processes.find(proc => proc.pid === c.pid)!
          return { pid: c.pid, arrival: p.arrival }
        })
        const earliestArrival = Math.min(...tiedWithArrival.map(a => a.arrival))
        const earliestCands = tiedWithArrival.filter(a => a.arrival === earliestArrival)
        
        if (earliestCands.some(c => c.pid === chosen)) {
          if (earliestCands.length === 1) {
            consistent = true
          } else {
            // Tie on arrival: lowest PID wins
            const lowestPid = Math.min(...earliestCands.map(c => c.pid))
            consistent = (lowestPid === chosen)
          }
        }
      }
    }
  }
  
  // Check for tie-break
  const tieBreak = chosenCand
    ? candidates.filter(c => c.keyValue === chosenCand.keyValue).length > 1
    : false
  
  return {
    t: event.t,
    algo,
    chosen,
    ruleText,
    keyName,
    candidates,
    tieBreak,
    consistent,
  }
}

/**
 * Explains an event in natural language (for the Narrator).
 */
export function explainEvent(trace: Trace, eventIndex: number): string {
  const event = trace.events[eventIndex]
  const proc = trace.processes.find(p => p.pid === event.pid)
  if (!proc) return `Event ${eventIndex}: unknown process`
  
  switch (event.type) {
    case 'arrive':
      return `P${event.pid} arrives (burst ${proc.burst} ms) and waits in the ready queue.`
    
    case 'dispatch': {
      const exp = explainDispatch(trace, eventIndex)
      const candList = exp.candidates
        .map(c => c.pid === exp.chosen
          ? `P${c.pid} (${exp.keyName} ${c.keyValue}) ✔`
          : `P${c.pid} (${exp.keyName} ${c.keyValue})`)
        .join(' · ')
      return `${exp.ruleText} Candidates: ${candList}`
    }
    
    case 'preempt': {
      const algo = trace.algo
      if (algo === 'srtf') {
        // Find the next dispatch to see who preempts
        const nextDispatch = trace.events.slice(eventIndex + 1).find(e => e.type === 'dispatch')
        if (nextDispatch) {
          const remaining = getRemainingAt(trace, event.t)
          const preempted = event.pid
          const preempter = nextDispatch.pid
          return `P${preempted} is preempted: P${preempter} needs only ${remaining[preempter]} ms, less than P${preempted}'s ${remaining[preempted]} ms left.`
        }
      } else if (algo === 'priority-p') {
        const nextDispatch = trace.events.slice(eventIndex + 1).find(e => e.type === 'dispatch')
        if (nextDispatch) {
          const preempted = trace.processes.find(p => p.pid === event.pid)!
          const preempter = trace.processes.find(p => p.pid === nextDispatch.pid)!
          return `P${event.pid} is preempted by higher-priority P${nextDispatch.pid} (priority ${preempter.priority} < ${preempted.priority}).`
        }
      } else if (algo === 'rr') {
        const q = trace.quantum ?? 4
        return `Quantum of ${q} ms is up, P${event.pid} goes to the back of the queue.`
      }
      return `P${event.pid} is preempted.`
    }
    
    case 'complete': {
      const tat = proc.completion - proc.arrival
      const wait = tat - proc.burst
      return `P${event.pid} finishes at t=${proc.completion}. Turnaround = ${proc.completion} − ${proc.arrival} = ${tat}. Waiting = ${tat} − ${proc.burst} = ${wait}.`
    }
  }
}

/**
 * Explains a timeline segment (for context switches and idle).
 */
export function explainSegment(trace: Trace, segmentIndex: number): string | null {
  const seg = trace.timeline[segmentIndex]
  
  if (seg.type === 'idle') {
    return 'No process is ready, so the CPU idles.'
  }
  
  if (seg.type === 'context_switch' && seg.pid !== null) {
    const cost = trace.context_switch_cost
    return `Switching to P${seg.pid} costs ${cost} ms. No process runs.`
  }
  
  return null
}
