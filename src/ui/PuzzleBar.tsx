import { useSession } from '../state/session'

export function PuzzleBar() {
  const puzzleName = useSession((state) => state.derived.puzzle.name)
  const puzzleIndex = useSession((state) => state.puzzleIndex)
  const puzzleCount = useSession((state) => state.puzzleCount)
  const prevPuzzle = useSession((state) => state.prevPuzzle)
  const nextPuzzle = useSession((state) => state.nextPuzzle)

  return (
    <div className="puzzle-bar">
      <div className="puzzle-title-group">
        <span className="puzzle-name">{puzzleName}</span>
        <span className="puzzle-counter">
          Puzzle {puzzleIndex + 1} of {puzzleCount}
        </span>
      </div>

      <div className="puzzle-nav" role="group" aria-label="Change puzzle">
        <button
          type="button"
          className="puzzle-nav-button"
          onClick={prevPuzzle}
          aria-label="Previous puzzle"
        >
          ‹
        </button>
        <button
          type="button"
          className="puzzle-nav-button"
          onClick={nextPuzzle}
          aria-label="Next puzzle"
        >
          ›
        </button>
      </div>
    </div>
  )
}
