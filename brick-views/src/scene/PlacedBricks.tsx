import { forwardRef } from 'react'
import type * as THREE from 'three'
import { useSession } from '../state/session'
import { BrickMesh } from './BrickMesh'
import type { Placement } from '../core/types'

interface PlacedBricksProps {
  highlightedInstanceIds?: ReadonlySet<string>
  /** defaults to the child's live board; a view card passes the puzzle's
   *  own solution instead, to render the answer rather than the attempt. */
  placements?: Placement[]
  /** every brick renders one neutral grey, ignoring its own colour */
  monochrome?: boolean
}

export const PlacedBricks = forwardRef<THREE.Group, PlacedBricksProps>(
  ({ highlightedInstanceIds, placements, monochrome = false }, ref) => {
    // When placements is given (a view card rendering a fixed answer), the
    // selector returns a stable null instead of subscribing to the live
    // board — so the child's own placements never re-render this canvas.
    const stored = useSession((state) => (placements ? null : state.placed))
    const placed = placements ?? stored ?? []

    return (
      <group ref={ref} name="placed-bricks-group">
        {placed.map((placement) => (
          <BrickMesh
            key={placement.instanceId}
            placement={placement}
            isHighlighted={highlightedInstanceIds?.has(placement.instanceId) ?? false}
            monochrome={monochrome}
          />
        ))}
      </group>
    )
  }
)

PlacedBricks.displayName = 'PlacedBricks'
