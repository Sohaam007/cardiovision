import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useStore } from '../store/useStore.ts';
import { Heart } from './Heart.tsx';
import { Torso } from './Torso.tsx';
import { Vessels } from './Vessels.tsx';
import {
  SCENE_DPR_CONFIG,
  SCENE_FRAMELOOP_CONFIG,
  ORBIT_CONTROLS_CONFIG,
  CAMERA_PRESETS,
  VESSEL_FOCUS_PRESETS,
  CAMERA_TWEEN_DURATION_MS,
  easeInOutCubic,
} from './sceneConfig.ts';

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
 * Camera preset & vessel focus controller with smooth cubic tweening.
 * Animates both camera position and OrbitControls target simultaneously,
 * maintaining demand frameloop invalidations during transitions.
 */
interface CameraControllerProps {
  controlsRef: React.RefObject<OrbitControlsImpl>;
}

const CameraTweenController: React.FC<CameraControllerProps> = ({ controlsRef }) => {
  const cameraPreset = useStore((state) => state.cameraPreset);
  const flyToVesselTarget = useStore((state) => state.flyToVesselTarget);
  const setCameraPreset = useStore((state) => state.setCameraPreset);
  const setIsTweening = useStore((state) => state.setIsTweening);
  const { camera, invalidate } = useThree();

  const animFrameRef = useRef<number | null>(null);

  const startTween = useCallback(
    (
      targetPosArr: [number, number, number],
      targetLookAtArr: [number, number, number],
      duration = CAMERA_TWEEN_DURATION_MS
    ) => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }

      const startPos = camera.position.clone();
      const startTarget = controlsRef.current
        ? controlsRef.current.target.clone()
        : new THREE.Vector3(0, 0, 0);

      const endPos = new THREE.Vector3(...targetPosArr);
      const endTarget = new THREE.Vector3(...targetLookAtArr);

      const startTime = performance.now();
      setIsTweening(true);

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const t = easeInOutCubic(progress);

        camera.position.lerpVectors(startPos, endPos, t);

        if (controlsRef.current) {
          controlsRef.current.target.lerpVectors(startTarget, endTarget, t);
          controlsRef.current.update();
        }

        invalidate();

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(animate);
        } else {
          camera.position.copy(endPos);
          if (controlsRef.current) {
            controlsRef.current.target.copy(endTarget);
            controlsRef.current.update();
          }
          invalidate();
          animFrameRef.current = null;
          setIsTweening(false);
        }
      };

      animFrameRef.current = requestAnimationFrame(animate);
    },
    [camera, controlsRef, invalidate, setIsTweening]
  );

  // Handle Preset changes (Anterior, Left Lateral, Posterior)
  useEffect(() => {
    if (!cameraPreset) return;

    const preset = CAMERA_PRESETS[cameraPreset];
    if (preset) {
      startTween(preset.position, preset.target);
    }

    setCameraPreset(null);
  }, [cameraPreset, setCameraPreset, startTween]);

  // Handle Vessel Focus changes
  useEffect(() => {
    if (!flyToVesselTarget) return;

    const focusPreset = VESSEL_FOCUS_PRESETS[flyToVesselTarget];
    if (focusPreset) {
      startTween(focusPreset.position, focusPreset.target);
    }
  }, [flyToVesselTarget, startTween]);

  // Cancel tween if user interacts with OrbitControls manually
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const onUserInteractionStart = () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
        setIsTweening(false);
      }
    };

    controls.addEventListener('start', onUserInteractionStart);
    return () => {
      controls.removeEventListener('start', onUserInteractionStart);
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [controlsRef, setIsTweening]);

  return null;
};

