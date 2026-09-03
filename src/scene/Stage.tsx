import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { useSession } from '../state/session'
import { Baseplate } from './Baseplate'
import { CameraRig, type CameraPreset } from './CameraRig'

export function Stage() {
  const board = useSession((state) => state.derived.puzzle.board)
  const [activePreset, setActivePreset] = useState<CameraPreset | null>('3d')

  return (
    <div className="stage-container">
      <Canvas
        gl={{ antialias: true, alpha: true }}
        camera={{ fov: 45, near: 0.1, far: 120 }}
      >
        <ambientLight intensity={0.4} />
        <hemisphereLight args={['#FFFFFF', '#9AA7BD', 0.8]} />
        <directionalLight
          position={[6, 12, 8]}
          intensity={0.65}
          color="#FFFFFF"
        />
        <CameraRig
          board={board}
          activePreset={activePreset}
          onUserDrag={() => setActivePreset(null)}
        />
        <Baseplate board={board} />
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
