import { useSession } from '../state/session'
import type { PieceTypeId } from '../core/types'
import { TrayItem } from './TrayItem'

export function Tray() {
  const tray = useSession((state) => state.derived.tray)
  const remaining = useSession((state) => state.remaining)
  const selectedType = useSession((state) => state.selectedType)
  const selectType = useSession((state) => state.selectType)

  // One item per type present in the puzzle (derived.tray > 0)
  const presentTypes = (['2x4', '2x3', '2x2'] as PieceTypeId[]).filter(
    (typeId) => (tray[typeId] ?? 0) > 0
  )

  const handleSelect = (typeId: PieceTypeId) => {
    // Selecting sets selectedType in the store; clicking selected deselects
    selectType(selectedType === typeId ? null : typeId)
  }

  return (
    <div className="tray-container" role="region" aria-label="Brick tray">
      <div className="tray-list">
        {presentTypes.map((typeId) => (
          <TrayItem
            key={typeId}
            typeId={typeId}
            remaining={remaining[typeId] ?? 0}
            isSelected={selectedType === typeId}
            onSelect={handleSelect}
          />
        ))}
      </div>
    </div>
  )
}
