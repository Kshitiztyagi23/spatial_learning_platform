import { useSession } from '../state/session'

export function PuzzleBar() {
  const puzzleName = useSession((state) => state.derived.puzzle.name)
  const puzzleIndex = useSession((state) => state.puzzleIndex)
  const puzzleCount = useSession((state) => state.puzzleCount)
  const clearBoard = useSession((state) => state.clearBoard)

  return (
    <div className="puzzle-bar">
      <div className="puzzle-title-group">
        <span className="puzzle-name">{puzzleName}</span>
        <span className="puzzle-counter">
          Puzzle {puzzleIndex + 1} of {puzzleCount}
        </span>
      </div>

      <button
        type="button"
        className="reset-button"
        onClick={clearBoard}
        aria-label="Reset board"
      >
        Reset
      </button>
    </div>
  )
}
