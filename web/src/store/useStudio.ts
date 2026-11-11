import { create } from 'zustand'
import { useMemo } from 'react'
import type { Algo, CompareTrace, ProcInput, Trace } from '../types/trace'
import type { LiveStreamEvent } from '../types/trace'
import { runSimulation, runCompare, runLive, streamLive, pingEngine, EngineError } from '../lib/api'
import { deriveState, totalTime, type DerivedState } from '../lib/deriveState'
import { PRESETS } from '../lib/presets.generated'
import { validateInputs, type InputProblem } from '../lib/validate'

type Speed = 0.5 | 1 | 2 | 4

interface StudioState {
  // Editor state
  processes: ProcInput[]
  algo: Algo
  quantum: number
  contextSwitch: number

  // Results
  trace: Trace | null
  compare: CompareTrace | null
  view: 'single' | 'compare'

  // Playback
  t: number
  playing: boolean
  speed: Speed

  // Live mode (fork real child processes — Linux/WSL2 only)
  liveMode: boolean
  liveModeAvailable: boolean   // set by /api/health response
  ipc: 'signal' | 'pipe'
  workUs: number
  tickMs: number
  liveLog: string[]             // log lines from the engine --log output
  liveEvents: LiveStreamEvent[] // NDJSON events streamed from /api/live
  liveRunning: boolean          // true while a live run is in progress

  // Status (new reactive pipeline states)
  sim: 'idle' | 'working' | 'fresh' | 'invalid' | 'error'
  problems: InputProblem[]
  runSeq: number
  status: 'idle' | 'running' | 'error' // legacy, kept for compatibility
  error: string | null
  engineOnline: boolean
}

interface StudioActions {
  setProcesses: (p: ProcInput[]) => void
  setAlgo: (a: Algo) => void
  setQuantum: (q: number) => void
  setContextSwitch: (cs: number) => void
  loadPreset: (id: string) => void
  run: () => Promise<void>
  setView: (v: 'single' | 'compare') => void
  setT: (t: number) => void
  setLiveMode: (v: boolean) => void
  setIpc: (v: 'signal' | 'pipe') => void
  setWorkUs: (v: number) => void
  setTickMs: (v: number) => void
  runLive: () => Promise<void>
  clearLog: () => void
  play: () => void
  pause: () => void
  toggle: () => void
  step: (delta: number) => void
  seekStart: () => void
  seekEnd: () => void
  setSpeed: (s: Speed) => void
  tick: () => void
  checkEngine: () => Promise<void>
  setError: (e: string | null) => void
}

type StudioStore = StudioState & StudioActions

// Use the first preset's data as default initial state
const defaultPreset = PRESETS[0]

// Global timer and abort controller for reactive pipeline
let scheduleTimer: ReturnType<typeof setTimeout> | null = null
let currentAbort: AbortController | null = null

/** Format a LiveStreamEvent as a terminal log line matching the WSL output format. */
function formatLiveEvent(ev: LiveStreamEvent): string {
  const t = `t=${String(ev.t).padStart(3, ' ')}`
  const pidStr = ev.pid != null ? `P${ev.pid}` : ''
  switch (ev.type) {
    case 'arrive': {
      return `${t} ARRIVE   ${pidStr.padEnd(3, ' ')} fork() -> os_pid ${ev.os_pid ?? '?'}, child stopped (T)`
    }
    case 'dispatch': {
      const rq = (ev.ready ?? []).map(p => `P${p}`).join(',')
      return `${t} DISPATCH ${pidStr.padEnd(3, ' ')} kill(${ev.os_pid ?? '?'},SIGCONT) ready=[${rq}]`
    }
    case 'run': {
      return `${t} RUN      ${pidStr.padEnd(3, ' ')} os_pid ${ev.os_pid ?? '?'} tick ${ev.tick ?? '?'}/${ev.total ?? '?'}`
    }
    case 'preempt': {
      const reason = ev.reason ? `stopped by SIGSTOP, ${ev.reason}` : 'stopped by SIGSTOP'
      return `${t} PREEMPT  ${pidStr.padEnd(3, ' ')} wait4 -> ${reason}`
    }
    case 'exit': {
      const cpu = ev.cpu_ms != null ? ev.cpu_ms.toFixed(2) + ' ms' : '?'
      const rss = ev.max_rss_kb != null ? (ev.max_rss_kb / 1024).toFixed(1) + ' MB' : '?'
      return `${t} EXIT     ${pidStr.padEnd(3, ' ')} wait4 -> exited ${ev.status ?? 0}, cpu ${cpu}, max_rss ${rss}`
    }
    case 'cleanup': {
      return `${t} CLEANUP  kill(-${ev.pgid ?? 'pgid'},SIGKILL) live=${ev.live ?? 0} reaped ${ev.reaped ?? 0}/${ev.total ?? 0} zombies ${ev.zombies ?? 0}`
    }
    default:
      return `${t} ${(ev as LiveStreamEvent).type.toUpperCase()} ${pidStr}`
  }
}

