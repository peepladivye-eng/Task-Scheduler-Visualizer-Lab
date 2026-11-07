import { describe, it, expect, vi, afterEach } from 'vitest'
import { runSimulation, runCompare, pingEngine, EngineError } from '../src/lib/api'
import type { Trace, CompareTrace } from '../src/types/trace'

// Minimal valid Trace for mocking
const mockTrace: Trace = {
  version: '1.0',
  algo: 'fcfs',
  quantum: null,
  context_switch_cost: 0,
  processes: [
    { pid: 1, arrival: 0, burst: 1, priority: 1, start: 0, completion: 1, waiting: 0, turnaround: 1, response: 0 },
  ],
  timeline: [{ t_start: 0, t_end: 1, pid: 1, type: 'run' }],
  events: [
    { t: 0, type: 'arrive',   pid: 1, ready_queue: [1] },
    { t: 0, type: 'dispatch', pid: 1, ready_queue: [] },
    { t: 1, type: 'complete', pid: 1, ready_queue: [] },
  ],
  metrics: {
    avg_waiting: 0, avg_turnaround: 1, avg_response: 0,
    cpu_utilization: 100, throughput: 1, context_switches: 0,
  },
}

const mockCompare: CompareTrace = {
  version: '1.0',
  compare: true,
  runs: [mockTrace, mockTrace, mockTrace, mockTrace, mockTrace, mockTrace],
}

/** Helper: create a mock fetch that returns given status + JSON body. */
function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  })
}

/** Helper: create a mock fetch that rejects (network error). */
function mockFetchReject(message = 'Failed to fetch') {
  return vi.fn().mockRejectedValue(new Error(message))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('runSimulation', () => {
  it('success: returns parsed Trace on HTTP 200', async () => {
    vi.stubGlobal('fetch', mockFetch(200, mockTrace))
    const result = await runSimulation({
      processes: [{ pid: 1, arrival: 0, burst: 1, priority: 1 }],
      algo: 'fcfs',
    })
    expect(result.algo).toBe('fcfs')
    expect(result.processes).toHaveLength(1)
  })

  it('HTTP 400 with error body throws EngineError with that message', async () => {
    vi.stubGlobal('fetch', mockFetch(400, { error: 'burst must be between 1 and 10000' }))
    await expect(
      runSimulation({ processes: [{ pid: 1, arrival: 0, burst: 0, priority: 1 }], algo: 'fcfs' })
    ).rejects.toThrow('burst must be between 1 and 10000')
  })

  it('HTTP 400 with error body throws EngineError instance', async () => {
    vi.stubGlobal('fetch', mockFetch(400, { error: 'some error' }))
    await expect(
      runSimulation({ processes: [{ pid: 1, arrival: 0, burst: 1, priority: 1 }], algo: 'fcfs' })
    ).rejects.toBeInstanceOf(EngineError)
  })

  it('network failure throws EngineError("Engine offline")', async () => {
    vi.stubGlobal('fetch', mockFetchReject())
    await expect(
      runSimulation({ processes: [{ pid: 1, arrival: 0, burst: 1, priority: 1 }], algo: 'fcfs' })
    ).rejects.toThrow('Engine offline')
  })
})

describe('runCompare', () => {
  it('success: returns CompareTrace on HTTP 200', async () => {
    vi.stubGlobal('fetch', mockFetch(200, mockCompare))
    const result = await runCompare({
      processes: [{ pid: 1, arrival: 0, burst: 1, priority: 1 }],
    })
    expect(result.compare).toBe(true)
    expect(result.runs).toHaveLength(6)
  })

  it('network failure throws EngineError', async () => {
    vi.stubGlobal('fetch', mockFetchReject())
    await expect(
      runCompare({ processes: [{ pid: 1, arrival: 0, burst: 1, priority: 1 }] })
    ).rejects.toBeInstanceOf(EngineError)
  })
})

describe('pingEngine', () => {
  it('returns true when engine responds with 200', async () => {
    vi.stubGlobal('fetch', mockFetch(200, mockTrace))
    expect(await pingEngine()).toBe(true)
  })

  it('returns false on network error', async () => {
    vi.stubGlobal('fetch', mockFetchReject())
    expect(await pingEngine()).toBe(false)
  })

  it('returns false on 500 response', async () => {
    vi.stubGlobal('fetch', mockFetch(500, { error: 'server error' }))
    expect(await pingEngine()).toBe(false)
  })
})
