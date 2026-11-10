import React from 'react'
import { motion } from 'framer-motion'
import { container, rise } from './design/motion'
import Header from './components/Header'
import ScenarioBar from './components/ScenarioBar'
import Transport from './components/Transport'

export default function App() {
  // Below 1100px, show responsive warning
  const [width, setWidth] = React.useState(typeof window !== 'undefined' ? window.innerWidth : 1920)
  
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
            This application requires a window width of at least 1100px. Please resize your browser or use a larger display.
          </p>
          <p className="font-mono text-sm text-muted">
            Current width: {width}px
          </p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-paper">
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
        
        <motion.div variants={rise} className="sheet">
          <p className="text-ink">
            <strong>Workbench</strong> and other components will appear here in tasks V7-V18.
          </p>
          <p className="text-muted text-sm mt-2">
            For now, this placeholder shows the app shell is working with staggered page-load animation.
          </p>
        </motion.div>
        
        <motion.div variants={rise} className="sheet">
          <p className="text-ink">
            <strong>Stage + Narrator</strong> placeholder
          </p>
        </motion.div>
        
        <motion.div variants={rise} className="sheet">
          <p className="text-ink">
            <strong>Results</strong> placeholder
          </p>
        </motion.div>
      </motion.main>
      
      <Transport />
    </div>
  )
}
