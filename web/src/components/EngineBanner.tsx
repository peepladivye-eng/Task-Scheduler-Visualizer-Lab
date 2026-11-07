import React from 'react'
import { useStudio } from '../store/useStudio'
import { color, radius } from '../design/tokens'

export default function EngineBanner() {
  const engineOnline = useStudio((s) => s.engineOnline)
  const error        = useStudio((s) => s.error)
  const status       = useStudio((s) => s.status)
  const checkEngine  = useStudio((s) => s.checkEngine)
  const setError     = useStudio((s) => s.setError)

  // Nothing to show when everything is fine
  if (engineOnline && !error) return null

  // Engine offline banner
  if (!engineOnline) {
    return (
      <div
        style={{
          background: `${color.warn}15`,
          border: `1px solid ${color.warn}44`,
          borderRadius: radius.control,
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '0.82rem',
          color: color.warn,
        }}
      >
        <span style={{ flex: 1 }}>
          Engine offline. Showing preset traces. Start it with:{' '}
          <code style={{
            fontFamily: '"JetBrains Mono", Consolas, monospace',
            background: `${color.warn}22`,
            padding: '1px 4px',
            borderRadius: '3px',
          }}>
            node server.js
          </code>
        </span>
        <button
          onClick={() => void checkEngine()}
          aria-label="Retry connecting to engine"
          style={{
            background: `${color.warn}22`,
            border: `1px solid ${color.warn}66`,
            borderRadius: radius.control,
            padding: '4px 10px',
            color: color.warn,
            cursor: 'pointer',
            fontSize: '0.78rem',
            fontFamily: 'inherit',
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  // Engine error banner (engine is online but returned an error)
  if (error && status === 'error') {
    return (
      <div
        style={{
          background: `${color.danger}15`,
          border: `1px solid ${color.danger}44`,
          borderRadius: radius.control,
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '0.82rem',
          color: color.danger,
        }}
      >
        <span style={{ flex: 1 }}>Engine error: {error}</span>
        <button
          onClick={() => setError(null)}
          aria-label="Dismiss error"
          style={{
            background: `${color.danger}22`,
            border: `1px solid ${color.danger}66`,
            borderRadius: radius.control,
            padding: '4px 10px',
            color: color.danger,
            cursor: 'pointer',
            fontSize: '0.78rem',
            fontFamily: 'inherit',
          }}
        >
          Dismiss
        </button>
      </div>
    )
  }

  return null
}
