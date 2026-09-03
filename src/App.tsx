import { useState, useEffect } from 'react'
import { useSession } from './state/session'
import { PuzzleBar } from './ui/PuzzleBar'
import { Tray } from './ui/Tray'
import { Stage } from './scene/Stage'
import { ViewsRow } from './ui/ViewsRow'
import { Toolbar } from './ui/Toolbar'
import { Feedback } from './ui/Feedback'

export default function App() {
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return

      const { rotateCW, selectType, runCheck, nextPuzzle, prevPuzzle, mode } = useSession.getState()

      switch (e.key) {
        case 'r':
        case 'R':
          rotateCW()
          break
        case '1':
          selectType('2x2')
          break
        case '2':
          selectType('2x3')
          break
        case '3':
          selectType('2x4')
          break
        case 'e':
        case 'E':
          useSession.setState({ mode: mode === 'build' ? 'erase' : 'build' })
          break
        case 'Enter':
          runCheck()
          break
        case 'ArrowLeft':
          prevPuzzle()
          break
        case 'ArrowRight':
          nextPuzzle()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
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
        <PuzzleBar />
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
        <Toolbar />
      </footer>
    </div>
  )
}
