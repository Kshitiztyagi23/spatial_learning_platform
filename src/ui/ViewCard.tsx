import type { ViewName } from '../core/types'

interface ViewCardProps {
  name: ViewName
  grid: boolean[][]
  isMatch: boolean | null
}

const VIEW_LABELS: Record<ViewName, string> = {
  front: 'Front',
  right: 'Right',
  top: 'Top',
}

export function ViewCard({ name, grid, isMatch }: ViewCardProps) {
  const label = VIEW_LABELS[name]

  // Card border styling: default 1px --rule; after check 2px --match or --miss
  let borderColor = 'var(--rule)'
  let borderWidth = '1px'

  if (isMatch !== null) {
    borderWidth = '2px'
    borderColor = isMatch ? 'var(--match)' : 'var(--miss)'
  }

  const numCols = grid[0]?.length ?? 0

  return (
    <div
      className="view-card-wrapper"
      data-view={name}
      aria-label={`${label} view card`}
    >
      <div
        className="view-card"
        style={{
          border: `${borderWidth} solid ${borderColor}`,
        }}
      >
        <div
          className="view-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${numCols}, 22px)`,
            gap: '3px',
          }}
          role="grid"
          aria-readonly="true"
        >
          {grid.map((row, r) =>
            row.map((filled, c) => (
              <div
                key={`${r}-${c}`}
                className={`view-cell ${filled ? 'filled' : 'empty'}`}
                aria-label={`Row ${r + 1} Col ${c + 1} ${filled ? 'filled' : 'empty'}`}
              />
            ))
          )}
        </div>
      </div>

      <div className="view-card-footer">
        <span className="view-card-label">{label}</span>
        {isMatch !== null && (
          <span
            className={`view-card-status ${isMatch ? 'match' : 'miss'}`}
          >
            {isMatch ? 'Match' : 'Miss'}
          </span>
        )}
      </div>
    </div>
  )
}
