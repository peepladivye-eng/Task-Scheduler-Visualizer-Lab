import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { spring } from '../design/motion'
import { Button } from '../ui/Button'

const TOUR_KEY = 'kiro_tour_done'

interface Step {
  target: string   // CSS selector for the highlighted element
  title: string
  body: string
  position: 'top' | 'bottom' | 'left' | 'right'
}

const STEPS: Step[] = [
  {
    target: '[data-tour="scenario"]',
    title: 'Pick an algorithm',
    body: 'Choose from FCFS, SJF, SRTF, Priority, Priority-P, or Round Robin. The simulation reruns automatically.',
    position: 'bottom',
  },
  {
    target: '[data-tour="editor"]',
    title: 'Edit processes',
    body: 'Add or remove processes and set arrival time, burst time, and priority. Changes trigger an instant re-simulation.',
    position: 'bottom',
  },
  {
    target: '[data-tour="workbench"]',
    title: 'Animated Gantt chart',
    body: 'Press Play to watch the CPU execute each process tick-by-tick. Hover a process to highlight it everywhere.',
    position: 'bottom',
  },
  {
    target: '[data-tour="narrator"]',
    title: 'Narrator',
    body: 'Step through the simulation one tick at a time and read a plain-language explanation of every scheduling decision.',
    position: 'right',
  },
  {
    target: '[data-tour="transport"]',
    title: 'Transport controls',
    body: 'Play, pause, step, seek, and change playback speed. Keyboard shortcuts: Space, ←/→, Home/End.',
    position: 'top',
  },
]

function useRect(selector: string, step: number) {
  const [rect, setRect] = React.useState<DOMRect | null>(null)
  React.useEffect(() => {
    const el = document.querySelector(selector)
    if (!el) { setRect(null); return }
    const r = el.getBoundingClientRect()
    setRect(r)
  }, [selector, step])
  return rect
}

export function useTour() {
  const [step, setStep] = React.useState(0)
  const [active, setActive] = React.useState(() => {
    try {
      return localStorage.getItem(TOUR_KEY) !== 'true'
    } catch {
      return true
    }
  })

  const finish = React.useCallback(() => {
    setActive(false)
    try { localStorage.setItem(TOUR_KEY, 'true') } catch {}
  }, [])

  const next = React.useCallback(() => {
    if (step < STEPS.length - 1) setStep((s) => s + 1)
    else finish()
  }, [step, finish])

  const prev = React.useCallback(() => {
    if (step > 0) setStep((s) => s - 1)
  }, [step])

  const restart = React.useCallback(() => {
    setStep(0)
    setActive(true)
  }, [])

  return { active, step, steps: STEPS, next, prev, finish, restart }
}

interface TourProps {
  active: boolean
  step: number
  steps: Step[]
  next: () => void
  prev: () => void
  finish: () => void
}

export default function Tour({ active, step, steps, next, prev, finish }: TourProps) {
  const current = steps[step]
  const rect = useRect(current.target, step)

  if (!active) return null

  const PAD = 12
  // Tooltip placement from rect
  let tipTop = 0
  let tipLeft = 0
  if (rect) {
    switch (current.position) {
      case 'bottom':
        tipTop = rect.bottom + PAD
        tipLeft = rect.left + rect.width / 2
        break
      case 'top':
        tipTop = rect.top - PAD
        tipLeft = rect.left + rect.width / 2
        break
      case 'right':
        tipTop = rect.top + rect.height / 2
        tipLeft = rect.right + PAD
        break
      case 'left':
        tipTop = rect.top + rect.height / 2
        tipLeft = rect.left - PAD
        break
    }
  }

  return (
    <AnimatePresence>
      {active && (
        <>
          {/* Dark overlay with a cutout around the target */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] pointer-events-none"
            style={{
              background: rect
                ? `radial-gradient(ellipse ${rect.width + PAD * 2}px ${rect.height + PAD * 2}px at ${rect.left + rect.width / 2}px ${rect.top + rect.height / 2}px, transparent 0%, transparent 40%, rgba(0,0,0,0.6) 70%)`
                : 'rgba(0,0,0,0.6)',
            }}
          />

          {/* Tooltip card */}
          <motion.div
            key={`tip-${step}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={spring.snappy}
            className="fixed z-[201] sheet shadow-2xl w-72 pointer-events-auto"
            style={{
              top: tipTop,
              left: tipLeft,
              transform: current.position === 'bottom' || current.position === 'top'
                ? 'translateX(-50%)'
                : current.position === 'left' ? 'translate(-100%, -50%)' : 'translateY(-50%)',
            }}
          >
            {/* Close */}
            <button
              onClick={finish}
              className="absolute top-3 right-3 text-muted hover:text-ink"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Step dots */}
            <div className="flex gap-1 mb-3">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${i === step ? 'w-4 bg-accent' : 'w-1.5 bg-line'}`}
                />
              ))}
            </div>

            <h4 className="font-display font-semibold text-ink mb-1">{current.title}</h4>
            <p className="text-sm text-muted leading-relaxed mb-4">{current.body}</p>

            <div className="flex items-center gap-2">
              {step > 0 && (
                <Button variant="ghost" size="sm" onClick={prev}>
                  Back
                </Button>
              )}
              <div className="flex-1" />
              <span className="text-xs text-muted">{step + 1} / {steps.length}</span>
              <Button size="sm" onClick={next}>
                {step === steps.length - 1 ? 'Done' : 'Next'}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
