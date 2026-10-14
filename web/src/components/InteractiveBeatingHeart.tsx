import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

interface BeatingHeartModelProps {
  isPlaying: boolean;
  speed: number;
}

const BeatingHeartModel: React.FC<BeatingHeartModelProps> = ({ isPlaying, speed }) => {
  const group = useRef<THREE.Group>(null);
  // Load Draco-compressed asset with offline local decoder fallback
  const { scene, animations } = useGLTF('/beating_heart.glb', '/draco/gltf/');
  const { actions, names } = useAnimations(animations, group);

  useEffect(() => {
    if (names.length > 0 && names[0]) {
      const action = actions[names[0]];
      if (action) {
        action.setEffectiveTimeScale(speed);
        if (isPlaying) {
          action.paused = false;
          action.play();
        } else {
          action.paused = true;
        }
      }
    }
  }, [actions, names, isPlaying, speed]);

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

export const InteractiveBeatingHeart: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(1.0);
  const controlsRef = useRef<OrbitControlsImpl>(null);

  const resetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  const calculatedBPM = Math.round(72 * speed);

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
            camera={{ position: [0, 0.2, 2.5], fov: 45 }}
            gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          >
            <ambientLight intensity={0.9} />
            <directionalLight position={[5, 8, 5]} intensity={1.4} />
            <directionalLight position={[-5, -4, -5]} intensity={0.6} />
            <pointLight position={[0, -2, 2]} intensity={0.5} color="#fda4af" />

            <BeatingHeartModel isPlaying={isPlaying} speed={speed} />

            <OrbitControls
              ref={controlsRef}
              makeDefault
              enableDamping
              dampingFactor={0.08}
              minDistance={1.2}
              maxDistance={5.0}
              rotateSpeed={0.8}
            />
          </Canvas>
        </Suspense>

        {/* Live HUD Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1 pointer-events-none">
          <div className="bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-md text-[11px] font-mono text-purple-300 border border-purple-800/70 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
            <span>{isPlaying ? `Pulsing ~${calculatedBPM} BPM` : 'Animation Paused'}</span>
          </div>
          <div className="bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-slate-400 font-medium">
            Drag to Rotate &bull; Scroll to Zoom
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
        {/* Play/Pause Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
              isPlaying
                ? 'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700/60'
                : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60'
            }`}
          >
            {isPlaying ? (
              <>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>Pause Motion</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                <span>Play Animation</span>
              </>
            )}
          </button>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 font-medium mr-1">Speed:</span>
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

        {/* Attribution Badge */}
        <div className="text-[11px] text-slate-400">
          Model: <span className="text-slate-300 font-medium">Beating Heart</span> (CC BY 4.0 jalmer)
        </div>
      </div>
    </div>
  );
};
