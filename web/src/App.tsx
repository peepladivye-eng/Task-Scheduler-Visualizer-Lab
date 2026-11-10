import React from 'react'
import { motion } from 'framer-motion'
import { container, rise } from './design/motion'
import { useStudio } from './store/useStudio'
import Header from './components/Header'
import ScenarioBar from './components/ScenarioBar'
import TaskEditor from './components/TaskEditor'
import Workbench from './components/Workbench'
import CpuCard from './components/CpuCard'
import ReadyQueue from './components/ReadyQueue'
import Narrator from './components/Narrator'
import PredictPanel from './components/PredictPanel'
import ProcessTable from './components/ProcessTable'
import ExecutionTerminal from './components/ExecutionTerminal'
import MetricsCards from './components/MetricsCards'
import ResultsPanel from './components/ResultsPanel'
import RaceView from './components/RaceView'
import Transport from './components/Transport'
import CommandPalette from './components/CommandPalette'
import Tour, { useTour } from './components/Tour'
import CompareView from './components/CompareView'

export default function App() {
  const [width, setWidth] = React.useState(typeof window !== 'undefined' ? window.innerWidth : 1920)
  const trace = useStudio((s) => s.trace)
  const t     = useStudio((s) => s.t)
  const view  = useStudio((s) => s.view)
  const tour  = useTour()

  // Check live mode availability from /api/health on mount
  const checkEngine = useStudio((s) => s.checkEngine)
  React.useEffect(() => { checkEngine() }, [checkEngine])

  React.useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (width < 1100) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-8">
        <div className="sheet max-w-md text-center space-y-4">
          <h2 className="text-2xl font-display font-semibold text-ink">Window Too Narrow</h2>
          <p className="text-muted">This application requires a window width of at least 1100px.</p>
          <p className="font-mono text-sm text-muted">Current: {width}px</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper pb-20">
      <Header onTourRestart={tour.restart} />

      <motion.main
        variants={container}
        initial="hidden"
        animate="show"
        className="max-w-[1280px] mx-auto px-8 py-6 flex flex-col gap-5"
      >
        <motion.div variants={rise} data-tour="scenario">
          <ScenarioBar />
        </motion.div>

        <motion.div variants={rise} data-tour="editor">
          <TaskEditor />
        </motion.div>

        {/* Compare mode */}
        {view === 'compare' && (
          <>
            <motion.div variants={rise}><RaceView /></motion.div>
            <motion.div variants={rise}><CompareView /></motion.div>
          </>
        )}

        {/* Single-run mode */}
        {view === 'single' && trace && (
          <>
            <motion.div variants={rise} data-tour="workbench">
              <Workbench trace={trace} t={t} />
            </motion.div>

            {/* Middle row: left panel + execution terminal */}
            <motion.div variants={rise}>
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-5">
                <div className="space-y-5">
                  <CpuCard />
                  <ReadyQueue />
                  <div data-tour="narrator"><Narrator /></div>
                  <PredictPanel />
                </div>
                <ExecutionTerminal />
              </div>
            </motion.div>

            <motion.div variants={rise}>
              <ProcessTable trace={trace} t={t} />
            </motion.div>

            <motion.div variants={rise}>
              <MetricsCards trace={trace} />
            </motion.div>

            <motion.div variants={rise}>
              <ResultsPanel />
            </motion.div>
          </>
        )}
      </motion.main>

      <div data-tour="transport"><Transport /></div>
      <CommandPalette />
      <Tour
        active={tour.active} step={tour.step} steps={tour.steps}
        next={tour.next} prev={tour.prev} finish={tour.finish}
      />
    </div>
  )
}
