import React from 'react'
import { Radio, Zap, Clock, Cpu, Play, Square } from 'lucide-react'
import { useStudio } from '../store/useStudio'

export default function LiveControls() {
  const liveMode = useStudio((s) => s.liveMode)
  const liveModeAvailable = useStudio((s) => s.liveModeAvailable)
  const ipc = useStudio((s) => s.ipc)
  const workUs = useStudio((s) => s.workUs)
  const tickMs = useStudio((s) => s.tickMs)
  const liveRunning = useStudio((s) => s.liveRunning)
  const error = useStudio((s) => s.error)

  const setLiveMode = useStudio((s) => s.setLiveMode)
  const setIpc = useStudio((s) => s.setIpc)
  const setWorkUs = useStudio((s) => s.setWorkUs)
  const setTickMs = useStudio((s) => s.setTickMs)
  const runLive = useStudio((s) => s.runLive)

  if (!liveModeAvailable) {
    return (
      <div className="sheet p-4">
        <div className="flex items-center gap-2 mb-2">
          <Radio className="w-4 h-4 text-muted" />
          <h3 className="font-display font-semibold text-ink text-lg">Real Process Mode</h3>
        </div>
        <p className="text-sm text-muted">
          Requires Linux/WSL2. Run the server with <code className="font-mono text-xs bg-ink/10 px-1 rounded">node server.js</code> inside WSL.
        </p>
      </div>
    )
  }

  return (
    <div className="sheet p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Radio className={`w-4 h-4 ${liveMode ? 'text-good' : 'text-muted'}`} />
        <h3 className="font-display font-semibold text-ink text-lg">Real Process Mode</h3>
        <label className="ml-auto inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={liveMode}
            onChange={(e) => setLiveMode(e.target.checked)}
            className="sr-only"
          />
          <div className={`w-10 h-5 rounded-full transition-colors ${liveMode ? 'bg-good' : 'bg-ink/20'}`}>
            <div className={`w-4 h-4 rounded-full bg-white transition-transform mt-0.5 ${liveMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
        </label>
      </div>

      {liveMode && (
        <>
          <p className="text-xs text-muted">
            Press Run live to execute with real fork() child processes on Linux. Edits auto-update the simulate preview.
          </p>

          {/* Mechanism selector */}
          <div>
            <label className="text-xs font-mono text-muted block mb-1">IPC Mechanism</label>
            <div className="flex gap-1">
              <button
                onClick={() => setIpc('signal')}
                className={`flex-1 px-3 py-1.5 text-xs font-mono rounded border transition-colors ${
                  ipc === 'signal'
                    ? 'bg-good/10 border-good text-good'
                    : 'bg-ink/5 border-ink/10 text-muted hover:bg-ink/10'
                }`}
              >
                Signals (SIGSTOP/SIGCONT)
              </button>
              <button
                onClick={() => setIpc('pipe')}
                className={`flex-1 px-3 py-1.5 text-xs font-mono rounded border transition-colors ${
                  ipc === 'pipe'
                    ? 'bg-good/10 border-good text-good'
                    : 'bg-ink/5 border-ink/10 text-muted hover:bg-ink/10'
                }`}
              >
                Pipes
              </button>
            </div>
          </div>

          {/* Tick length */}
          <div>
            <label className="text-xs font-mono text-muted block mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Tick Length (ms)
            </label>
            <div className="flex gap-1">
              {[0, 100, 200, 400].map((v) => (
                <button
                  key={v}
                  onClick={() => setTickMs(v)}
                  className={`flex-1 px-2 py-1 text-xs font-mono rounded border transition-colors ${
                    tickMs === v
                      ? 'bg-accent/10 border-accent text-accent'
                      : 'bg-ink/5 border-ink/10 text-muted hover:bg-ink/10'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Work per tick */}
          <div>
            <label className="text-xs font-mono text-muted block mb-1 flex items-center gap-1">
              <Cpu className="w-3 h-3" /> Work per Tick (µs)
            </label>
            <div className="flex gap-1">
              {[0, 200, 1000, 5000].map((v) => (
                <button
                  key={v}
                  onClick={() => setWorkUs(v)}
                  className={`flex-1 px-2 py-1 text-xs font-mono rounded border transition-colors ${
                    workUs === v
                      ? 'bg-accent/10 border-accent text-accent'
                      : 'bg-ink/5 border-ink/10 text-muted hover:bg-ink/10'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Run / Cancel */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => runLive()}
              disabled={liveRunning}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors ${
                liveRunning
                  ? 'bg-ink/10 text-muted cursor-not-allowed'
                  : 'bg-good text-white hover:bg-good/90'
              }`}
            >
              <Play className="w-4 h-4" />
              {liveRunning ? 'Running…' : 'Run live'}
            </button>
          </div>

          {error && (
            <div className="text-xs text-warn bg-warn/10 border border-warn/30 rounded p-2 font-mono">
              {error}
            </div>
          )}
        </>
      )}
    </div>
  )
}
