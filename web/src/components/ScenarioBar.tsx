import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStudio } from '../store/useStudio'
import { RULE_TEXT } from '../lib/explain'
import { ALGO_ORDER, ALGO_LABEL, type Algo } from '../types/trace'
import { Segmented } from '../ui/Segmented'
import { Stepper } from '../ui/Stepper'
import { Tooltip } from '../ui/Tooltip'
import { Switch } from '../ui/Switch'
import { dur } from '../design/motion'

export default function ScenarioBar() {
  const algo            = useStudio((s) => s.algo)
  const quantum         = useStudio((s) => s.quantum)
  const contextSwitch   = useStudio((s) => s.contextSwitch)
  const sim             = useStudio((s) => s.sim)
  const problems        = useStudio((s) => s.problems)
  const liveMode        = useStudio((s) => s.liveMode)
  const liveModeAvailable = useStudio((s) => s.liveModeAvailable)

  const setAlgo         = useStudio((s) => s.setAlgo)
  const setQuantum      = useStudio((s) => s.setQuantum)
  const setContextSwitch = useStudio((s) => s.setContextSwitch)
  const setLiveMode     = useStudio((s) => s.setLiveMode)

  const getStatus = () => {
    switch (sim) {
      case 'working': return { label: liveMode ? 'Forking…' : 'Simulating', color: 'text-accent bg-accent/10 border-accent' }
      case 'fresh':   return { label: 'Up to date', color: 'text-good bg-good/10 border-good' }
      case 'invalid': return { label: 'Fix inputs', color: 'text-warn bg-warn/10 border-warn' }
      case 'error':   return { label: 'Error', color: 'text-bad bg-bad/10 border-bad' }
      default:        return { label: 'Idle', color: 'text-muted bg-chip border-line' }
    }
  }

  const status = getStatus()

  return (
    <div className="sheet space-y-4">
      {/* Top row: algo selector + status */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-xs uppercase tracking-wider text-muted font-semibold whitespace-nowrap">
            Algorithm
          </span>
          <Segmented
            value={algo}
            onChange={(v) => setAlgo(v as Algo)}
            options={ALGO_ORDER.map((a) => ({ value: a, label: ALGO_LABEL[a] }))}
            ariaLabel="Select scheduling algorithm"
          />
        </div>
        <div className={`px-3 py-1.5 rounded-lg border text-xs font-semibold font-mono ${status.color}`}>
          {status.label}
        </div>
      </div>

      {/* Rule text */}
      <AnimatePresence mode="wait">
        <motion.div
          key={algo}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: dur.fast }}
          className="text-sm italic text-muted leading-relaxed"
        >
          {RULE_TEXT[algo]}
        </motion.div>
      </AnimatePresence>

      {/* Controls row */}
      <div className="flex items-center gap-6 flex-wrap">
        {algo === 'rr' ? (
          <Stepper value={quantum} min={1} max={100} onChange={setQuantum} label="Quantum" unit="ms" />
        ) : (
          <Tooltip content="Only used by Round Robin">
            <div className="opacity-50">
              <Stepper value={quantum} min={1} max={100} onChange={setQuantum} label="Quantum" unit="ms" disabled />
            </div>
          </Tooltip>
        )}

        <Stepper value={contextSwitch} min={0} max={100} onChange={setContextSwitch} label="Context switch" unit="ms" />

        {/* Live mode toggle — only shown when the C++ engine is on Linux */}
        {liveModeAvailable && (
          <Tooltip content="Fork real Linux child processes via fork(). Shows actual OS PIDs. Requires WSL2 C++ engine.">
            <div className="flex items-center gap-2">
              <Switch
                checked={liveMode}
                onCheckedChange={setLiveMode}
                aria-label="Live mode"
              />
              <span className="text-xs font-semibold text-muted">
                Live mode
                {liveMode && (
                  <span className="ml-1 text-good">● fork()</span>
                )}
              </span>
            </div>
          </Tooltip>
        )}
      </div>

      {/* Live mode info banner */}
      {liveMode && liveModeAvailable && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-good/10 border border-good/30 rounded-lg px-4 py-2 text-xs text-good"
        >
          <span className="font-semibold">Live mode active.</span>
          {' '}Real Linux child processes will be created via fork() and coordinated through POSIX pipes.
          OS PIDs appear in the process table after execution.
        </motion.div>
      )}

      {/* Validation problems */}
      {problems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-bad/10 border border-bad rounded-lg px-4 py-3 text-sm text-bad space-y-2"
        >
          <div className="font-semibold">Input Problems:</div>
          <ul className="list-disc list-inside space-y-1">
            {problems.map((p, i) => (
              <li key={i}>{p.message}</li>
            ))}
          </ul>
        </motion.div>
      )}
    </div>
  )
}
