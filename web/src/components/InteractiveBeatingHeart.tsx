import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { cardiacAudio } from '../audio/cardiacAudio';
import { useStore } from '../store/useStore';
import { Torso } from '../scene/Torso';

interface BeatingHeartModelProps {
  isPlaying: boolean;
  speed: number;
  phase: 'auto' | 'systole' | 'diastole';
  isAudioMuted: boolean;
  onSoundTrigger?: (sound: 's1' | 's2') => void;
}

const BeatingHeartModel: React.FC<BeatingHeartModelProps> = ({
  isPlaying,
  speed,
  phase,
  isAudioMuted,
  onSoundTrigger,
}) => {
  const group = useRef<THREE.Group>(null);
  // Load Draco-compressed asset with offline local decoder fallback
  const { scene, animations } = useGLTF('/beating_heart.glb', '/draco/gltf/');
  const { actions, names } = useAnimations(animations, group);
  const heartOpacity = useStore((state) => state.heartOpacity);
  const showCavities = useStore((state) => state.showCavities);
  const lastSoundRef = useRef<'s1' | 's2' | 'none'>('none');

  // Modulate material opacity when heartOpacity or showCavities changes
  useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((mat) => {
            const effectiveOpacity = showCavities ? Math.min(heartOpacity, 0.42) : heartOpacity;
            mat.transparent = effectiveOpacity < 0.98 || showCavities;
            mat.opacity = effectiveOpacity;
            mat.depthWrite = !showCavities && effectiveOpacity > 0.85;
          });
        }
      }
    });
  }, [scene, heartOpacity, showCavities]);

  useEffect(() => {
    if (names.length > 0 && names[0]) {
      const action = actions[names[0]];
      if (action) {
        const clipDuration = action.getClip().duration || 1.0;
        action.setEffectiveTimeScale(speed);

        if (phase === 'systole') {
          action.paused = true;
          action.time = clipDuration * 0.25;
        } else if (phase === 'diastole') {
          action.paused = true;
          action.time = clipDuration * 0.70;
        } else {
          // Auto
          if (isPlaying) {
            action.paused = false;
            action.play();
          } else {
            action.paused = true;
          }
        }
      }
    }
  }, [actions, names, isPlaying, speed, phase]);

  useFrame(() => {
    if (names.length > 0 && names[0]) {
      const action = actions[names[0]];
      if (action && !action.paused && isPlaying && phase === 'auto') {
        const clipDuration = action.getClip().duration || 1.0;
        const progress = (action.time % clipDuration) / clipDuration;
        if (progress >= 0.04 && progress <= 0.12 && lastSoundRef.current !== 's1') {
          if (!isAudioMuted) cardiacAudio.playS1();
          lastSoundRef.current = 's1';
          onSoundTrigger?.('s1');
        } else if (progress >= 0.36 && progress <= 0.44 && lastSoundRef.current !== 's2') {
          if (!isAudioMuted) cardiacAudio.playS2();
          lastSoundRef.current = 's2';
          onSoundTrigger?.('s2');
        } else if (progress > 0.50 && progress < 0.90 && lastSoundRef.current !== 'none') {
          lastSoundRef.current = 'none';
        }
      }
    }
  });

  return (
    <group ref={group} dispose={null}>
      {/* Centered and scaled to match standard cardiac viewport */}
      <primitive
        object={scene}
        position={[0, -0.83, 0]}
        scale={[10.0, 10.0, 10.0]}
      />
    </group>
  );
};

// Pre-load the asset so there is zero hitch on tab selection
useGLTF.preload('/beating_heart.glb', '/draco/gltf/');

const CameraPresetController: React.FC<{ controlsRef: React.RefObject<OrbitControlsImpl> }> = ({ controlsRef }) => {
  const cameraPreset = useStore((state) => state.cameraPreset);
  const { camera } = useThree();

  useEffect(() => {
    if (!cameraPreset) return;
    if (cameraPreset === 'anterior') {
      camera.position.set(0, 0.2, 2.5);
    } else if (cameraPreset === 'lateral') {
      camera.position.set(-2.0, 0.2, 1.2);
    } else if (cameraPreset === 'posterior') {
      camera.position.set(0, 0.2, -2.5);
    }
    if (controlsRef.current) {
      controlsRef.current.target.set(0, -0.1, 0);
      controlsRef.current.update();
    }
  }, [cameraPreset, camera, controlsRef]);

  return null;
};

const CameraZoomController: React.FC = () => {
  const zoomLevel = useStore((state) => state.zoomLevel);
  const { camera } = useThree();

  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera || camera instanceof THREE.OrthographicCamera) {
      camera.zoom = zoomLevel;
      camera.updateProjectionMatrix();
    }
  }, [zoomLevel, camera]);

  return null;
};

