import React, { useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useStore } from '../store/useStore';
import { Heart } from './Heart';
import { Torso } from './Torso';
import { Vessels } from './Vessels';

export const SCENE_DPR_CONFIG: [number, number] = [1, 1.5];
export const SCENE_FRAMELOOP_CONFIG = 'demand';

/**
 * Subscribes to Zustand state mutations outside the React render loop
 * and requests a single frame repaint via R3F's invalidate().
 * Guarantees 0% idle GPU usage while maintaining instantaneous UI responsiveness.
 */
export const DemandInvalidator: React.FC = () => {
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    // Initial draw on mount
    invalidate();

    // Subscribe to store updates
    const unsubscribe = useStore.subscribe(() => {
      invalidate();
    });

    return unsubscribe;
  }, [invalidate]);

  return null;
};

/**
 * Listens for camera preset trigger events and repositions the camera
 * to standard clinical viewing angles.
 */
interface CameraControllerProps {
  controlsRef: React.RefObject<OrbitControlsImpl>;
}

const CameraPresetController: React.FC<CameraControllerProps> = ({ controlsRef }) => {
  const cameraPreset = useStore((state) => state.cameraPreset);
  const setCameraPreset = useStore((state) => state.setCameraPreset);
  const { camera, invalidate } = useThree();

  useEffect(() => {
    if (!cameraPreset) return;

    if (cameraPreset === 'anterior') {
      camera.position.set(0, 0.35, 3.8);
    } else if (cameraPreset === 'lateral') {
      // Patient left lateral view - ideal for inspecting LCX
      camera.position.set(3.8, 0.35, 0.2);
    } else if (cameraPreset === 'posterior') {
      // Posterior view - ideal for inspecting distal LCX and RCA crux
      camera.position.set(0.2, 0.35, -3.8);
    }

    camera.lookAt(0, 0, 0);

    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }

    invalidate();
    setCameraPreset(null);
  }, [cameraPreset, camera, controlsRef, invalidate, setCameraPreset]);

  return null;
};

const SceneControls: React.FC<{ controlsRef: React.RefObject<OrbitControlsImpl> }> = ({
  controlsRef,
}) => {
  const invalidate = useThree((state) => state.invalidate);
  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping={true}
      dampingFactor={0.08}
      minDistance={1.8}
      maxDistance={7.5}
      onChange={() => invalidate()}
    />
  );
};

export const SceneCanvas: React.FC = () => {
  const controlsRef = useRef<OrbitControlsImpl>(null);

  return (
    <div className="w-full h-full relative select-none bg-radial from-slate-900 to-slate-950">
      <Canvas
        frameloop={SCENE_FRAMELOOP_CONFIG}
        dpr={SCENE_DPR_CONFIG}
        shadows={false}
        camera={{ position: [0, 0.35, 3.8], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <DemandInvalidator />
        <CameraPresetController controlsRef={controlsRef} />

        {/* Lightweight balanced lighting */}
        <ambientLight intensity={0.75} />
        <directionalLight position={[6, 8, 6]} intensity={1.2} />
        <directionalLight position={[-6, -4, -6]} intensity={0.4} />
        <pointLight position={[0, -3, 2]} intensity={0.3} color="#fca5a5" />

        {/* Anatomical Model Components */}
        <group position={[0, 0, 0]}>
          <Torso />
          <Heart />
          <Vessels />
        </group>

        {/* Interactive Controls calling invalidate() on motion */}
        <SceneControls controlsRef={controlsRef} />
      </Canvas>
    </div>
  );
};
