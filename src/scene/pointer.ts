import * as THREE from 'three'
import type { Placement, Vec3 } from '../core/types'

export interface PlateHit {
  type: 'plate'
  cell: Vec3
}

export interface BrickHit {
  type: 'brick'
  cell: Vec3
  placement: Placement
}

export type RaycastCandidate = PlateHit | BrickHit | null

const raycaster = new THREE.Raycaster()
const ndc = new THREE.Vector2()

/**
 * Perform raycast against plate mesh and placed bricks.
 * Returns candidate cell for build or targeted brick for erase.
 */
export function getRaycastCandidate(
  clientX: number,
  clientY: number,
  canvasRect: DOMRect,
  camera: THREE.Camera,
  plateMesh: THREE.Object3D | null,
  placedGroup: THREE.Object3D | null,
  mode: 'build' | 'erase'
): RaycastCandidate {
  if (!plateMesh && !placedGroup) return null

  // Convert mouse screen coordinates to Normalized Device Coordinates [-1, 1]
  ndc.x = ((clientX - canvasRect.left) / canvasRect.width) * 2 - 1
  ndc.y = -((clientY - canvasRect.top) / canvasRect.height) * 2 + 1

  raycaster.setFromCamera(ndc, camera)

  const targets: THREE.Object3D[] = []
  if (plateMesh) targets.push(plateMesh)
  if (placedGroup) targets.push(placedGroup)

  const hits = raycaster.intersectObjects(targets, true)
  if (!hits.length || !hits[0]) return null

  // Process first intersection
  const hit = hits[0]

  // Hit on plate
  if (hit.object === plateMesh || hit.object.name === 'plate') {
    if (mode === 'erase') return null // Baseplate cannot be erased
    const x = Math.round(hit.point.x)
    const z = Math.round(hit.point.z)
    return {
      type: 'plate',
      cell: { x, y: 0, z },
    }
  }

  // Hit on placed brick: find brick group with userData.placement
  let cur: THREE.Object3D | null = hit.object
  let placement: Placement | null = null
  while (cur && cur !== placedGroup) {
    if (cur.userData?.placement) {
      placement = cur.userData.placement as Placement
      break
    }
    cur = cur.parent
  }

  if (!placement) {
    // If not on brick metadata, might be plate
    return null
  }

  if (mode === 'erase') {
    // In erase mode, identify the cell of the brick that was clicked
    const cell: Vec3 = {
      x: Math.round(hit.point.x),
      y: Math.floor(hit.point.y),
      z: Math.round(hit.point.z),
    }
    return {
      type: 'brick',
      cell,
      placement,
    }
  }

  // In build mode: find neighbouring cell along the world face normal
  if (!hit.face) return null
  const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).round()
  const neighborPoint = hit.point.clone().addScaledVector(normal, 0.05)

  const neighborCell: Vec3 = {
    x: Math.round(neighborPoint.x),
    y: Math.floor(neighborPoint.y),
    z: Math.round(neighborPoint.z),
  }

  return {
    type: 'brick',
    cell: neighborCell,
    placement,
  }
}
