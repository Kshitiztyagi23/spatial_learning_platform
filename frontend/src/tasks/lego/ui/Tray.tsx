import { useSession } from '../state/session'
import { orderedTypeIds } from '../core/pieces'
import { TrayItem } from './TrayItem'

export function Tray() {
  const tray = useSession((state) => state.derived.tray)
  const monochrome = useSession((state) => !!state.derived.puzzle.monochrome)
  const remaining = useSession((state) => state.remaining)
  const selectedType = useSession((state) => state.selectedType)
  const selectType = useSession((state) => state.selectType)

  // Every type this puzzle uses at all, largest footprint first, colour as
  // the tie-break — stays in the list (zero-count, disabled) once emptied.
  const presentTypes = orderedTypeIds(tray)

  const handleSelect = (typeId: (typeof presentTypes)[number]) => {
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
            monochrome={monochrome}
          />
        ))}
      </div>
    </div>
  )
}
