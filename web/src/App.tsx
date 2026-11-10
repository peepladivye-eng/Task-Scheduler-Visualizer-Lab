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
import ProcessTable from './components/ProcessTable'
import EventLog from './components/EventLog'
import MetricsCards from './components/MetricsCards'
import Transport from './components/Transport'

export default function App() {
  const [width, setWidth] = React.useState(typeof window !== 'undefined' ? window.innerWidth : 1920)
  const trace = useStudio((s) => s.trace)
  const t = useStudio((s) => s.t)
  const state = useStudio((s) => s.state)
  
  React.useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  if (width < 1100) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-8">
        <div className="sheet max-w-md text-center space-y-4">
          <h2 className="text-2xl font-display font-semibold text-ink">
            Window Too Narrow
          </h2>
          <p className="text-muted">
            This application requires a window width of at least 1100px.
          </p>
          <p className="font-mono text-sm text-muted">
            Current: {width}px
          </p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-paper pb-20">
      <Header />
      
      <motion.main
        variants={container}
        initial="hidden"
        animate="show"
        className="max-w-[1280px] mx-auto px-8 py-6 flex flex-col gap-5"
      >
        <motion.div variants={rise}>
          <ScenarioBar />
        </motion.div>
        
        <motion.div variants={rise}>
          <TaskEditor />
        </motion.div>
        
        {trace && (
          <>
            <motion.div variants={rise}>
              <Workbench trace={trace} t={t} />
            </motion.div>
            
            <motion.div variants={rise}>
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-5">
                <div className="space-y-5">
                  <CpuCard state={state} />
                  <ReadyQueue state={state} />
                </div>
                <EventLog trace={trace} t={t} />
              </div>
            </motion.div>
            
            <motion.div variants={rise}>
              <ProcessTable trace={trace} t={t} />
            </motion.div>
            
            <motion.div variants={rise}>
              <MetricsCards trace={trace} />
            </motion.div>
          </>
        )}
      </motion.main>
      
      <Transport />
    </div>
  )
}
