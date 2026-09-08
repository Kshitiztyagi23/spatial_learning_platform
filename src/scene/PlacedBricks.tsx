import { forwardRef } from 'react'
import type * as THREE from 'three'
import { useSession } from '../state/session'
import { BrickMesh } from './BrickMesh'

interface PlacedBricksProps {
  highlightedInstanceIds?: ReadonlySet<string>
}

export const PlacedBricks = forwardRef<THREE.Group, PlacedBricksProps>(
  ({ highlightedInstanceIds }, ref) => {
    const placed = useSession((state) => state.placed)

    return (
      <group ref={ref} name="placed-bricks-group">
        {placed.map((placement) => (
          <BrickMesh
            key={placement.instanceId}
            placement={placement}
            isHighlighted={highlightedInstanceIds?.has(placement.instanceId) ?? false}
          />
        ))}
      </group>
    )
  }
)

PlacedBricks.displayName = 'PlacedBricks'
