import React, { useEffect, useRef } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Button } from './Button'
import { cn } from '../lib/cn'

export interface StepperProps {
  value: number
  min: number
  max: number
  onChange: (value: number)  => void
  label: string
  disabled?: boolean
  unit?: string
  className?: string
}

export function Stepper({
  value,
  min,
  max,
  onChange,
  label,
  disabled = false,
  unit,
  className,
}: StepperProps) {
  const repeatTimeoutRef = useRef<NodeJS.Timeout>()
  const repeatIntervalRef = useRef<NodeJS.Timeout>()

  const handleChange = (delta: number) => {
    const newValue = Math.min(max, Math.max(min, value + delta))
    if (newValue !== value) {
      onChange(newValue)
    }
  }

  const startRepeat = (delta: number) => {
    handleChange(delta)
    repeatTimeoutRef.current = setTimeout(() => {
      repeatIntervalRef.current = setInterval(() => {
        handleChange(delta)
      }, 80)
    }, 400)
  }

  const stopRepeat = () => {
    if (repeatTimeoutRef.current) {
      clearTimeout(repeatTimeoutRef.current)
      repeatTimeoutRef.current = undefined
    }
    if (repeatIntervalRef.current) {
      clearInterval(repeatIntervalRef.current)
      repeatIntervalRef.current = undefined
    }
  }

  useEffect(() => {
    return () => {
      stopRepeat()
    }
  }, [])

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <Button
        size="sm"
        variant="subtle"
        onClick={() => handleChange(-1)}
        onMouseDown={() => startRepeat(-1)}
        onMouseUp={stopRepeat}
        onMouseLeave={stopRepeat}
        disabled={disabled || value <= min}
        aria-label={`Decrease ${label}`}
      >
        <Minus className="w-4 h-4" />
      </Button>

      <div
        className="font-mono text-sm font-semibold text-ink min-w-[3rem] text-center"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
      >
        {value}
        {unit && <span className="text-muted ml-1">{unit}</span>}
      </div>

      <Button
        size="sm"
        variant="subtle"
        onClick={() => handleChange(1)}
        onMouseDown={() => startRepeat(1)}
        onMouseUp={stopRepeat}
        onMouseLeave={stopRepeat}
        disabled={disabled || value >= max}
        aria-label={`Increase ${label}`}
      >
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  )
}
