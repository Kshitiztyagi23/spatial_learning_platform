import { Canvas } from '@react-three/fiber'
import { AxisCamera } from '../scene/AxisCamera'
import { PlacedBricks } from '../scene/PlacedBricks'
import { axisCameraFor } from '../scene/axisView'
import type { BoardSize, Placement, ViewName } from '../core/types'

interface ViewCardProps {
  name: ViewName
  board: BoardSize
  solution: Placement[]
  monochrome?: boolean
  isMatch: boolean | null
}

const VIEW_LABELS: Record<ViewName, string> = {
  front: 'Front',
  right: 'Right',
  top: 'Top',
}

// World units to card pixels, then capped — keeps the aspect ratio true to
// the board (no stretching) without letting a big board blow up the card.
const UNIT_PX = 24
const MAX_PX = 220

function cardSize(halfWidth: number, halfHeight: number): { width: number; height: number } {
  const rawWidth = halfWidth * 2 * UNIT_PX
  const rawHeight = halfHeight * 2 * UNIT_PX
  const scale = Math.min(1, MAX_PX / Math.max(rawWidth, rawHeight))
  return { width: Math.round(rawWidth * scale), height: Math.round(rawHeight * scale) }
}

export function ViewCard({ name, board, solution, monochrome = false, isMatch }: ViewCardProps) {
  const label = VIEW_LABELS[name]

  // Card border styling: default 1px --rule; after check 2px --match or --miss
  let borderColor = 'var(--rule)'
  let borderWidth = '1px'

  if (isMatch !== null) {
    borderWidth = '2px'
    borderColor = isMatch ? 'var(--match)' : 'var(--miss)'
  }

  const { halfWidth, halfHeight } = axisCameraFor(name, board)
  const { width, height } = cardSize(halfWidth, halfHeight)

  return (
    <div
      className="view-card-wrapper"
      data-view={name}
      aria-label={`${label} view card — the solid as it looks from this side`}
    >
      <div
        className="view-card"
        style={{
          border: `${borderWidth} solid ${borderColor}`,
        }}
      >
        {/* frameloop="demand": renders once on mount/change, then idles —
            this card never orbits, so there is nothing to keep redrawing. */}
        <Canvas
          frameloop="demand"
          gl={{ antialias: true, alpha: true }}
          style={{ width, height, display: 'block' }}
        >
          <ambientLight intensity={0.85} />
          <directionalLight position={[6, 12, 8]} intensity={0.45} color="#FFFFFF" />
          <AxisCamera view={name} board={board} />
          <PlacedBricks placements={solution} monochrome={monochrome} />
        </Canvas>
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
