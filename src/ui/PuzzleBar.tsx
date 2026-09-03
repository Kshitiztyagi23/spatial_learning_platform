import { useSession } from '../state/session'
import type { Puzzle } from '../core/types'

interface PuzzleBarProps {
  allPuzzles: Puzzle[]
}

export function PuzzleBar({ allPuzzles }: PuzzleBarProps) {
  const puzzle = useSession((state) => state.derived.puzzle)
  const clearBoard = useSession((state) => state.clearBoard)

  const puzzleIndex = allPuzzles.findIndex((p) => p.id === puzzle.id)
  const puzzleCount = allPuzzles.length

  return (
    <div className="puzzle-bar">
      <div className="puzzle-title-group">
        <span className="puzzle-name">{puzzle.name}</span>
        <span className="puzzle-counter">
          Puzzle {puzzleIndex >= 0 ? puzzleIndex + 1 : 1} of {puzzleCount}
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
