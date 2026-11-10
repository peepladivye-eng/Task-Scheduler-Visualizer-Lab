import React, { useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  SkipBack,
  ChevronLeft,
  Play,
  Pause,
  ChevronRight,
  SkipForward,
  RotateCcw,
} from 'lucide-react'
import { useStudio } from '../store/useStudio'
import { totalTime } from '../lib/deriveState'
import { Button } from '../ui/Button'
import { Segmented, type SegmentedOption } from '../ui/Segmented'
import { spring } from '../design/motion'

const SPEED_OPTIONS: SegmentedOption<'0.5' | '1' | '2' | '4'>[] = [
  { value: '0.5', label: '0.5×' },
  { value: '1', label: '1×' },
  { value: '2', label: '2×' },
  { value: '4', label: '4×' },
]

export default function Transport() {
  const t = useStudio((s) => s.t)
  const playing = useStudio((s) => s.playing)
  const speed = useStudio((s) => s.speed)
  const trace = useStudio((s) => s.trace)
  const reducedMotion = useReducedMotion()

  const seekStart = useStudio((s) => s.seekStart)
  const step = useStudio((s) => s.step)
  const toggle = useStudio((s) => s.toggle)
  const seekEnd = useStudio((s) => s.seekEnd)
  const setSpeed = useStudio((s) => s.setSpeed)
  const setT = useStudio((s) => s.setT)
  const tick = useStudio((s) => s.tick)

  const total = trace ? totalTime(trace) : 0
  const atEnd = t >= total
  const disabled = !trace

  // Playback timer
  useEffect(() => {
    if (!playing) return
    const interval = setInterval(() => {
      tick()
    }, 500 / speed)
    return () => clearInterval(interval)
  }, [playing, speed, tick])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      switch (e.key) {
        case ' ':
          e.preventDefault()
          toggle()
          break
        case 'ArrowLeft':
          e.preventDefault()
          step(-1)
          break
        case 'ArrowRight':
          e.preventDefault()
          step(1)
          break
        case 'Home':
          e.preventDefault()
          seekStart()
          break
        case 'End':
          e.preventDefault()
          seekEnd()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggle, step, seekStart, seekEnd])

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 border-t border-line bg-sheet/95 backdrop-blur-sm z-50"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={reducedMotion ? { duration: 0 } : spring.snappy}
    >
      <div className="max-w-[1280px] mx-auto px-8 py-3 flex items-center gap-4">
        {/* Transport controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={seekStart}
            disabled={disabled}
            aria-label="Seek to start (Home)"
            className="h-9 w-9 px-0"
          >
            <SkipBack className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => step(-1)}
            disabled={disabled}
            aria-label="Step back (←)"
            className="h-9 w-9 px-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={toggle}
            disabled={disabled}
            aria-label={
              playing ? 'Pause (Space)' : atEnd ? 'Replay' : 'Play (Space)'
            }
            className="h-9 w-14 px-0"
          >
            {playing ? (
              <Pause className="w-4 h-4" />
            ) : atEnd ? (
              <RotateCcw className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4 ml-0.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => step(1)}
            disabled={disabled}
            aria-label="Step forward (→)"
            className="h-9 w-9 px-0"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={seekEnd}
            disabled={disabled}
            aria-label="Seek to end (End)"
            className="h-9 w-9 px-0"
          >
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>

        {/* Speed control */}
        <Segmented
          value={String(speed) as '0.5' | '1' | '2' | '4'}
          onChange={(v) => setSpeed(Number(v) as 0.5 | 1 | 2 | 4)}
          options={SPEED_OPTIONS}
          ariaLabel="Playback speed"
          className="flex-shrink-0"
        />

        {/* Timeline slider */}
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={total}
            value={t}
            step={1}
            onChange={(e) => setT(Number(e.target.value))}
            disabled={disabled}
            aria-label="Scrub timeline"
            className="w-full h-2 accent-accent rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Time readout */}
        <div className="font-mono text-sm text-muted tabular-nums flex-shrink-0">
          <span className="text-ink">{t}</span>
          <span className="text-muted"> / {total}</span>
          <span className="text-muted ml-1">ms</span>
        </div>
      </div>
    </motion.div>
  )
}
