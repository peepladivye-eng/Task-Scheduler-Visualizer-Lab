import React, { useEffect } from 'react'
import { useStudio } from '../store/useStudio'
import { ALGO_LABEL, ALGO_ORDER, type Algo } from '../types/trace'
import { color, radius } from '../design/tokens'

// Tab definition: algo tabs + compare
interface TabDef {
  id: string
  label: string
}

const TABS: TabDef[] = [
  ...ALGO_ORDER.map((a) => ({ id: a, label: ALGO_LABEL[a] })),
  { id: 'compare', label: 'Compare' },
]

export default function TopBar() {
  const algo = useStudio((s) => s.algo)
  const view = useStudio((s) => s.view)
  const engineOnline = useStudio((s) => s.engineOnline)
  const setAlgo = useStudio((s) => s.setAlgo)
  const setView = useStudio((s) => s.setView)
  const checkEngine = useStudio((s) => s.checkEngine)

  // Check engine once on mount
  useEffect(() => {
    void checkEngine()
  }, [checkEngine])

  // Active tab: compare if in compare view, otherwise current algo
  const activeTab = view === 'compare' ? 'compare' : algo

  function handleTab(id: string) {
    if (id === 'compare') {
      setView('compare')
    } else if (id !== algo || view !== 'single') {
      setAlgo(id as Algo)
      setView('single')
    }
  }

  const tabBase: React.CSSProperties = {
    border: 'none',
    borderRadius: radius.control,
    padding: '4px 10px',
    fontSize: '0.78rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 160ms ease-out, color 160ms ease-out',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        width: '100%',
      }}
    >
      {/* Product name */}
      <span
        style={{
          fontWeight: 700,
          fontSize: '0.95rem',
          letterSpacing: '0.02em',
          color: color.text,
          marginRight: '8px',
          whiteSpace: 'nowrap',
        }}
      >
        Scheduler Studio
      </span>

      {/* Algo tabs */}
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {TABS.map((tab) => {
          const active = tab.id === activeTab
          return (
            <button
              key={tab.id}
              onClick={() => handleTab(tab.id)}
              aria-pressed={active}
              style={{
                ...tabBase,
                background: active ? color.accent : 'transparent',
                color: active ? color.bg : color.muted,
                fontWeight: active ? 700 : 500,
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Engine status dot */}
      <div
        title={engineOnline ? 'Engine online' : 'Engine offline'}
        aria-label={engineOnline ? 'Engine online' : 'Engine offline'}
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: engineOnline ? color.success : color.danger,
          flexShrink: 0,
          cursor: 'default',
        }}
      />
    </div>
  )
}
