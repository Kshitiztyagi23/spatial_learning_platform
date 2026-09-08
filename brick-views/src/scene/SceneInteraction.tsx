import { useEffect, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import type * as THREE from 'three'
import { useSession } from '../state/session'
import { getRaycastCandidate } from './pointer'
import { GhostBrick } from './GhostBrick'
import { originForPivot } from '../core/geometry'
import type { Vec3 } from '../core/types'

interface SceneInteractionProps {
  plateRef: React.RefObject<THREE.Mesh | null>
  placedRef: React.RefObject<THREE.Group | null>
  onHighlightChange: (instanceId: string | null) => void
}

export function SceneInteraction({
  plateRef,
  placedRef,
  onHighlightChange,
}: SceneInteractionProps) {
  const { camera, gl } = useThree()

  const mode = useSession((state) => state.mode)
  const selectedType = useSession((state) => state.selectedType)
  const rotation = useSession((state) => state.rotation)
  const place = useSession((state) => state.place)
  const removeAt = useSession((state) => state.removeAt)
  const placed = useSession((state) => state.placed)

  const [candidate, setCandidate] = useState<Vec3 | null>(null)

  const pointerDownPos = useRef<{ x: number; y: number } | null>(null)
  const isDragging = useRef(false)

  useEffect(() => {
    const dom = gl.domElement

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      pointerDownPos.current = { x: e.clientX, y: e.clientY }
      isDragging.current = false
    }

      const onPointerMove = (e: PointerEvent | MouseEvent) => {
      if (pointerDownPos.current) {
        const dx = e.clientX - pointerDownPos.current.x
        const dy = e.clientY - pointerDownPos.current.y
        if (Math.abs(dx) + Math.abs(dy) > 4) {
          isDragging.current = true
          // Hide ghost and erase highlight while dragging camera
          setCandidate(null)
          onHighlightChange(null)
          return
        }
      }

      // If not dragging, update hover candidate / erase highlight
      const rect = dom.getBoundingClientRect()
      const hit = getRaycastCandidate(
        e.clientX,
        e.clientY,
        rect,
        camera,
        plateRef.current,
        placedRef.current,
        mode,
        placed
      )

      if (mode === 'erase') {
        setCandidate(null)
        if (hit && hit.type === 'brick') {
          onHighlightChange(hit.placement.instanceId)
        } else {
          onHighlightChange(null)
        }
      } else {
        // Build mode
        onHighlightChange(null)
        if (hit && selectedType) {
          setCandidate(hit.cell)
        } else {
          setCandidate(null)
        }
      }
    }

    const onPointerUp = (e: PointerEvent) => {
      if (pointerDownPos.current && !isDragging.current) {
        // Valid click (movement <= 4px)
        const rect = dom.getBoundingClientRect()
        const hit = getRaycastCandidate(
          e.clientX,
          e.clientY,
          rect,
          camera,
          plateRef.current,
          placedRef.current,
          mode,
          placed
        )

        if (hit) {
          if (mode === 'erase' && hit.type === 'brick') {
            removeAt(hit.cell)
          } else if (mode === 'build' && selectedType) {
            place(originForPivot(selectedType, rotation, hit.cell))
          }
        }
      }

      pointerDownPos.current = null
      isDragging.current = false
    }

    const onPointerLeave = () => {
      pointerDownPos.current = null
      isDragging.current = false
      setCandidate(null)
      onHighlightChange(null)
    }

    dom.addEventListener('pointerdown', onPointerDown)
    dom.addEventListener('pointermove', onPointerMove)
    dom.addEventListener('mousemove', onPointerMove)
    dom.addEventListener('pointerup', onPointerUp)
    dom.addEventListener('pointerleave', onPointerLeave)

    return () => {
      dom.removeEventListener('pointerdown', onPointerDown)
      dom.removeEventListener('pointermove', onPointerMove)
      dom.removeEventListener('mousemove', onPointerMove)
      dom.removeEventListener('pointerup', onPointerUp)
      dom.removeEventListener('pointerleave', onPointerLeave)
    }
  }, [camera, gl.domElement, mode, selectedType, rotation, place, removeAt, placed, plateRef, placedRef, onHighlightChange])

  return <GhostBrick candidate={candidate} />
}
