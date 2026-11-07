import { create } from 'zustand'
import { useMemo } from 'react'
import type { Algo, CompareTrace, ProcInput, Trace } from '../types/trace'
import { runSimulation, runCompare, pingEngine, EngineError } from '../lib/api'
import { deriveState, totalTime, type DerivedState } from '../lib/deriveState'
import { PRESETS } from '../lib/presets.generated'

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

  // Status
  status: 'idle' | 'running' | 'error'
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
}

type StudioStore = StudioState & StudioActions

// Use the first preset's data as default initial state
const defaultPreset = PRESETS[0]

export const useStudio = create<StudioStore>((set, get) => ({
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
  status: 'idle',
  error: null,
  engineOnline: true,

  // Editor actions
  setProcesses: (processes) => set({ processes }),
  setAlgo: (algo) => set({ algo }),
  setQuantum: (quantum) => set({ quantum }),
  setContextSwitch: (contextSwitch) => set({ contextSwitch }),

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
      status: 'idle',
      error: null,
    })
  },

  run: async () => {
    const { processes, algo, quantum, contextSwitch, view } = get()
    set({ status: 'running', error: null })
    try {
      if (view === 'compare') {
        const result = await runCompare({ processes, quantum, contextSwitch })
        set({ compare: result, status: 'idle', t: 0, playing: false })
      } else {
        const req = {
          processes,
          algo,
          ...(algo === 'rr' ? { quantum } : {}),
          contextSwitch,
        }
        const result = await runSimulation(req)
        set({ trace: result, status: 'idle', t: 0, playing: false, engineOnline: true })
      }
    } catch (err) {
      const msg = err instanceof EngineError ? err.message : 'Unknown error'
      const offline = msg === 'Engine offline'
      set({
        status: 'error',
        error: msg,
        engineOnline: offline ? false : get().engineOnline,
      })
    }
  },

  setView: (view) => set({ view }),

  setT: (t) => {
    const { trace } = get()
    const total = trace ? totalTime(trace) : 0
    set({ t: Math.max(0, Math.min(total, t)) })
  },

  play: () => set({ playing: true }),
  pause: () => set({ playing: false }),
  toggle: () => set((s) => ({ playing: !s.playing })),

  step: (delta) => {
    const { t, trace } = get()
    const total = trace ? totalTime(trace) : 0
    set({ t: Math.max(0, Math.min(total, t + delta)), playing: false })
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
    if (t >= total) {
      set({ playing: false })
      return
    }
    set({ t: t + 1 })
  },

  checkEngine: async () => {
    const online = await pingEngine()
    set({ engineOnline: online })
  },
}))

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
