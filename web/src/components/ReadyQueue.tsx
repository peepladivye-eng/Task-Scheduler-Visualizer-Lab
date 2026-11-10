import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useFocus, focusProps, dimClass } from '../store/useFocus'
import { useDerived } from '../store/useStudio'
import { spring } from '../design/motion'

const PID_COLORS = [
  '#6ea8fe', '#3ddc97', '#ffb454', '#ff6b9d', '#b794f6',
  '#4fd1c5', '#f6e05e', '#fc8181', '#90cdf4', '#a3e635',
]

function getPidColor(pid: number): string {
  return PID_COLORS[(pid - 1) % 10]
}

export default function ReadyQueue() {
  const state = useDerived()
  const focusPid = useFocus((s) => s.pid)

  if (!state) {
    return (
      <div className="sheet space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent" />
          <h3 className="font-display font-semibold text-ink text-lg">Ready Queue</h3>
        </div>
        <div className="text-muted text-sm">—</div>
      </div>
    )
  }

  const queue = state.readyQueue

  return (
    <div className="sheet space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-accent" />
        <h3 className="font-display font-semibold text-ink text-lg">Ready Queue</h3>
      </div>

      {queue.length === 0 ? (
        <div className="text-muted text-sm">queue empty</div>
      ) : (
        <div className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {queue.map((pid, index) => {
              const color = getPidColor(pid)
              return (
                <motion.div
                  key={pid}
                  layoutId={`process-chip-${pid}`}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12, transition: { duration: 0.2 } }}
                  transition={spring.snappy}
                  className={`relative ${dimClass(focusPid, pid)}`}
                  {...focusProps(pid)}
                >
                  {/* "next" label for first item */}
                  {index === 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs font-semibold uppercase tracking-wider text-accent mb-1"
                    >
                      next
                    </motion.div>
                  )}
                  
                  {/* Process chip */}
                  <motion.div
                    className="inline-flex items-center px-3 py-1.5 rounded-lg font-mono font-bold text-sm"
                    style={{
                      backgroundColor: `${color}22`,
                      border: `1px solid ${color}88`,
                      color: color,
                    }}
                  >
                    P{pid}
                  </motion.div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
