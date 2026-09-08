import { PIECES } from '../core/pieces'
import type { PieceTypeId } from '../core/types'
import { IsometricBrickIcon } from './IsometricBrickIcon'

interface TrayItemProps {
  typeId: PieceTypeId
  remaining: number
  isSelected: boolean
  onSelect: (typeId: PieceTypeId) => void
}

export function TrayItem({ typeId, remaining, isSelected, onSelect }: TrayItemProps) {
  const piece = PIECES[typeId]
  const isZero = remaining <= 0

  const handleClick = () => {
    if (isZero) return
    onSelect(typeId)
  }

  // Selected state text color for accessible contrast against saturated brick fills
  const selectedTextColor = typeId === '2x4' ? 'var(--ink)' : '#FFFFFF'

  return (
    <button
      type="button"
      className={`tray-item ${isSelected ? 'selected' : ''} ${isZero ? 'zero-count' : ''}`}
      onClick={handleClick}
      disabled={isZero}
      aria-label={`${piece.label}, ${remaining} remaining`}
      aria-pressed={isSelected}
      style={{
        backgroundColor: isSelected ? piece.color : 'var(--sheet)',
        color: isSelected ? selectedTextColor : 'var(--ink)',
      }}
    >
      <div className="tray-item-icon">
        <IsometricBrickIcon typeId={typeId} />
      </div>
      <div className="tray-item-info">
        <span className="tray-item-label">{piece.label}</span>
        <span
          className="tray-item-count"
          style={{
            color: isSelected ? selectedTextColor : 'var(--quiet)',
            opacity: isSelected ? 0.9 : 1,
          }}
        >
          {remaining}
        </span>
      </div>
    </button>
  )
}