export const useStudio = create<StudioStore>((set, get) => {
  // Helper: schedule a debounced run
  const scheduleRun = () => {
    if (scheduleTimer !== null) {
      clearTimeout(scheduleTimer)
    }
    scheduleTimer = setTimeout(() => {
      scheduleTimer = null
      doRun()
    }, 150)
  }

  // Core reactive simulation runner
  const doRun = async () => {
    const { processes, algo, quantum, contextSwitch, view, runSeq } = get()

    // Validate inputs
    const problems = validateInputs(processes, view === 'compare' ? 'compare' : algo, quantum, contextSwitch)
    if (problems.length > 0) {
      set({ sim: 'invalid', problems, status: 'error' })
      return
    }

    // Abort any previous run
    if (currentAbort) {
      currentAbort.abort()
    }
    currentAbort = new AbortController()
    const signal = currentAbort.signal
    const id = get().runSeq + 1
    set({ runSeq: id, sim: 'working', problems: [], error: null, status: 'running' })

    try {
      if (view === 'compare') {
        const result = await runCompare({ processes, quantum, contextSwitch }, signal)
        // Check if this result is still current
        if (id !== get().runSeq) return
        const total = result.runs[0] ? totalTime(result.runs[0]) : 0
        set({
          compare: result,
          sim: 'fresh',
          t: Math.min(get().t, total),
          playing: false,
          engineOnline: true,
          status: 'idle',
        })
      } else {
        const req = {
          processes,
          algo,
          ...(algo === 'rr' ? { quantum } : {}),
          contextSwitch,
          // Auto-run always uses simulate (live runs are manual only)
          live: false,
        }
        const result = await runSimulation(req, signal)
        // Check if this result is still current
        if (id !== get().runSeq) return
        const total = totalTime(result)
        set({
          trace: result,
          sim: 'fresh',
          t: Math.min(get().t, total),
          playing: false,
          engineOnline: true,
          status: 'idle',
        })
      }
    } catch (err: unknown) {
      // Ignore aborted requests
      if (signal.aborted) return
      const msg = err instanceof EngineError ? err.message : 'Unknown error'
      const offline = msg === 'Engine offline'
      set({
        sim: 'error',
        error: msg,
        status: 'error',
        engineOnline: offline ? false : get().engineOnline,
      })
    }
  }

  return {
    // Initial state
    processes: defaultPreset?.processes ?? [{ pid: 1, arrival: 0, burst: 1, priority: 1 }],
    algo: (defaultPreset?.algo ?? 'fcfs') as Algo,
    quantum: defaultPreset?.quantum ?? 4,
    contextSwitch: defaultPreset?.contextSwitch ?? 0,
    trace: defaultPreset?.trace ?? null,
    compare: null,
    view: 'single',
    t: 0,
    playing: false,
    speed: 1,
    liveMode: false,
    liveModeAvailable: false,
    ipc: 'signal',
    workUs: 200,
    tickMs: 200,
    liveLog: [],
    liveEvents: [],
    liveRunning: false,
    sim: 'fresh', // Start with preset loaded
    problems: [],
    runSeq: 0,
    status: 'idle',
    error: null,
    engineOnline: true,

    // Editor actions with auto-run
    setProcesses: (processes) => {
      set({ processes })
      scheduleRun()
    },
    setAlgo: (algo) => {
      set({ algo })
      scheduleRun()
    },
    setQuantum: (quantum) => {
      set({ quantum })
      scheduleRun()
    },
    setContextSwitch: (contextSwitch) => {
      set({ contextSwitch })
      scheduleRun()
    },

    loadPreset: (id) => {
      const preset = PRESETS.find((p) => p.id === id)
      if (!preset) return
      const { engineOnline } = get()
      set({
        processes: preset.processes,
        algo: preset.algo,
        quantum: preset.quantum ?? 4,
        contextSwitch: preset.contextSwitch,
        // If engine is offline, load the precomputed trace directly
        trace: !engineOnline ? preset.trace : get().trace,
        t: 0,
        playing: false,
        sim: 'fresh',
        status: 'idle',
        error: null,
        problems: [],
      })
      // Trigger auto-run after preset load (unless offline)
      if (engineOnline) {
        scheduleRun()
      }
    },

    // run() kept as an alias for compatibility
    run: doRun,

    setView: (view) => {
      set({ view })
      scheduleRun()
    },

    setLiveMode: (v) => {
      set({ liveMode: v })
      // When toggling live mode, auto-run still does simulate for preview
      scheduleRun()
    },

    setIpc: (ipc) => set({ ipc }),
    setWorkUs: (workUs) => set({ workUs }),
    setTickMs: (tickMs) => set({ tickMs }),
    clearLog: () => set({ liveLog: [], liveEvents: [] }),

    runLive: async () => {
      const { processes, algo, quantum, contextSwitch, liveMode, ipc, workUs, tickMs, view } = get()
      if (!liveMode || view === 'compare') return

      // Abort any previous auto-run
      if (currentAbort) currentAbort.abort()
      currentAbort = new AbortController()
      const signal = currentAbort.signal

      set({ liveRunning: true, liveLog: [], liveEvents: [], sim: 'working', status: 'running', error: null })

      const req = {
        processes,
        algo,
        ...(algo === 'rr' ? { quantum } : {}),
        contextSwitch,
        live: true as const,
        ipc,
        workUs,
        tickMs,
      }

      try {
        await streamLive(req, (ev: LiveStreamEvent) => {
          if (signal.aborted) return
          const line = formatLiveEvent(ev)
          set((s) => ({
            liveLog: [...s.liveLog, line],
            liveEvents: [...s.liveEvents, ev],
          }))
        }, signal)

        if (signal.aborted) return

        // Stream ended — fetch the full trace JSON from /api/run for Gantt/metrics
        const result = await runLive(req, signal)
        if (signal.aborted) return

        const total = totalTime(result.trace)
        set({
          trace: result.trace,
          sim: 'fresh',
          t: Math.min(get().t, total),
          playing: false,
          liveRunning: false,
          engineOnline: true,
          status: 'idle',
        })
      } catch (err: unknown) {
        if (signal.aborted) return
        const msg = err instanceof EngineError ? err.message : 'Unknown error'
        set({
          sim: 'error',
          error: msg,
          status: 'error',
          liveRunning: false,
        })
      }
    },

    setT: (t) => {
      const { trace } = get()
      const total = trace ? totalTime(trace) : 0
      set({ t: Math.max(0, Math.min(total, t)) })
    },

    play: () => {
      const { t, trace } = get()
      const total = trace ? totalTime(trace) : 0
      // Restart from beginning if already at end
      if (t >= total) {
        set({ t: 0, playing: true })
      } else {
        set({ playing: true })
      }
    },
    pause: () => set({ playing: false }),
    toggle: () => {
      const { playing, t, trace } = get()
      if (playing) {
        set({ playing: false })
      } else {
        const total = trace ? totalTime(trace) : 0
        // Restart from beginning if already at end
        if (t >= total) {
          set({ t: 0, playing: true })
        } else {
          set({ playing: true })
        }
      }
    },

    step: (delta) => {
      const { t, trace } = get()
      const total = trace ? totalTime(trace) : 0
      const next = t + delta
      // Allow stepping past the end to reach exactly total
      set({ t: Math.max(0, Math.min(total, next)), playing: false })
    },

    seekStart: () => set({ t: 0, playing: false }),
    seekEnd: () => {
      const { trace } = get()
      const total = trace ? totalTime(trace) : 0
      set({ t: total, playing: false })
    },

    setSpeed: (speed) => set({ speed }),

    tick: () => {
      const { t, trace, playing } = get()
      if (!playing) return
      const total = trace ? totalTime(trace) : 0
      const next = t + 1
      if (next >= total) {
        set({ t: total, playing: false })
      } else {
        set({ t: next })
      }
    },

    checkEngine: async () => {
      const online = await pingEngine()
      set({ engineOnline: online })
      // Also check if live mode is available (Linux C++ engine)
      try {
        const h = await fetch('/api/health')
        if (h.ok) {
          const info = await h.json() as { live_mode_supported?: boolean }
          set({ liveModeAvailable: !!info.live_mode_supported })
        }
      } catch { /* ignore */ }
    },

    setError: (error) => set({ error, status: error === null ? 'idle' : 'error', sim: error === null ? 'fresh' : 'error' }),
  }
})

/**
 * Selector hook: returns the DerivedState for the current trace and t,
 * memoized so it only recomputes when trace or t changes.
 * Returns null when no trace is loaded.
 */
export function useDerived(): DerivedState | null {
  const trace = useStudio((s) => s.trace)
  const t = useStudio((s) => s.t)
  return useMemo(() => {
    if (!trace) return null
    return deriveState(trace, t)
  }, [trace, t])
}
