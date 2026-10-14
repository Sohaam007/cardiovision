import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useStore } from '../store/useStore.ts';
import { Heart } from './Heart.tsx';
import { Pericardium } from './Pericardium.tsx';
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

  return (
    <div className="w-full h-full relative select-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
      <Canvas
        frameloop={isBeating ? 'always' : SCENE_FRAMELOOP_CONFIG}
        dpr={SCENE_DPR_CONFIG}
        shadows={false}
        camera={{ position: [0, 0.35, 3.8], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', localClippingEnabled: true }}
      >
        <DemandInvalidator />
        <CameraTweenController controlsRef={controlsRef} />

        {/* Photorealistic Cinema 4D Studio Lighting */}
        <ambientLight intensity={0.6} />
        {/* Key Light: High-angle specular shine across aortic arch, ventricular crest & wet cut-wall edges */}
        <directionalLight position={[5, 8, 6]} intensity={1.8} color="#ffffff" />
        {/* Fill Light: Soft warm pinkish-white fill illuminating anterior myocardium */}
        <directionalLight position={[-5, 3, 4]} intensity={0.9} color="#ffe4e6" />
        {/* Rim Light: Electric cyan/sky-blue rim catching holographic torso contour & heart edges */}
        <directionalLight position={[-4, 6, -5]} intensity={1.3} color="#38bdf8" />
        {/* Posterior Depth Fill: Deep ruby-plum contour */}
        <directionalLight position={[3, -4, -5]} intensity={0.45} color="#fda4af" />
        {/* Inferior apex point bounce */}
        <pointLight position={[0, -2, 3]} intensity={0.4} color="#fca5a5" />

        {/* Anatomical Model Components */}
        <group position={[0, 0, 0]}>
          <Torso showRibs={false} />
          {/* Cardiac apparatus shifted slightly to the left side of the torso and scaled to 0.89 (safely enclosed) */}
          <group position={[-0.16, 0.02, 0]} scale={[0.89, 0.89, 0.89]} name="CardiacApparatus">
            <Pericardium />
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