interface InteractiveBeatingHeartProps {
  fullScreen?: boolean;
}

export const InteractiveBeatingHeart: React.FC<InteractiveBeatingHeartProps> = ({ fullScreen = false }) => {
  // Store values for synchronized control
  const storeIsPlaying = useStore((state) => state.isPlaying);
  const storeSpeed = useStore((state) => state.beatingSpeed);
  const storePhase = useStore((state) => state.cardiacPhase);
  const storeAudioMuted = useStore((state) => state.isAudioMuted);
  const togglePlayback = useStore((state) => state.togglePlayback);
  const setCardiacPhase = useStore((state) => state.setCardiacPhase);
  const setBeatingSpeed = useStore((state) => state.setBeatingSpeed);
  const toggleAudio = useStore((state) => state.toggleAudio);
  const fluoroscopyMode = useStore((state) => state.fluoroscopyMode);

  // Local fallback state if not in fullScreen (e.g. standalone modal)
  const [localPlaying, setLocalPlaying] = useState<boolean>(true);
  const [localSpeed, setLocalSpeed] = useState<number>(1.0);
  const [localPhase, setLocalPhase] = useState<'auto' | 'systole' | 'diastole'>('auto');
  const [localAudioMuted, setLocalAudioMuted] = useState<boolean>(true);
  const [lastSound, setLastSound] = useState<'s1' | 's2' | 'none'>('none');
  const controlsRef = useRef<OrbitControlsImpl>(null);

  const isPlaying = fullScreen ? storeIsPlaying : localPlaying;
  const speed = fullScreen ? storeSpeed : localSpeed;
  const phase = fullScreen ? storePhase : localPhase;
  const isAudioMuted = fullScreen ? storeAudioMuted : localAudioMuted;

  const setIsPlaying = (p: boolean) => {
    if (fullScreen) {
      if (storeIsPlaying !== p) togglePlayback();
    } else {
      setLocalPlaying(p);
    }
  };

  const setSpeed = (s: number) => {
    if (fullScreen) {
      setBeatingSpeed(s);
    } else {
      setLocalSpeed(s);
    }
  };

  const setPhase = (ph: 'auto' | 'systole' | 'diastole') => {
    if (fullScreen) {
      setCardiacPhase(ph);
    } else {
      setLocalPhase(ph);
    }
  };

  const setIsAudioMuted = (m: boolean) => {
    if (fullScreen) {
      if (storeAudioMuted !== m) toggleAudio();
    } else {
      setLocalAudioMuted(m);
    }
  };

  useEffect(() => {
    cardiacAudio.setMuted(isAudioMuted);
  }, [isAudioMuted]);

  const resetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  const calculatedBPM = Math.round(72 * speed);
  const avValvesOpen = phase === 'diastole' || (phase === 'auto' && isPlaying);
  const semilunarValvesOpen = phase === 'systole';

  if (fullScreen) {
    return (
      <div
        className={`w-full h-full relative flex flex-col justify-between select-none overflow-hidden transition-colors duration-500 ${
          fluoroscopyMode
            ? 'bg-gradient-to-b from-slate-300 via-slate-400 to-slate-200'
            : 'bg-slate-950'
        }`}
      >
        <div className="relative w-full h-full flex-1 flex items-center justify-center overflow-hidden">
          <Suspense
            fallback={
              <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
                <div className="w-10 h-10 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-mono">Loading Photorealistic Beating Heart (1.39 MB)...</span>
              </div>
            }
          >
            <Canvas
              camera={{ position: [0, 0.25, 3.0], fov: 45 }}
              gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
            >
              <ambientLight intensity={fluoroscopyMode ? 1.8 : 0.9} color={fluoroscopyMode ? '#f8fafc' : '#ffffff'} />
              <directionalLight position={[5, 8, 5]} intensity={fluoroscopyMode ? 2.2 : 1.4} />
              <directionalLight position={[-5, -4, -5]} intensity={fluoroscopyMode ? 1.2 : 0.6} />
              <pointLight position={[0, -2, 2]} intensity={0.5} color={fluoroscopyMode ? '#ffffff' : '#fda4af'} />

              {/* Anatomical Holographic Torso Housing */}
              <Torso showRibs={false} />

              {/* Beating Heart Apparatus */}
              <group position={[-0.16, 0.02, 0]} scale={[0.89, 0.89, 0.89]} name="CardiacApparatus">
                <BeatingHeartModel
                  isPlaying={isPlaying}
                  speed={speed}
                  phase={phase}
                  isAudioMuted={isAudioMuted}
                  onSoundTrigger={(s) => setLastSound(s)}
                />
              </group>

              <CameraPresetController controlsRef={controlsRef} />
              <CameraZoomController />

              <OrbitControls
                ref={controlsRef}
                makeDefault
                enableDamping
                dampingFactor={0.08}
                minDistance={1.2}
                maxDistance={5.5}
                rotateSpeed={0.8}
              />
            </Canvas>
          </Suspense>

          {/* Reset Camera Button */}
          <button
            onClick={resetCamera}
            className="absolute top-4 right-4 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-700 transition-colors shadow-lg z-10"
            title="Reset Camera Orientation"
          >
            Reset View
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center gap-3 select-none">
      {/* 3D Viewport */}
      <div className="relative rounded-xl overflow-hidden border border-purple-900/60 shadow-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-black max-w-2xl w-full aspect-video flex items-center justify-center">
        <Suspense
          fallback={
            <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-mono">Loading 3D Beating Heart (1.33 MB)...</span>
            </div>
          }
        >
          <Canvas
            camera={{ position: [0, 0.25, 3.0], fov: 45 }}
            gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          >
            <ambientLight intensity={0.9} />
            <directionalLight position={[5, 8, 5]} intensity={1.4} />
            <directionalLight position={[-5, -4, -5]} intensity={0.6} />
            <pointLight position={[0, -2, 2]} intensity={0.5} color="#fda4af" />

            <Torso showRibs={false} />

            <group position={[-0.16, 0.02, 0]} scale={[0.89, 0.89, 0.89]}>
              <BeatingHeartModel
                isPlaying={isPlaying}
                speed={speed}
                phase={phase}
                isAudioMuted={isAudioMuted}
                onSoundTrigger={(s) => setLastSound(s)}
              />
            </group>

            <CameraPresetController controlsRef={controlsRef} />
            <CameraZoomController />

            <OrbitControls
              ref={controlsRef}
              makeDefault
              enableDamping
              dampingFactor={0.08}
              minDistance={1.2}
              maxDistance={5.5}
              rotateSpeed={0.8}
            />
          </Canvas>
        </Suspense>

        {/* Live HUD Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1 pointer-events-none">
          <div className="bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-md text-[11px] font-mono text-purple-300 border border-purple-800/70 flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isPlaying && phase === 'auto'
                  ? 'bg-emerald-400 animate-ping'
                  : 'bg-amber-400'
              }`}
            />
            <span>
              {phase === 'systole'
                ? 'Systole Freeze'
                : phase === 'diastole'
                ? 'Diastole Freeze'
                : isPlaying
                ? `Pulsing ~${calculatedBPM} BPM`
                : 'Animation Paused'}
            </span>
          </div>

          {/* Valve Movement Status Indicators */}
          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            <span
              className={`px-1.5 py-0.5 rounded border ${
                avValvesOpen
                  ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300'
                  : 'bg-rose-950/80 border-rose-600 text-rose-300'
              }`}
            >
              AV: {avValvesOpen ? 'OPEN' : 'CLOSED'}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded border ${
                semilunarValvesOpen
                  ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300'
                  : 'bg-rose-950/80 border-rose-600 text-rose-300'
              }`}
            >
              Semilunar: {semilunarValvesOpen ? 'OPEN' : 'CLOSED'}
            </span>
          </div>
        </div>

        {/* View Reset Button */}
        <button
          onClick={resetCamera}
          className="absolute top-3 right-3 bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-white px-2.5 py-1 rounded text-[11px] font-medium border border-slate-700 transition-colors"
          title="Reset Camera Orientation"
        >
          Reset View
        </button>
      </div>

      {/* Interactive Controls Bar */}
      <div className="w-full max-w-2xl bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Play/Pause & Phase Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
              isPlaying
                ? 'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700/60'
                : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60'
            }`}
          >
            <span>{isPlaying ? '⏸ Pause' : '▶ Play'}</span>
          </button>

          {/* Phase selectors */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            {(['auto', 'systole', 'diastole'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPhase(p)}
                className={`px-2 py-1 rounded-md text-[11px] font-medium capitalize transition-colors ${
                  phase === p
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 font-medium mr-1">Rate:</span>
          {[0.5, 1.0, 1.5, 2.0].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                speed === s
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Sound toggle */}
        <button
          onClick={() => setIsAudioMuted(!isAudioMuted)}
          className={`px-2.5 py-1 rounded-lg border font-medium transition-colors flex items-center gap-1.5 ${
            !isAudioMuted
              ? 'bg-purple-950 text-purple-200 border-purple-500'
              : 'bg-slate-900 text-slate-400 border-slate-800'
          }`}
          title="Toggle synchronized physiological S1/S2 heart sounds"
        >
          <span>{!isAudioMuted ? '🔊 Sound: ON' : '🔇 Muted'}</span>
          {!isAudioMuted && lastSound !== 'none' && (
            <span className="px-1 rounded bg-purple-600 text-white font-mono text-[9px] animate-bounce">
              {lastSound === 's1' ? 'Lub' : 'Dub'}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
