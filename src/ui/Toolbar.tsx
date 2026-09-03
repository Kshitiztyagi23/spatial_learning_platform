import { useSession } from '../state/session'
import type { CheckOutcome, Puzzle } from '../core/types'

interface ToolbarProps {
  allPuzzles: Puzzle[]
}

const CHECK_MESSAGES: Record<CheckOutcome, string> = {
  empty: 'Place some bricks first.',
  'views-mismatch': 'Check the views marked in orange.',
  'hidden-brick': 'The views match, but a brick is missing inside.',
  solved: "That's the shape.",
}

export function Toolbar({ allPuzzles }: ToolbarProps) {
  const mode = useSession((state) => state.mode)
  const lastCheck = useSession((state) => state.lastCheck)
  const currentPuzzle = useSession((state) => state.derived.puzzle)
  const rotateCW = useSession((state) => state.rotateCW)
  const runCheck = useSession((state) => state.runCheck)
  const loadPuzzle = useSession((state) => state.loadPuzzle)

  const isSolved = lastCheck?.outcome === 'solved'

  const handleNext = () => {
    const currentIndex = allPuzzles.findIndex((p) => p.id === currentPuzzle.id)
    const nextIndex = (currentIndex + 1) % allPuzzles.length
    const nextPuzzle = allPuzzles[nextIndex]
    if (nextPuzzle) {
      loadPuzzle(nextPuzzle.id)
    }
  }

  // Determine center feedback message
  let feedbackMessage = 'Match all three views.'
  if (lastCheck) {
    feedbackMessage = CHECK_MESSAGES[lastCheck.outcome] ?? feedbackMessage
  }

  return (
    <div className="toolbar">
      {/* Left controls: Rotate and Mode segmented buttons */}
      <div className="toolbar-left">
        <button
          type="button"
          className="toolbar-button"
          onClick={rotateCW}
          aria-label="Rotate brick 90 degrees"
        >
          Rotate
        </button>

        <div className="mode-segmented-group" role="radiogroup" aria-label="Tool mode">
          <button
            type="button"
            className={`mode-button ${mode === 'build' ? 'active' : ''}`}
            onClick={() => useSession.setState({ mode: 'build' })}
            role="radio"
            aria-checked={mode === 'build'}
          >
            Build
          </button>
          <button
            type="button"
            className={`mode-button ${mode === 'erase' ? 'active' : ''}`}
            onClick={() => useSession.setState({ mode: 'erase' })}
            role="radio"
            aria-checked={mode === 'erase'}
          >
            Erase
          </button>
        </div>
      </div>

      {/* Center: Feedback text string */}
      <div className="toolbar-center">
        <span
          className={`feedback-message ${lastCheck ? lastCheck.outcome : ''}`}
          aria-live="polite"
        >
          {feedbackMessage}
        </span>
      </div>

      {/* Right: Check or Next puzzle button */}
      <div className="toolbar-right">
        {isSolved ? (
          <button
            type="button"
            className="next-puzzle-button"
            onClick={handleNext}
            aria-label="Next puzzle"
          >
            Next puzzle
          </button>
        ) : (
          <button
            type="button"
            className="check-button"
            onClick={runCheck}
            aria-label="Check solution against views"
          >
            Check
          </button>
        )}
      </div>
    </div>
  )
}
