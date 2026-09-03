import { useMemo } from 'react'
import { PIECES } from '../core/pieces'
import { footprintFor } from '../core/geometry'
import type { Placement } from '../core/types'

interface BrickMeshProps {
  placement: Placement
  isHighlighted?: boolean
}

// No-op raycast so raycaster passes through studs to the brick body
const noopRaycast = () => {}

export function BrickMesh({ placement, isHighlighted = false }: BrickMeshProps) {
  const { typeId, rotation, origin } = placement
  const piece = PIECES[typeId]
  const { w, d } = footprintFor(typeId, rotation)

  // Brick body center in world coordinates
  const centerX = origin.x + (w - 1) / 2
  const centerY = origin.y + 0.5
  const centerZ = origin.z + (d - 1) / 2

  // Generate stud positions (one stud per 1x1 cell of footprint)
  const studPositions = useMemo(() => {
    const positions: [number, number, number][] = []
    for (let dx = 0; dx < w; dx++) {
      for (let dz = 0; dz < d; dz++) {
        const localX = dx - (w - 1) / 2
        const localZ = dz - (d - 1) / 2
        // Top of the brick is at y = 0.5; stud height = 0.14, center = 0.5 + 0.07 = 0.57
        positions.push([localX, 0.57, localZ])
      }
    }
    return positions
  }, [w, d])

  return (
    <group
      name={`brick-${placement.instanceId}`}
      position={[centerX, centerY, centerZ]}
      userData={{ placement }}
    >
      {/* Main brick solid box with subtle edge gap for seam definition */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w - 0.03, 0.97, d - 0.03]} />
        <meshStandardMaterial
          color={piece.color}
          emissive={isHighlighted ? '#B8502E' : '#000000'}
          emissiveIntensity={isHighlighted ? 0.65 : 0}
          roughness={0.42}
          metalness={0.02}
        />
      </mesh>

      {/* Decorative studs */}
      {studPositions.map(([sx, sy, sz], idx) => (
        <mesh
          key={idx}
          position={[sx, sy, sz]}
          raycast={noopRaycast}
          castShadow
        >
          <cylinderGeometry args={[0.18, 0.18, 0.14, 16]} />
          <meshStandardMaterial
            color={piece.color}
            emissive={isHighlighted ? '#B8502E' : '#000000'}
            emissiveIntensity={isHighlighted ? 0.65 : 0}
            roughness={0.42}
            metalness={0.02}
          />
        </mesh>
      ))}
    </group>
  )
}
