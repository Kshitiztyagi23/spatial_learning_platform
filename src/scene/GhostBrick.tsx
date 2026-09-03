import { useMemo } from 'react'
import { useSession } from '../state/session'
import { canPlace } from '../core/placement'
import { footprintFor } from '../core/geometry'
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

  const isVisible = Boolean(candidate && selectedType && mode === 'build')

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

  // Ask store canPlace path to determine legality — never re-implement rules here
  const result = canPlace(placed, board, remaining, selectedType, rotation, candidate)
  const isLegal = result.ok
  // Tokens: --match #1F8A4C when legal, --miss #B8502E when illegal
  const color = isLegal ? '#1F8A4C' : '#B8502E'

  const centerX = candidate.x + (w - 1) / 2
  const centerY = candidate.y + 0.5
  const centerZ = candidate.z + (d - 1) / 2

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
