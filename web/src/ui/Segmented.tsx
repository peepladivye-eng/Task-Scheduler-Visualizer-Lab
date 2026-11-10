import React, { useId, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { spring } from '../design/motion'
import { cn } from '../lib/cn'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  hint?: string
}

export interface SegmentedProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: SegmentedOption<T>[]
  ariaLabel: string
  className?: string
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
}: SegmentedProps<T>) {
  const layoutId = useId()
  const groupRef = useRef<HTMLDivElement>(null)

  // Keyboard navigation
  useEffect(() => {
    const group = groupRef.current
    if (!group) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const currentIndex = options.findIndex((opt) => opt.value === value)
      let nextIndex = currentIndex

      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        nextIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        nextIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0
      }

      if (nextIndex !== currentIndex) {
        onChange(options[nextIndex].value)
      }
    }

    group.addEventListener('keydown', handleKeyDown)
    return () => group.removeEventListener('keydown', handleKeyDown)
  }, [value, options, onChange])

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex p-1 bg-chip border border-line rounded-lg relative',
        className
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value
        return (
          <button
            key={option.value}
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative z-10 px-4 py-2 text-sm font-medium rounded-md transition-colors',
              isActive ? 'text-on-accent' : 'text-ink hover:text-accent'
            )}
            title={option.hint}
          >
            {isActive && (
              <motion.div
                layoutId={layoutId}
                className="absolute inset-0 bg-accent rounded-md -z-10"
                transition={spring.snappy}
              />
            )}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
