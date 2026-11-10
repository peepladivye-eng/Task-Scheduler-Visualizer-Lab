import React from 'react'
import { Command } from 'cmdk'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward,
  Search,
  Sun,
  Moon,
  Palette,
  Zap,
} from 'lucide-react'
import { useStudio } from '../store/useStudio'
import { useTheme } from '../store/useTheme'
import { PRESETS } from '../lib/presets.generated'
import { spring } from '../design/motion'

export default function CommandPalette() {
  const [open, setOpen] = React.useState(false)
  const trace = useStudio((s) => s.trace)
  const playing = useStudio((s) => s.playing)
  const toggle = useStudio((s) => s.toggle)
  const seekStart = useStudio((s) => s.seekStart)
  const seekEnd = useStudio((s) => s.seekEnd)
  const loadPreset = useStudio((s) => s.loadPreset)
  const setSpeed = useStudio((s) => s.setSpeed)
  
  const { mode, setMode, accent, setAccent } = useTheme()

  // Keyboard shortcut to open
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const handleCommand = (callback: () => void) => {
    callback()
    setOpen(false)
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-[100]"
              onClick={() => setOpen(false)}
            />
            
            {/* Command palette */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={spring.snappy}
              className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl z-[101]"
            >
              <Command className="sheet rounded-xl overflow-hidden shadow-2xl">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-line">
                  <Search className="w-4 h-4 text-muted" />
                  <Command.Input
                    placeholder="Type a command or search..."
                    className="flex-1 bg-transparent outline-none text-ink placeholder:text-muted text-sm"
                  />
                  <kbd className="px-2 py-1 text-xs font-mono bg-chip rounded border border-line text-muted">
                    ESC
                  </kbd>
                </div>

                <Command.List className="max-h-[400px] overflow-y-auto p-2">
                  <Command.Empty className="py-6 text-center text-sm text-muted">
                    No results found.
                  </Command.Empty>

                  {/* Playback commands */}
                  {trace && (
                    <Command.Group heading="Playback" className="mb-3">
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted uppercase tracking-wider">
                        Playback
                      </div>
                      <Command.Item
                        onSelect={() => handleCommand(toggle)}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-accent/10 data-[selected=true]:text-accent"
                      >
                        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        <span className="flex-1">{playing ? 'Pause' : 'Play'}</span>
                        <kbd className="px-2 py-1 text-xs font-mono bg-chip rounded border border-line">
                          Space
                        </kbd>
                      </Command.Item>
                      <Command.Item
                        onSelect={() => handleCommand(seekStart)}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-accent/10 data-[selected=true]:text-accent"
                      >
                        <SkipBack className="w-4 h-4" />
                        <span className="flex-1">Seek to start</span>
                        <kbd className="px-2 py-1 text-xs font-mono bg-chip rounded border border-line">
                          Home
                        </kbd>
                      </Command.Item>
                      <Command.Item
                        onSelect={() => handleCommand(seekEnd)}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-accent/10 data-[selected=true]:text-accent"
                      >
                        <SkipForward className="w-4 h-4" />
                        <span className="flex-1">Seek to end</span>
                        <kbd className="px-2 py-1 text-xs font-mono bg-chip rounded border border-line">
                          End
                        </kbd>
                      </Command.Item>
                    </Command.Group>
                  )}

                  {/* Speed commands */}
                  {trace && (
                    <Command.Group heading="Speed" className="mb-3">
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted uppercase tracking-wider">
                        Speed
                      </div>
                      {[0.5, 1, 2, 4].map((s) => (
                        <Command.Item
                          key={s}
                          onSelect={() => handleCommand(() => setSpeed(s as 0.5 | 1 | 2 | 4))}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-accent/10 data-[selected=true]:text-accent"
                        >
                          <Zap className="w-4 h-4" />
                          <span className="flex-1">Set speed to {s}×</span>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}

                  {/* Presets */}
                  <Command.Group heading="Presets" className="mb-3">
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted uppercase tracking-wider">
                      Load Preset
                    </div>
                    {PRESETS.map((preset) => (
                      <Command.Item
                        key={preset.id}
                        onSelect={() => handleCommand(() => loadPreset(preset.id))}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-accent/10 data-[selected=true]:text-accent"
                      >
                        <div className="flex-1">
                          <div className="font-medium">{preset.name}</div>
                          <div className="text-xs text-muted">
                            {preset.algo.toUpperCase()} • {preset.processes.length} processes
                          </div>
                        </div>
                      </Command.Item>
                    ))}
                  </Command.Group>

                  {/* Theme commands */}
                  <Command.Group heading="Theme">
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted uppercase tracking-wider">
                      Appearance
                    </div>
                    <Command.Item
                      onSelect={() => handleCommand(() => setMode('light'))}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-accent/10 data-[selected=true]:text-accent"
                    >
                      <Sun className="w-4 h-4" />
                      <span className="flex-1">Light mode</span>
                    </Command.Item>
                    <Command.Item
                      onSelect={() => handleCommand(() => setMode('dark'))}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-accent/10 data-[selected=true]:text-accent"
                    >
                      <Moon className="w-4 h-4" />
                      <span className="flex-1">Dark mode</span>
                    </Command.Item>
                    {(['blue', 'green', 'orange', 'purple'] as const).map((color) => (
                      <Command.Item
                        key={color}
                        onSelect={() => handleCommand(() => setAccent(color))}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-accent/10 data-[selected=true]:text-accent"
                      >
                        <Palette className="w-4 h-4" />
                        <span className="flex-1 capitalize">{color} accent</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                </Command.List>
              </Command>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
