import { useState, useEffect, useMemo } from 'react'
import { useSession } from './state/session'
import { loadPuzzles } from './core/puzzle'
import { Tray } from './ui/Tray'
import { ViewsRow } from './ui/ViewsRow'
import { Stage } from './scene/Stage'

export default function App() {
  const puzzle = useSession((state) => state.derived.puzzle)
  const allPuzzles = useMemo(() => loadPuzzles(), [])
  const puzzleIndex = allPuzzles.findIndex((p) => p.id === puzzle.id)
  const puzzleCount = allPuzzles.length

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

    document.fonts.ready.then(() => {
      const isLoaded = document.fonts.check('16px "Atkinson Hyperlegible Next Variable"')
      const el = document.querySelector('.puzzle-name')
      const computedFamily = el ? window.getComputedStyle(el).fontFamily : 'null'
      console.log('[FONT_VERIFICATION]', JSON.stringify({
        isLoaded,
        fontsSize: document.fonts.size,
        computedFamily,
        fontFaces: Array.from(document.fonts).map(f => `${f.family} (${f.status})`)
      }))
    })

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
        <div className="puzzle-title-group">
          <span className="puzzle-name">{puzzle.name}</span>
          <span className="puzzle-counter">Puzzle {puzzleIndex + 1} of {puzzleCount}</span>
        </div>
      </header>
      <main className="app-main">
        <aside className="app-tray-region" aria-label="Brick tray">
          <Tray />
        </aside>
        <section className="app-board-region" aria-label="3D board stage">
          <Stage />
        </section>
        <aside className="app-views-region" aria-label="Orthographic views">
          <ViewsRow />
        </aside>
      </main>
      <footer className="app-footer" aria-label="Toolbar">
        <span>Match all three views.</span>
      </footer>
    </div>
  )
}
