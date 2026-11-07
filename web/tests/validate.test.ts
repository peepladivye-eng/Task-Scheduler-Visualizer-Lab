import { describe, it, expect } from 'vitest'
import { validateInputs } from '../src/lib/validate'
import type { ProcInput } from '../src/types/trace'

describe('validateInputs', () => {
  const validProcess: ProcInput = { pid: 1, arrival: 0, burst: 5, priority: 1 }

  it('accepts valid input', () => {
    const procs = [validProcess]
    const problems = validateInputs(procs, 'fcfs', 4, 0)
    expect(problems).toEqual([])
  })

  it('rejects empty process list', () => {
    const problems = validateInputs([], 'fcfs', 4, 0)
    expect(problems).toHaveLength(1)
    expect(problems[0].field).toBe('processes')
    expect(problems[0].message).toContain('At least one')
  })

  it('rejects duplicate pid', () => {
    const procs = [
      { pid: 1, arrival: 0, burst: 5, priority: 1 },
      { pid: 1, arrival: 2, burst: 3, priority: 2 },
    ]
    const problems = validateInputs(procs, 'fcfs', 4, 0)
    const dupProblem = problems.find((p) => p.message.includes('Duplicate'))
    expect(dupProblem).toBeDefined()
    expect(dupProblem?.pid).toBe(1)
  })

  it('rejects burst 0', () => {
    const procs = [{ pid: 1, arrival: 0, burst: 0, priority: 1 }]
    const problems = validateInputs(procs, 'fcfs', 4, 0)
    const burstProblem = problems.find((p) => p.message.includes('Burst'))
    expect(burstProblem).toBeDefined()
    expect(burstProblem?.pid).toBe(1)
  })

  it('rejects arrival > 10000', () => {
    const procs = [{ pid: 1, arrival: 10001, burst: 5, priority: 1 }]
    const problems = validateInputs(procs, 'fcfs', 4, 0)
    const arrivalProblem = problems.find((p) => p.message.includes('Arrival'))
    expect(arrivalProblem).toBeDefined()
    expect(arrivalProblem?.pid).toBe(1)
  })

  it('rejects quantum 0 with algo rr', () => {
    const procs = [validProcess]
    const problems = validateInputs(procs, 'rr', 0, 0)
    const quantumProblem = problems.find((p) => p.field === 'quantum')
    expect(quantumProblem).toBeDefined()
    expect(quantumProblem?.message).toContain('Round Robin')
  })

  it('accepts quantum 0 with algo fcfs', () => {
    const procs = [validProcess]
    const problems = validateInputs(procs, 'fcfs', 0, 0)
    const quantumProblem = problems.find((p) => p.field === 'quantum')
    expect(quantumProblem).toBeUndefined()
  })

  it('rejects quantum 0 with compare mode', () => {
    const procs = [validProcess]
    const problems = validateInputs(procs, 'compare', 0, 0)
    const quantumProblem = problems.find((p) => p.field === 'quantum')
    expect(quantumProblem).toBeDefined()
    expect(quantumProblem?.message).toContain('compare mode')
  })

  it('rejects context switch > 100', () => {
    const procs = [validProcess]
    const problems = validateInputs(procs, 'fcfs', 4, 101)
    const csProblem = problems.find((p) => p.field === 'contextSwitch')
    expect(csProblem).toBeDefined()
  })

  it('rejects context switch < 0', () => {
    const procs = [validProcess]
    const problems = validateInputs(procs, 'fcfs', 4, -1)
    const csProblem = problems.find((p) => p.field === 'contextSwitch')
    expect(csProblem).toBeDefined()
  })
})
