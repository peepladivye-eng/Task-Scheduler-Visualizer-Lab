import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useDerived } from '../store/useStudio'
import { color, motion as motionTokens } from '../design/tokens'
import { pidColor } from '../design/pidColor'

export default function ReadyQueue() {
  const derived = useDerived()

  if (!derived) {
    return (
      <span style={{ color: color.muted, fontSize: '0.82rem' }}>ΓÇö</span>
    )
  }

  const queue = derived.readyQueue

  if (queue.length === 0) {
    return (
      <span style={{ color: color.muted, fontSize: '0.82rem' }}>queue empty</span>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      <AnimatePresence initial={false}>
        {queue.map((pid, index) => {
          const pc = pidColor(pid)
          return (
            <motion.div
              key={pid}
              layout
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={motionTokens.spring}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              {/* "next" label above first chip */}
              {index === 0 && (
                <span
                  style={{
                    fontSize: '0.62rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: color.accent,
                    fontWeight: 600,
                    paddingLeft: '2px',
                  }}
                >
                  next
                </span>
              )}
              {/* PID chip */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: `${pc}22`,
                  border: `1px solid ${pc}66`,
                  color: pc,
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  fontFamily: '"JetBrains Mono", Consolas, monospace',
                  alignSelf: 'flex-start',
                  minWidth: '48px',
                }}
              >
                P{pid}
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
