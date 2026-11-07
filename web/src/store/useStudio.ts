import { create } from 'zustand'
import { useMemo } from 'react'
import type { Algo, CompareTrace, ProcInput, Trace } from '../types/trace'
import { runSimulation, runCompare, pingEngine, EngineError } from '../lib/api'
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
