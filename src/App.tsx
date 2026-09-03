import { useState, useEffect } from 'react'
import { Stage } from './scene/Stage'

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
        <span>Puzzle 1 of 6 · Steps</span>
      </header>
      <main className="app-main">
        <aside className="app-tray-region" aria-label="Brick tray" />
        <section className="app-board-region" aria-label="3D board stage">
          <Stage />
        </section>
        <aside className="app-views-region" aria-label="Orthographic views" />
      </main>
      <footer className="app-footer" aria-label="Toolbar">
        <span>Match all three views.</span>
      </footer>
    </div>
  )
}
