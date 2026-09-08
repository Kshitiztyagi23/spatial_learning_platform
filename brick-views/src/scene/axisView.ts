import type { BoardSize, ViewName } from '../core/types'

/** theta (azimuth) / phi (polar), reused verbatim from CameraRig's own
 *  front/right/top presets — the -0.03/0.05 epsilons are CameraRig's, kept
 *  identical here so a static axis view and pressing the matching preset
 *  button on the interactive stage produce the same picture. */
export const AXIS_ANGLES: Record<ViewName, { theta: number; phi: number }> = {
  front: { theta: 0, phi: Math.PI / 2 - 0.03 },
  right: { theta: Math.PI / 2, phi: Math.PI / 2 - 0.03 },
  top: { theta: 0, phi: 0.05 },
}

/** Same radius formula as CameraRig's 3D preset — "plate fills ~65% of the
 *  board stage's shorter dimension." */
export function radiusFor(board: BoardSize): number {
  const maxDimension = Math.max(board.width, board.depth)
  return maxDimension * 1.1 + 2.8
}

export function centerOf(board: BoardSize): [number, number, number] {
  return [(board.width - 1) / 2, board.height / 2, (board.depth - 1) / 2]
}

const FRAME_MARGIN = 0.9

export interface AxisCameraSpec {
  position: [number, number, number]
  target: [number, number, number]
  up: [number, number, number]
  /** orthographic frustum half-extents, in world units, view-plane axes */
  halfWidth: number
  halfHeight: number
}

/** Where an axis-aligned orthographic camera sits for one of the three
 *  views, its up vector, and how wide its frustum needs to be to frame the whole board. */
export function axisCameraFor(view: ViewName, board: BoardSize): AxisCameraSpec {
  const center = centerOf(board)
  const dist = radiusFor(board)

  switch (view) {
    case 'front': {
      // Looks along -z. Left = lowest x, Right = highest x. Top = highest y.
      const position: [number, number, number] = [center[0], center[1], center[2] + dist]
      const up: [number, number, number] = [0, 1, 0]
      const halfWidth = board.width / 2 + FRAME_MARGIN
      const halfHeight = board.height / 2 + FRAME_MARGIN
      return { position, target: center, up, halfWidth, halfHeight }
    }
    case 'right': {
      // Looks along -x. Left = highest z (front edge), Right = lowest z. Top = highest y.
      const position: [number, number, number] = [center[0] + dist, center[1], center[2]]
      const up: [number, number, number] = [0, 1, 0]
      const halfWidth = board.depth / 2 + FRAME_MARGIN
      const halfHeight = board.height / 2 + FRAME_MARGIN
      return { position, target: center, up, halfWidth, halfHeight }
    }
    case 'top': {
      // Looks along -y. Left = lowest x, Right = highest x. Top = lowest z (back edge).
      // Camera up is -z so that lowest z is at top of screen and highest z (+z) is at bottom.
      const position: [number, number, number] = [center[0], center[1] + dist, center[2]]
      const up: [number, number, number] = [0, 0, -1]
      const halfWidth = board.width / 2 + FRAME_MARGIN
      const halfHeight = board.depth / 2 + FRAME_MARGIN
      return { position, target: center, up, halfWidth, halfHeight }
    }
  }
}
