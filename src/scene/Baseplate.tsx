import { useMemo } from 'react'
import * as THREE from 'three'
import type { BoardSize } from '../core/types'

interface BaseplateProps {
  board: BoardSize
}

export function Baseplate({ board }: BaseplateProps) {
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

  // Crisp canvas texture for the FRONT marker
  const frontTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 128
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      // High contrast token: --quiet #55616F
      ctx.fillStyle = '#55616F'
      ctx.font = 'bold 64px "Atkinson Hyperlegible Next Variable", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('FRONT', 256, 64)
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

      {/* FRONT marker on top surface of plate (visible in Top and 3D views) */}
      <mesh
        position={[centerX, 0.005, depth - 0.5 - 0.35]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[1.8, 0.45]} />
        <meshBasicMaterial
          map={frontTexture}
          transparent
          depthWrite={false}
        />
      </mesh>

      {/* FRONT marker on front vertical face of plate (directly facing camera in Front preset) */}
      <mesh
        position={[centerX, -0.2, depth - 0.5 + 0.002]}
        rotation={[0, 0, 0]}
      >
        <planeGeometry args={[2.0, 0.28]} />
        <meshBasicMaterial
          map={frontTexture}
          transparent
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