const SceneControls: React.FC<{ controlsRef: React.RefObject<OrbitControlsImpl> }> = ({
  controlsRef,
}) => {
  const invalidate = useThree((state) => state.invalidate);
  const camera = useThree((state) => state.camera);
  const zoomLevel = useStore((state) => state.zoomLevel);

  // Smooth cinematic exponential damping for zoom controls (+, -, reset)
  useFrame((_, delta) => {
    if (camera) {
      const diff = Math.abs(camera.zoom - zoomLevel);
      if (diff > 0.001) {
        camera.zoom = THREE.MathUtils.damp(camera.zoom, zoomLevel, 10, delta);
        camera.updateProjectionMatrix();
        invalidate();
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping={ORBIT_CONTROLS_CONFIG.enableDamping}
      dampingFactor={ORBIT_CONTROLS_CONFIG.dampingFactor}
      minDistance={ORBIT_CONTROLS_CONFIG.minDistance}
      maxDistance={ORBIT_CONTROLS_CONFIG.maxDistance}
      rotateSpeed={ORBIT_CONTROLS_CONFIG.rotateSpeed}
      zoomSpeed={ORBIT_CONTROLS_CONFIG.zoomSpeed}
      panSpeed={ORBIT_CONTROLS_CONFIG.panSpeed}
      minPolarAngle={ORBIT_CONTROLS_CONFIG.minPolarAngle}
      maxPolarAngle={ORBIT_CONTROLS_CONFIG.maxPolarAngle}
      screenSpacePanning={ORBIT_CONTROLS_CONFIG.screenSpacePanning}
      onChange={() => invalidate()}
    />
  );
};

export const SceneCanvas: React.FC = () => {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const isBeating = useStore((state) => state.isBeating);
  const fluoroscopyMode = useStore((state) => state.fluoroscopyMode);

  return (
    <div
      className={`w-full h-full relative select-none transition-colors duration-500 ${
        fluoroscopyMode
          ? 'bg-[#020617] contrast-125'
          : 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black'
      }`}
    >
      <Canvas
        frameloop={isBeating ? 'always' : SCENE_FRAMELOOP_CONFIG}
        dpr={SCENE_DPR_CONFIG}
        shadows={false}
        camera={{ position: [0, 0.35, 3.8], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', localClippingEnabled: true }}
      >
        <DemandInvalidator />
        <CameraTweenController controlsRef={controlsRef} />

        {/* Photorealistic Cinema 4D Studio vs Cath-Lab Cine Fluoroscopy Lighting */}
        <ambientLight
          intensity={fluoroscopyMode ? 1.6 : 0.6}
          color={fluoroscopyMode ? '#93c5fd' : '#ffffff'}
        />
        {/* Key Light */}
        <directionalLight
          position={fluoroscopyMode ? [0, 0, 5] : [5, 8, 6]}
          intensity={fluoroscopyMode ? 2.5 : 1.8}
          color={fluoroscopyMode ? '#e0f2fe' : '#ffffff'}
        />
        {/* Fill Light */}
        <directionalLight
          position={[-5, 3, 4]}
          intensity={fluoroscopyMode ? 0.3 : 0.9}
          color={fluoroscopyMode ? '#64748b' : '#ffe4e6'}
        />
        {/* Rim Light */}
        <directionalLight
          position={[-4, 6, -5]}
          intensity={fluoroscopyMode ? 0.2 : 1.3}
          color={fluoroscopyMode ? '#334155' : '#38bdf8'}
        />
        {/* Posterior Depth Fill */}
        <directionalLight
          position={[3, -4, -5]}
          intensity={fluoroscopyMode ? 0.1 : 0.45}
          color={fluoroscopyMode ? '#1e293b' : '#fda4af'}
        />
        {/* Inferior apex bounce */}
        <pointLight
          position={[0, -2, 3]}
          intensity={fluoroscopyMode ? 0.2 : 0.4}
          color={fluoroscopyMode ? '#38bdf8' : '#fca5a5'}
        />

        {/* Anatomical Model Components */}
        <group position={[0, 0, 0]}>
          <Torso showRibs={false} />
          {/* Cardiac apparatus shifted slightly to the left side of the torso and scaled to 0.89 (safely enclosed) */}
          <group position={[-0.16, 0.02, 0]} scale={[0.89, 0.89, 0.89]} name="CardiacApparatus">
            <Heart />
            <Vessels />
          </group>
        </group>

        {/* Interactive Controls calling invalidate() on motion */}
        <SceneControls controlsRef={controlsRef} />
      </Canvas>
    </div>
  );
};
