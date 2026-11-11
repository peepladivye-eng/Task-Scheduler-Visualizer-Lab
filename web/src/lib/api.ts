import type { RunRequest, Trace, CompareTrace, LiveResponse, LiveStreamEvent } from '../types/trace'

/** Thrown when the engine returns an error or is unreachable. */
export class EngineError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EngineError'
  }
}

/** POST to /api/run and return a single-run Trace. */
export async function runSimulation(
  req: RunRequest,
  signal?: AbortSignal,
): Promise<Trace> {
  let res: Response
  try {
    res = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
      signal,
    })
  } catch {
    throw new EngineError('Engine offline')
  }

  if (!res.ok) {
    let msg = 'Engine error'
    try {
      const body = await res.json() as { error?: string }
      if (typeof body.error === 'string') msg = body.error
    } catch {
      // ignore parse error — use default message
    }
    throw new EngineError(msg)
  }

  // Live mode returns {trace, log}; simulate returns Trace directly
  try {
    const body = await res.json()
    if (req.live && body.trace) {
      return body.trace as Trace
    }
    return body as Trace
  } catch {
    throw new EngineError('Bad response from engine')
  }
}

/** POST to /api/run with live=true and return trace + log lines. */
export async function runLive(
  req: RunRequest,
  signal?: AbortSignal,
): Promise<LiveResponse> {
  let res: Response
  try {
    res = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...req, live: true }),
      signal,
    })
  } catch {
    throw new EngineError('Engine offline')
  }

  if (!res.ok) {
    let msg = 'Engine error'
    try {
      const body = await res.json() as { error?: string }
      if (typeof body.error === 'string') msg = body.error
    } catch {
      // ignore
    }
    throw new EngineError(msg)
  }

  try {
    return (await res.json()) as LiveResponse
  } catch {
    throw new EngineError('Bad response from engine')
  }
}

/**
 * POST to /api/live and stream NDJSON events, calling onEvent for each parsed line.
 * Returns after the stream ends (engine process exits or client disconnects).
 * Throws EngineError on HTTP error or if the stream errors.
 */
export async function streamLive(
  req: RunRequest,
  onEvent: (ev: LiveStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  let res: Response
  try {
    res = await fetch('/api/live', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
      signal,
    })
  } catch {
    throw new EngineError('Engine offline')
  }

  if (!res.ok) {
    let msg = 'Engine error'
    try {
      const body = await res.json() as { error?: string }
      if (typeof body.error === 'string') msg = body.error
    } catch {
      // ignore
    }
    throw new EngineError(msg)
  }

  // Stream the NDJSON body line by line
  const reader = res.body?.getReader()
  if (!reader) throw new EngineError('No response body')

  const decoder = new TextDecoder()
  let buf = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop() ?? ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        try {
          const ev = JSON.parse(trimmed) as LiveStreamEvent
          onEvent(ev)
        } catch {
          // ignore malformed lines
        }
      }
    }
    // Flush any remaining data
    if (buf.trim()) {
      try {
        const ev = JSON.parse(buf.trim()) as LiveStreamEvent
        onEvent(ev)
      } catch {
        // ignore
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/** POST to /api/run with algo:'compare' and return a CompareTrace. */
export async function runCompare(
  req: Omit<RunRequest, 'algo'>,
  signal?: AbortSignal,
): Promise<CompareTrace> {
  const fullReq: RunRequest = { ...req, algo: 'compare' }
  let res: Response
  try {
    res = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullReq),
      signal,
    })
  } catch {
    throw new EngineError('Engine offline')
  }

  if (!res.ok) {
    let msg = 'Engine error'
    try {
      const body = await res.json() as { error?: string }
      if (typeof body.error === 'string') msg = body.error
    } catch {
      // ignore
    }
    throw new EngineError(msg)
  }

  try {
    return (await res.json()) as CompareTrace
  } catch {
    throw new EngineError('Bad response from engine')
  }
}

/**
 * Ping the engine by running a trivial 1-process FCFS simulation.
 * Returns true if the engine responds with HTTP 200, false otherwise.
 */
export async function pingEngine(): Promise<boolean> {
  try {
    const res = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        processes: [{ pid: 1, arrival: 0, burst: 1, priority: 1 }],
        algo: 'fcfs',
      } satisfies RunRequest),
    })
    return res.ok
  } catch {
    return false
  }
}
