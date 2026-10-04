import { useMemo } from 'react'
import { useSession } from '../state/session'
import { canPlace } from '../core/placement'
import { footprintFor, originForPivot } from '../core/geometry'
import type { Vec3 } from '../core/types'

interface GhostBrickProps {
  candidate: Vec3 | null
}

const noopRaycast = () => {}

export function GhostBrick({ candidate }: GhostBrickProps) {
  const selectedType = useSession((state) => state.selectedType)
  const rotation = useSession((state) => state.rotation)
  const placed = useSession((state) => state.placed)
  const board = useSession((state) => state.derived.puzzle.board)
  const remaining = useSession((state) => state.remaining)
  const mode = useSession((state) => state.mode)

  const isVisible = Boolean(
    candidate && selectedType && mode === 'build' && remaining[selectedType] > 0
  )

  const { w, d } = useMemo(() => {
    if (!selectedType) return { w: 1, d: 1 }
    return footprintFor(selectedType, rotation)
  }, [selectedType, rotation])

  const studPositions = useMemo(() => {
    const positions: [number, number, number][] = []
    for (let dx = 0; dx < w; dx++) {
      for (let dz = 0; dz < d; dz++) {
        const localX = dx - (w - 1) / 2
        const localZ = dz - (d - 1) / 2
        positions.push([localX, 0.57, localZ])
      }
    }
    return positions
  }, [w, d])

  if (!isVisible || !candidate || !selectedType) {
    return null
  }

  // candidate is the fixed pivot cell; each rotation sweeps the footprint into
  // a different quadrant around it rather than spinning in place (see originForPivot)
  const origin = originForPivot(selectedType, rotation, candidate)

  // Ask store canPlace path to determine legality — never re-implement rules here
  const result = canPlace(placed, board, remaining, selectedType, rotation, origin)
  const isLegal = result.ok
  // Tokens: --match #1F8A4C when legal, --miss #B8502E when illegal
  const color = isLegal ? '#1F8A4C' : '#B8502E'

  const centerX = origin.x + (w - 1) / 2
  const centerY = origin.y + 0.5
  const centerZ = origin.z + (d - 1) / 2

  return (
    <group position={[centerX, centerY, centerZ]} raycast={noopRaycast}>
      {/* Ghost brick body */}
      <mesh raycast={noopRaycast}>
        <boxGeometry args={[w - 0.03, 0.97, d - 0.03]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.45}
          depthWrite={false}
          roughness={0.5}
        />
      </mesh>

      {/* Ghost decorative studs */}
      {studPositions.map(([sx, sy, sz], idx) => (
        <mesh
          key={idx}
          position={[sx, sy, sz]}
          raycast={noopRaycast}
        >
          <cylinderGeometry args={[0.18, 0.18, 0.14, 16]} />
          <meshStandardMaterial
            color={color}
            transparent
            opacity={0.45}
            depthWrite={false}
            roughness={0.5}
          />
        </mesh>
      ))}
    </group>
  )
}
