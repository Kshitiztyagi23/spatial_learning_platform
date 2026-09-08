import { useState, useRef, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import type * as THREE from 'three'
import { useSession } from '../state/session'
import { Baseplate } from './Baseplate'
import { CameraRig, type CameraPreset } from './CameraRig'
import { PlacedBricks } from './PlacedBricks'
import { SceneInteraction } from './SceneInteraction'

export function Stage() {
  const board = useSession((state) => state.derived.puzzle.board)
  const wrongInstanceIds = useSession((state) => state.lastCheck?.wrongInstanceIds)
  const [activePreset, setActivePreset] = useState<CameraPreset | null>('3d')
  const [highlightedInstanceId, setHighlightedInstanceId] = useState<string | null>(null)

  // Erase-mode hover target and Check's wrong-brick flags both read as "this needs attention"
  const highlightedInstanceIds = useMemo(() => {
    const ids = new Set(wrongInstanceIds ?? [])
    if (highlightedInstanceId) ids.add(highlightedInstanceId)
    return ids
  }, [wrongInstanceIds, highlightedInstanceId])

  const plateRef = useRef<THREE.Mesh>(null)
  const placedRef = useRef<THREE.Group>(null)

  return (
    <div className="stage-container">
      <Canvas
        gl={{ antialias: true, alpha: true }}
        camera={{ fov: 45, near: 0.1, far: 120 }}
        shadows
      >
        <ambientLight intensity={0.4} />
        <hemisphereLight args={['#FFFFFF', '#9AA7BD', 0.8]} />
        <directionalLight
          position={[6, 12, 8]}
          intensity={0.65}
          color="#FFFFFF"
          castShadow
        />
        <CameraRig
          board={board}
          activePreset={activePreset}
          onUserDrag={() => setActivePreset(null)}
        />
        <Baseplate ref={plateRef} board={board} />
        <PlacedBricks ref={placedRef} highlightedInstanceIds={highlightedInstanceIds} />
        <SceneInteraction
          plateRef={plateRef}
          placedRef={placedRef}
          onHighlightChange={setHighlightedInstanceId}
        />
      </Canvas>

      <div className="stage-presets" role="toolbar" aria-label="Camera presets">
        <button
          type="button"
          className={`preset-button ${activePreset === 'front' ? 'active' : ''}`}
          onClick={() => setActivePreset('front')}
        >
          Front{activePreset === 'front' ? ' ▾' : ''}
        </button>
        <button
          type="button"
          className={`preset-button ${activePreset === 'right' ? 'active' : ''}`}
          onClick={() => setActivePreset('right')}
        >
          Right{activePreset === 'right' ? ' ▾' : ''}
        </button>
        <button
          type="button"
          className={`preset-button ${activePreset === 'top' ? 'active' : ''}`}
          onClick={() => setActivePreset('top')}
        >
          Top{activePreset === 'top' ? ' ▾' : ''}
        </button>
        <button
          type="button"
          className={`preset-button ${activePreset === '3d' ? 'active' : ''}`}
          onClick={() => setActivePreset('3d')}
        >
          3D{activePreset === '3d' ? ' ▾' : ''}
        </button>
      </div>
    </div>
  )
}
