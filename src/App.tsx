import { useState, useEffect, useMemo } from 'react'
import { loadPuzzles } from './core/puzzle'
import { PuzzleBar } from './ui/PuzzleBar'
import { Tray } from './ui/Tray'
import { Stage } from './scene/Stage'
import { ViewsRow } from './ui/ViewsRow'
import { Toolbar } from './ui/Toolbar'
import { Feedback } from './ui/Feedback'

export default function App() {
  const allPuzzles = useMemo(() => loadPuzzles(), [])

  const [isSupportedScreen, setIsSupportedScreen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024
    }
    return true
  })

  useEffect(() => {
    const handleResize = () => {
      setIsSupportedScreen(window.innerWidth >= 1024)
    }
    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (!isSupportedScreen) {
    return (
      <div className="screen-fallback">
        Open this on a larger screen.
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="app-header" aria-label="Puzzle header">
        <PuzzleBar allPuzzles={allPuzzles} />
      </header>

      <main className="app-main">
        <aside className="app-tray-region" aria-label="Brick tray">
          <Tray />
        </aside>
        <section className="app-board-region" aria-label="3D board stage">
          <Stage />
          <Feedback />
        </section>
        <aside className="app-views-region" aria-label="Orthographic views">
          <ViewsRow />
        </aside>
      </main>

      <footer className="app-footer" aria-label="Toolbar">
        <Toolbar allPuzzles={allPuzzles} />
      </footer>
    </div>
  )
}
