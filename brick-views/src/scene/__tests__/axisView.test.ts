import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { axisCameraFor, centerOf } from '../axisView'
import type { BoardSize } from '../../core/types'

describe('axisCameraFor', () => {
  const board: BoardSize = { width: 6, depth: 4, height: 3 }

  it('centers vertically at board.height / 2 and horizontally at board midpoints', () => {
    const center = centerOf(board)
    expect(center).toEqual([2.5, 1.5, 1.5])
  })

  it('front camera basis matches toGrids: x right, y up', () => {
    const spec = axisCameraFor('front', board)
    const pos = new THREE.Vector3(...spec.position)
    const target = new THREE.Vector3(...spec.target)
    const up = new THREE.Vector3(...spec.up)

    const viewDir = target.clone().sub(pos).normalize()
    // Looks along -z
    expect(viewDir.z).toBeCloseTo(-1)

    // Camera right = viewDir x up
    const camRight = viewDir.clone().cross(up).normalize()
    // camRight is +x
    expect(camRight.x).toBeCloseTo(1)
    expect(up.y).toBeCloseTo(1)
  })

  it('right camera basis matches toGrids: column 0 is highest z (front edge on viewer left)', () => {
    const spec = axisCameraFor('right', board)
    const pos = new THREE.Vector3(...spec.position)
    const target = new THREE.Vector3(...spec.target)
    const up = new THREE.Vector3(...spec.up)

    const viewDir = target.clone().sub(pos).normalize()
    // Looks along -x (camera sits at +x)
    expect(viewDir.x).toBeCloseTo(-1)

    // Camera right = viewDir x up
    // In Three.js: (-1,0,0) x (0,1,0) = (0, 0, -1) -> rightward on screen is -z
    const camRight = viewDir.clone().cross(up).normalize()
    expect(camRight.z).toBeCloseTo(-1)

    // Front edge (+z) projected along camRight has negative coordinate (left of screen)
    // Back edge (-z / z=0) projected along camRight has positive coordinate (right of screen)
    const frontPoint = new THREE.Vector3(target.x, target.y, board.depth - 1)
    const backPoint = new THREE.Vector3(target.x, target.y, 0)
    const frontScreenX = frontPoint.clone().sub(target).dot(camRight)
    const backScreenX = backPoint.clone().sub(target).dot(camRight)
    expect(frontScreenX).toBeLessThan(backScreenX)
  })

  it('top camera basis matches toGrids: row 0 is lowest z (back edge at top of card), col 0 is lowest x', () => {
    const spec = axisCameraFor('top', board)
    const pos = new THREE.Vector3(...spec.position)
    const target = new THREE.Vector3(...spec.target)
    const up = new THREE.Vector3(...spec.up)

    const viewDir = target.clone().sub(pos).normalize()
    // Looks along -y (camera sits at +y looking down)
    expect(viewDir.y).toBeCloseTo(-1)

    // Camera right = viewDir x up: (0,-1,0) x (0,0,-1) = (1, 0, 0) -> rightward is +x
    const camRight = viewDir.clone().cross(up).normalize()
    expect(camRight.x).toBeCloseTo(1)

    // Camera up is -z -> upward on screen is lowest z (back edge at row 0)
    expect(up.z).toBeCloseTo(-1)

    const backPoint = new THREE.Vector3(target.x, target.y, 0)
    const frontPoint = new THREE.Vector3(target.x, target.y, board.depth - 1)
    const backScreenY = backPoint.clone().sub(target).dot(up)
    const frontScreenY = frontPoint.clone().sub(target).dot(up)
    expect(backScreenY).toBeGreaterThan(frontScreenY)
  })
})
