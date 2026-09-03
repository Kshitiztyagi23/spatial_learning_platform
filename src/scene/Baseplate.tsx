import { useMemo, forwardRef } from 'react'
import * as THREE from 'three'
import type { BoardSize } from '../core/types'

interface BaseplateProps {
  board: BoardSize
}

export const Baseplate = forwardRef<THREE.Mesh, BaseplateProps>(({ board }, ref) => {
  const { width, depth } = board
  const centerX = (width - 1) / 2
  const centerZ = (depth - 1) / 2

  // Create grid line coordinates outlining every 1x1 cell
  const gridGeometry = useMemo(() => {
    const points: number[] = []
    const y = 0.002 // Slightly above plate to prevent z-fighting

    // Lines parallel to X axis (constant Z)
    for (let z = 0; z <= depth; z++) {
      const zPos = z - 0.5
      points.push(-0.5, y, zPos)
      points.push(width - 0.5, y, zPos)
    }

    // Lines parallel to Z axis (constant X)
    for (let x = 0; x <= width; x++) {
      const xPos = x - 0.5
      points.push(xPos, y, -0.5)
      points.push(xPos, y, depth - 0.5)
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
    return geometry
  }, [width, depth])

  // Large, high-contrast billboard sprite texture for the FRONT marker
  const frontBadgeTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 160
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Crisp white pill badge with 2px-equivalent border in --rule
      const x = 20, y = 16, w = 472, h = 128, r = 64
      ctx.beginPath()
      ctx.moveTo(x + r, y)
      ctx.lineTo(x + w - r, y)
      ctx.arcTo(x + w, y, x + w, y + h, r)
      ctx.arcTo(x + w, y + h, x, y + h, r)
      ctx.arcTo(x, y + h, x, y, r)
      ctx.arcTo(x, y, x + w, y, r)
      ctx.closePath()

      ctx.fillStyle = '#FFFFFF'
      ctx.fill()
      ctx.strokeStyle = '#B7C1CC'
      ctx.lineWidth = 8
      ctx.stroke()

      // Large bold text in --ink (#1B2231)
      ctx.fillStyle = '#1B2231'
      ctx.font = 'bold 68px "Atkinson Hyperlegible Next Variable", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('FRONT', 256, 82)
    }
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.needsUpdate = true
    return texture
  }, [])

  return (
    <group name="board-group">
      {/* Baseplate solid slab */}
      <mesh
        ref={ref}
        name="plate"
        position={[centerX, -0.2, centerZ]}
        receiveShadow
      >
        <boxGeometry args={[width, 0.4, depth]} />
        <meshStandardMaterial
          color="#D6DEEA"
          roughness={0.95}
          metalness={0.0}
        />
      </mesh>

      {/* Faint grid lines */}
      <lineSegments geometry={gridGeometry}>
        <lineBasicMaterial color="#B7C1CC" />
      </lineSegments>

      {/* Prominent billboard Sprite on +z edge (always faces camera, never foreshortened) */}
      <sprite
        position={[centerX, 0.35, depth - 0.48]}
        scale={[2.2, 0.72, 1]}
      >
        <spriteMaterial
          map={frontBadgeTexture}
          transparent
          depthTest={false}
        />
      </sprite>
    </group>
  )
})

Baseplate.displayName = 'Baseplate'
