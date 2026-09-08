import { useLayoutEffect, useRef } from 'react'
import { OrthographicCamera } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import type * as THREE from 'three'
import { axisCameraFor } from './axisView'
import type { BoardSize, ViewName } from '../core/types'

interface AxisCameraProps {
  view: ViewName
  board: BoardSize
  makeDefault?: boolean
}

/** A true orthographic camera, pinned to one axis — no orbit, no drag.
 *  Used both by a static view card and, while an axis preset is active, by
 *  the interactive Stage (replacing its perspective camera, which otherwise
 *  makes "Front"/"Right"/"Top" show converging edges instead of a real
 *  orthographic view — see plan §2). */
export function AxisCamera({ view, board, makeDefault = true }: AxisCameraProps) {
  const ref = useRef<THREE.OrthographicCamera>(null)
  const size = useThree((state) => state.size)
  const invalidate = useThree((state) => state.invalidate)
  const { position, target, up, halfWidth, halfHeight } = axisCameraFor(view, board)

  const viewAspect = halfWidth / halfHeight
  const aspect = size.width > 0 && size.height > 0 ? size.width / size.height : viewAspect
  let fitHalfWidth = halfWidth
  let fitHalfHeight = halfHeight

  if (aspect > viewAspect) {
    fitHalfWidth = halfHeight * aspect
  } else {
    fitHalfHeight = halfWidth / aspect
  }

  useLayoutEffect(() => {
    const cam = ref.current
    if (cam) {
      cam.position.set(position[0], position[1], position[2])
      cam.up.set(up[0], up[1], up[2])
      cam.lookAt(target[0], target[1], target[2])
      cam.left = -fitHalfWidth
      cam.right = fitHalfWidth
      cam.top = fitHalfHeight
      cam.bottom = -fitHalfHeight
      cam.near = 0.1
      cam.far = 100
      cam.updateProjectionMatrix()
      invalidate()
    }
  }, [position, target, up, fitHalfWidth, fitHalfHeight, invalidate])

  return (
    <OrthographicCamera
      ref={ref}
      makeDefault={makeDefault}
      manual
      position={position}
      left={-fitHalfWidth}
      right={fitHalfWidth}
      top={fitHalfHeight}
      bottom={-fitHalfHeight}
      near={0.1}
      far={100}
    />
  )
}
