import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HelpCircle, CheckCircle, XCircle, ChevronRight } from 'lucide-react'
import { useStudio, useDerived } from '../store/useStudio'
import { spring } from '../design/motion'
import { Button } from '../ui/Button'
import type { Trace } from '../types/trace'

const PID_COLORS = [
  '#6ea8fe', '#3ddc97', '#ffb454', '#ff6b9d', '#b794f6',
  '#4fd1c5', '#f6e05e', '#fc8181', '#90cdf4', '#a3e635',
]
const getPidColor = (pid: number) => PID_COLORS[(pid - 1) % 10]

/** Find the next dispatch event strictly after tick t */
function nextDispatch(trace: Trace, t: number) {
  return trace.events.find((ev) => ev.type === 'dispatch' && ev.t > t) ?? null
}

type Phase = 'question' | 'correct' | 'wrong'

export default function PredictPanel() {
  const trace = useStudio((s) => s.trace)
  const t = useStudio((s) => s.t)
  const pause = useStudio((s) => s.pause)
  const setT = useStudio((s) => s.setT)
  const derived = useDerived()

  const [phase, setPhase] = React.useState<Phase>('question')
  const [chosen, setChosen] = React.useState<number | null>(null)

  // Reset whenever t changes or a new trace loads
  React.useEffect(() => {
    setPhase('question')
    setChosen(null)
  }, [trace, t])

  if (!trace || !derived) return null

  // Only show when CPU is idle (dispatch about to happen) and there's a next event
  const next = nextDispatch(trace, t)
  if (!next || derived.running !== null) return null

  const candidates = derived.readyQueue
  if (candidates.length === 0) return null

  const correctPid = next.pid

  const handlePick = (pid: number) => {
    pause()
    setChosen(pid)
    setPhase(pid === correctPid ? 'correct' : 'wrong')
  }

  const handleReveal = () => {
    // Jump to the dispatch event so user sees the answer play out
    setT(next.t)
    setPhase('question')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={spring.snappy}
      className="sheet border-l-4 border-accent space-y-3"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <HelpCircle className="w-4 h-4 text-accent" />
        <h3 className="font-display font-semibold text-ink text-lg">Predict</h3>
        <span className="text-xs text-muted ml-1">which process runs next?</span>
      </div>

      <AnimatePresence mode="wait">
        {phase === 'question' && (
          <motion.div
            key="q"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-wrap gap-2"
          >
            {candidates.map((pid) => {
              const color = getPidColor(pid)
              return (
                <button
                  key={pid}
                  onClick={() => handlePick(pid)}
                  className="px-4 py-2 rounded-lg font-mono font-bold text-sm transition-all hover:scale-105 active:scale-95 border-2"
                  style={{
                    backgroundColor: `${color}18`,
                    borderColor: `${color}66`,
                    color,
                  }}
                >
                  P{pid}
                </button>
              )
            })}
          </motion.div>
        )}

        {phase === 'correct' && chosen !== null && (
          <motion.div
            key="ok"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={spring.snappy}
            className="flex items-center gap-3"
          >
            <CheckCircle className="w-5 h-5 text-good flex-shrink-0" />
            <span className="text-good font-semibold text-sm">
              Correct! <span className="font-mono">P{chosen}</span> is next.
            </span>
            <Button variant="ghost" size="sm" onClick={handleReveal} className="ml-auto gap-1">
              Watch it run <ChevronRight className="w-3 h-3" />
            </Button>
          </motion.div>
        )}

        {phase === 'wrong' && chosen !== null && (
          <motion.div
            key="no"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={spring.snappy}
            className="flex items-center gap-3 flex-wrap"
          >
            <XCircle className="w-5 h-5 text-bad flex-shrink-0" />
            <span className="text-bad font-semibold text-sm">
              Not quite. <span className="font-mono">P{chosen}</span> isn't next.
            </span>
            <Button variant="ghost" size="sm" onClick={handleReveal} className="ml-auto gap-1">
              Reveal answer <ChevronRight className="w-3 h-3" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
