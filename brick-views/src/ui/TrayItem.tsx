import { PIECES, MONOCHROME_HEX, shapeOnlyLabel } from '../core/pieces'
import type { PieceTypeId } from '../core/types'
import { IsometricBrickIcon } from './IsometricBrickIcon'

interface TrayItemProps {
  typeId: PieceTypeId
  remaining: number
  isSelected: boolean
  onSelect: (typeId: PieceTypeId) => void
  monochrome?: boolean
}

// Perceptual luminance (ITU-R BT.601) — picks readable text over any brick
// colour instead of hand-listing which colours are "light".
function isLight(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return 0.299 * r + 0.587 * g + 0.114 * b > 150
}

export function TrayItem({ typeId, remaining, isSelected, onSelect, monochrome = false }: TrayItemProps) {
  const piece = PIECES[typeId]
  const hex = monochrome ? MONOCHROME_HEX : piece.hex
  const label = monochrome ? shapeOnlyLabel(typeId) : piece.label
  const isZero = remaining <= 0

  const handleClick = () => {
    if (isZero) return
    onSelect(typeId)
  }

  const selectedTextColor = isLight(hex) ? 'var(--ink)' : '#FFFFFF'

  return (
    <button
      type="button"
      className={`tray-item ${isSelected ? 'selected' : ''} ${isZero ? 'zero-count' : ''}`}
      onClick={handleClick}
      disabled={isZero}
      aria-label={`${label}, ${remaining} remaining`}
      aria-pressed={isSelected}
      style={{
        backgroundColor: isSelected ? hex : 'var(--sheet)',
        color: isSelected ? selectedTextColor : 'var(--ink)',
      }}
    >
      <div className="tray-item-icon">
        <IsometricBrickIcon typeId={typeId} color={monochrome ? MONOCHROME_HEX : undefined} />
      </div>
      <div className="tray-item-info">
        <span className="tray-item-label">{label}</span>
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
