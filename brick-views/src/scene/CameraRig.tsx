import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { BoardSize } from '../core/types'

export type CameraPreset = 'front' | 'right' | 'top' | '3d'

interface CameraRigProps {
  board: BoardSize
  activePreset: CameraPreset | null
  onUserDrag?: () => void
}

export function CameraRig({ board, activePreset, onUserDrag }: CameraRigProps) {
  const { camera, gl } = useThree()

  const centerX = (board.width - 1) / 2
  // Look-at target centered on the board volume itself (around y = 0.5) so empty board is vertically centered
  const centerY = 0.5
  const centerZ = (board.depth - 1) / 2
  const center = useRef(new THREE.Vector3(centerX, centerY, centerZ))

  const maxDimension = Math.max(board.width, board.depth)
  // Radius tuned so plate fills ~65% of the board stage's shorter dimension in 3D preset
  const radius = maxDimension * 1.1 + 2.8

  // Angles: theta (azimuth), phi (polar)
  // Initial 3D view angles from prototype
  const theta = useRef(Math.PI * 0.24)
  const phi = useRef(Math.PI * 0.34)
  const targetTheta = useRef(Math.PI * 0.24)
  const targetPhi = useRef(Math.PI * 0.34)

  // Drag tracking
  const isDragging = useRef(false)
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null)

  // Apply preset angles
  useEffect(() => {
    if (!activePreset) return

    switch (activePreset) {
      case 'front':
        targetTheta.current = 0
        targetPhi.current = Math.PI / 2 - 0.03
        break
      case 'right':
        targetTheta.current = Math.PI / 2
        targetPhi.current = Math.PI / 2 - 0.03
        break
      case 'top':
        targetTheta.current = 0
        targetPhi.current = 0.05
        break
      case '3d':
        targetTheta.current = Math.PI * 0.24
        targetPhi.current = Math.PI * 0.34
        break
    }
  }, [activePreset])

  // Update center when board size changes
  useEffect(() => {
    center.current.set(centerX, centerY, centerZ)
  }, [centerX, centerY, centerZ])

  // Pointer drag event listeners on canvas DOM element
  useEffect(() => {
    const dom = gl.domElement

    const onPointerDown = (e: PointerEvent) => {
      // Only drag with primary mouse button
      if (e.button !== 0) return
      dom.setPointerCapture(e.pointerId)
      pointerDownPos.current = { x: e.clientX, y: e.clientY }
      isDragging.current = false
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!pointerDownPos.current) return

      const dx = e.clientX - pointerDownPos.current.x
      const dy = e.clientY - pointerDownPos.current.y

      // Drag threshold: > 4px of movement
      if (!isDragging.current && Math.abs(dx) + Math.abs(dy) > 4) {
        isDragging.current = true
        onUserDrag?.()
      }

      if (isDragging.current) {
        targetTheta.current -= dx * 0.008
        // Clamp polar angle so child cannot get under the plate: [0.05, PI/2 - 0.03]
        targetPhi.current = Math.min(
          Math.PI / 2 - 0.03,
          Math.max(0.05, targetPhi.current - dy * 0.008)
        )
        pointerDownPos.current = { x: e.clientX, y: e.clientY }
      }
    }

    const onPointerUp = (e: PointerEvent) => {
      if (dom.hasPointerCapture(e.pointerId)) {
        dom.releasePointerCapture(e.pointerId)
      }
      pointerDownPos.current = null
      isDragging.current = false
    }

    dom.addEventListener('pointerdown', onPointerDown)
    dom.addEventListener('pointermove', onPointerMove)
    dom.addEventListener('pointerup', onPointerUp)
    dom.addEventListener('pointercancel', onPointerUp)

    return () => {
      dom.removeEventListener('pointerdown', onPointerDown)
      dom.removeEventListener('pointermove', onPointerMove)
      dom.removeEventListener('pointerup', onPointerUp)
      dom.removeEventListener('pointercancel', onPointerUp)
    }
  }, [gl.domElement, onUserDrag])

  // Frame easing: robust across both 60fps and low-fps environments
  useFrame((_, delta) => {
    // Easing factor: ~0.18 per frame at 60Hz -> exp decay rate ~12
    const rate = Math.min(1, Math.max(0.18, 1 - Math.exp(-12 * delta)))

    const dTheta = targetTheta.current - theta.current
    const dPhi = targetPhi.current - phi.current

    if (Math.abs(dTheta) < 0.002) {
      theta.current = targetTheta.current
    } else {
      theta.current += dTheta * rate
    }

    if (Math.abs(dPhi) < 0.002) {
      phi.current = targetPhi.current
    } else {
      phi.current += dPhi * rate
    }

    const sp = Math.sin(phi.current)
    const x = center.current.x + radius * sp * Math.sin(theta.current)
    const y = center.current.y + radius * Math.cos(phi.current)
    const z = center.current.z + radius * sp * Math.cos(theta.current)

    camera.position.set(x, y, z)
    camera.lookAt(center.current)
  })

  return null
}
