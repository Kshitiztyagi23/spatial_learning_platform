import { useMemo } from 'react'
import { PIECES } from '../core/pieces'
import type { PieceTypeId } from '../core/types'

interface IsometricBrickIconProps {
  typeId: PieceTypeId
  width?: number
  height?: number
  className?: string
  /** overrides the piece's own colour - used for monochrome puzzles */
  color?: string
}

type Point = [number, number]

export function IsometricBrickIcon({
  typeId,
  width = 54,
  height = 42,
  className = '',
  color: colorOverride,
}: IsometricBrickIconProps) {
  const piece = PIECES[typeId]
  const { width: w, depth: d, hex: pieceColor } = piece
  const color = colorOverride ?? pieceColor

  const { topPoints, leftFace, rightFace, studs } = useMemo(() => {
    const unitX = 6.8
    const unitY = 3.9
    const h = 7.5

    const rawTop: [Point, Point, Point, Point] = [
      [(0 - 0) * unitX, (0 + 0) * unitY],
      [(w - 0) * unitX, (w + 0) * unitY],
      [(w - d) * unitX, (w + d) * unitY],
      [(0 - d) * unitX, (0 + d) * unitY],
    ]

    const allX = rawTop.map(([x]) => x)
    const allY = rawTop.flatMap(([, y]) => [y, y + h])
    const minX = Math.min(...allX)
    const maxX = Math.max(...allX)
    const minY = Math.min(...allY)
    const maxY = Math.max(...allY)

    const ox = 27 - (minX + maxX) / 2
    const oy = 21 - (minY + maxY) / 2 + 1

    const p0: Point = [rawTop[0][0] + ox, rawTop[0][1] + oy]
    const p1: Point = [rawTop[1][0] + ox, rawTop[1][1] + oy]
    const p2: Point = [rawTop[2][0] + ox, rawTop[2][1] + oy]
    const p3: Point = [rawTop[3][0] + ox, rawTop[3][1] + oy]

    const top = `${p0[0]},${p0[1]} ${p1[0]},${p1[1]} ${p2[0]},${p2[1]} ${p3[0]},${p3[1]}`
    const left = `${p3[0]},${p3[1]} ${p2[0]},${p2[1]} ${p2[0]},${p2[1] + h} ${p3[0]},${p3[1] + h}`
    const right = `${p2[0]},${p2[1]} ${p1[0]},${p1[1]} ${p1[0]},${p1[1] + h} ${p2[0]},${p2[1] + h}`

    const studList: { cx: number; cy: number }[] = []
    for (let ix = 0; ix < w; ix++) {
      for (let iz = 0; iz < d; iz++) {
        const sx = ((ix + 0.5) - (iz + 0.5)) * unitX + ox
        const sy = ((ix + 0.5) + (iz + 0.5)) * unitY + oy
        studList.push({ cx: sx, cy: sy })
      }
    }

    return {
      topPoints: top,
      leftFace: left,
      rightFace: right,
      studs: studList,
    }
  }, [w, d])

  return (
    <svg
      viewBox="0 0 54 42"
      width={width}
      height={height}
      className={className}
      aria-hidden="true"
      style={{ display: 'block', flexShrink: 0 }}
    >
      {/* Front-left face */}
      <polygon points={leftFace} fill={color} />
      <polygon points={leftFace} fill="rgba(0, 0, 0, 0.16)" />

      {/* Front-right face */}
      <polygon points={rightFace} fill={color} />
      <polygon points={rightFace} fill="rgba(0, 0, 0, 0.32)" />

      {/* Top face */}
      <polygon points={topPoints} fill={color} />

      {/* Seam outlines */}
      <polygon
        points={topPoints}
        fill="none"
        stroke="rgba(255, 255, 255, 0.25)"
        strokeWidth="0.75"
      />
      <polygon
        points={leftFace}
        fill="none"
        stroke="rgba(0, 0, 0, 0.2)"
        strokeWidth="0.75"
      />
      <polygon
        points={rightFace}
        fill="none"
        stroke="rgba(0, 0, 0, 0.25)"
        strokeWidth="0.75"
      />

      {/* Studs */}
      {studs.map((s, i) => (
        <g key={i}>
          {/* Stud side cylinder */}
          <path
            d={`M ${s.cx - 2.8} ${s.cy} L ${s.cx - 2.8} ${s.cy - 1.8} A 2.8 1.6 0 0 1 ${s.cx + 2.8} ${s.cy - 1.8} L ${s.cx + 2.8} ${s.cy} A 2.8 1.6 0 0 1 ${s.cx - 2.8} ${s.cy} Z`}
            fill={color}
          />
          <path
            d={`M ${s.cx - 2.8} ${s.cy} L ${s.cx - 2.8} ${s.cy - 1.8} A 2.8 1.6 0 0 1 ${s.cx + 2.8} ${s.cy - 1.8} L ${s.cx + 2.8} ${s.cy} A 2.8 1.6 0 0 1 ${s.cx - 2.8} ${s.cy} Z`}
            fill="rgba(0, 0, 0, 0.18)"
          />
          {/* Stud top ellipse */}
          <ellipse
            cx={s.cx}
            cy={s.cy - 1.8}
            rx="2.8"
            ry="1.6"
            fill={color}
            stroke="rgba(255, 255, 255, 0.28)"
            strokeWidth="0.5"
          />
        </g>
      ))}
    </svg>
  )
}
