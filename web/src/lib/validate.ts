import type { Algo, ProcInput } from '../types/trace'

export interface InputProblem {
  field: 'processes' | 'quantum' | 'contextSwitch'
  pid?: number
  message: string
}

/**
 * Validates simulation inputs against contract limits.
 * Returns an array of problems; empty array = valid.
 */
export function validateInputs(
  processes: ProcInput[],
  algo: Algo | 'compare',
  quantum: number,
  contextSwitch: number
): InputProblem[] {
  const problems: InputProblem[] = []

  // Empty process list
  if (processes.length === 0) {
    problems.push({ field: 'processes', message: 'At least one process is required' })
    return problems
  }

  // Too many processes
  if (processes.length > 64) {
    problems.push({ field: 'processes', message: 'Maximum 64 processes allowed' })
  }

  // Check for duplicate PIDs
  const seen = new Set<number>()
  for (const p of processes) {
    if (seen.has(p.pid)) {
      problems.push({
        field: 'processes',
        pid: p.pid,
        message: `Duplicate PID ${p.pid}`,
      })
    }
    seen.add(p.pid)
  }

  // Validate each process
  for (const p of processes) {
    // PID must be >= 1
    if (p.pid < 1) {
      problems.push({
        field: 'processes',
        pid: p.pid,
        message: `PID must be >= 1 (got ${p.pid})`,
      })
    }

    // Arrival: 0..10000
    if (p.arrival < 0 || p.arrival > 10000) {
      problems.push({
        field: 'processes',
        pid: p.pid,
        message: `Arrival must be 0..10000 (P${p.pid}: ${p.arrival})`,
      })
    }

    // Burst: 1..10000
    if (p.burst < 1 || p.burst > 10000) {
      problems.push({
        field: 'processes',
        pid: p.pid,
        message: `Burst must be 1..10000 (P${p.pid}: ${p.burst})`,
      })
    }

    // Priority: 0..1000
    if (p.priority < 0 || p.priority > 1000) {
      problems.push({
        field: 'processes',
        pid: p.pid,
        message: `Priority must be 0..1000 (P${p.pid}: ${p.priority})`,
      })
    }
  }

  // Quantum validation (must be >= 1 for rr or compare)
  if ((algo === 'rr' || algo === 'compare') && quantum < 1) {
    problems.push({
      field: 'quantum',
      message: `Quantum must be >= 1 for ${algo === 'rr' ? 'Round Robin' : 'compare mode'}`,
    })
  }

  // Context switch cost: 0..100
  if (contextSwitch < 0 || contextSwitch > 100) {
    problems.push({
      field: 'contextSwitch',
      message: `Context switch cost must be 0..100 (got ${contextSwitch})`,
    })
  }

  return problems
}
