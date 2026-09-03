import { useSession } from '../state/session'
import { BrickMesh } from './BrickMesh'

export function PlacedBricks() {
  const placed = useSession((state) => state.placed)

  return (
    <group name="placed-bricks-group">
      {placed.map((placement) => (
        <BrickMesh key={placement.instanceId} placement={placement} />
      ))}
    </group>
  )
}
