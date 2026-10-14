import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';

interface Position {
  x: number;
  y: number;
}

export const DraggableToolsMenu: React.FC = () => {
  // Store bindings
  const showHemodynamics = useStore((state) => state.showHemodynamics);
  const toggleHemodynamics = useStore((state) => state.toggleHemodynamics);
  const showCavities = useStore((state) => state.showCavities);
  const toggleCavities = useStore((state) => state.toggleCavities);
  const showPerfusion = useStore((state) => state.showPerfusion);
  const togglePerfusion = useStore((state) => state.togglePerfusion);
  const showCalibers = useStore((state) => state.showCalibers);
  const toggleCalibers = useStore((state) => state.toggleCalibers);
  const showECG = useStore((state) => state.showECG);
  const toggleECG = useStore((state) => state.toggleECG);
  const fluoroscopyMode = useStore((state) => state.fluoroscopyMode);
  const toggleFluoroscopyMode = useStore((state) => state.toggleFluoroscopyMode);
  const showTorso = useStore((state) => state.showTorso);
  const toggleTorso = useStore((state) => state.toggleTorso);

  const isPlaying = useStore((state) => state.isPlaying);
  const togglePlayback = useStore((state) => state.togglePlayback);
  const cardiacPhase = useStore((state) => state.cardiacPhase);
  const setCardiacPhase = useStore((state) => state.setCardiacPhase);
  const heartRateBpm = useStore((state) => state.heartRateBpm);
  const setHeartRateBpm = useStore((state) => state.setHeartRateBpm);

  const isAudioMuted = useStore((state) => state.isAudioMuted);
  const toggleAudio = useStore((state) => state.toggleAudio);

  const setCameraPreset = useStore((state) => state.setCameraPreset);
  const isTweening = useStore((state) => state.isTweening);

  const zoomLevel = useStore((state) => state.zoomLevel);
  const zoomIn = useStore((state) => state.zoomIn);
  const zoomOut = useStore((state) => state.zoomOut);
  const resetZoom = useStore((state) => state.resetZoom);

  // Widget state
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [position, setPosition] = useState<Position>({ x: 16, y: 72 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragOffsetRef = useRef<{ offsetX: number; offsetY: number }>({ offsetX: 0, offsetY: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Boundary clamping and corner snapping helper
  const clampAndSnap = useCallback((pos: Position, menuWidth: number, menuHeight: number): Position => {
    const parent = containerRef.current?.parentElement;
    const parentWidth = parent?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 800);
    const parentHeight = parent?.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 600);

    const margin = 12;
    const snapThreshold = 28;

    let minX = margin;
    let maxX = Math.max(margin, parentWidth - menuWidth - margin);
    let minY = margin;
    let maxY = Math.max(margin, parentHeight - menuHeight - margin);

    let clampedX = Math.max(minX, Math.min(maxX, pos.x));
    let clampedY = Math.max(minY, Math.min(maxY, pos.y));

    // Corner / edge snapping
    if (clampedX - minX < snapThreshold) clampedX = minX;
    if (maxX - clampedX < snapThreshold) clampedX = maxX;
    if (clampedY - minY < snapThreshold) clampedY = minY;
    if (maxY - clampedY < snapThreshold) clampedY = maxY;

    return { x: clampedX, y: clampedY };
  }, []);

  // Dragging event listeners
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only drag from handle or header
    e.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    dragOffsetRef.current = {
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const onPointerMove = (e: PointerEvent) => {
      const parent = containerRef.current?.parentElement;
      const parentRect = parent?.getBoundingClientRect() || { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
      const menuWidth = containerRef.current?.offsetWidth || 288;
      const menuHeight = containerRef.current?.offsetHeight || 300;

      const rawX = e.clientX - parentRect.left - dragOffsetRef.current.offsetX;
      const rawY = e.clientY - parentRect.top - dragOffsetRef.current.offsetY;

      const bounded = clampAndSnap({ x: rawX, y: rawY }, menuWidth, menuHeight);
      setPosition(bounded);
    };

    const onPointerUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [isDragging, clampAndSnap]);

  // Prevent wheel scroll bleed into 3D OrbitControls
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const stopWheel = (e: Event) => e.stopPropagation();
    el.addEventListener('wheel', stopWheel, { passive: false });

    return () => {
      el.removeEventListener('wheel', stopWheel);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        touchAction: 'none',
      }}
      className={`absolute top-0 left-0 z-30 select-none ${
        isDragging ? 'cursor-grabbing shadow-2xl scale-[1.01]' : 'shadow-xl'
      }`}
      data-testid="draggable-tools-menu"
    >
      {isCollapsed ? (
        /* Collapsed Floating Chip / Pill */
        <div
          onPointerDown={handlePointerDown}
          className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 hover:border-cyan-500/50 rounded-full px-3 py-1.5 flex items-center gap-2 cursor-grab text-xs text-slate-200 shadow-2xl hover:bg-slate-800"
          title="Click to expand viewport tools or drag to reposition"
          data-testid="tools-collapsed-pill"
        >
          <span className="text-cyan-400 font-bold">⠿</span>
          <span className="font-semibold text-slate-100 flex items-center gap-1.5">
            <span>🛠️ Viewport Tools</span>
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed(false);
            }}
            className="w-5 h-5 rounded-full bg-slate-800 hover:bg-cyan-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors text-[10px]"
            title="Expand Tools HUD"
            aria-label="Expand Tools HUD"
            data-testid="expand-tools-btn"
          >
            ▼
          </button>
        </div>
      ) : (
        /* Expanded Glassmorphic HUD Panel */
        <div className="w-72 bg-[#090d16]/95 backdrop-blur-md border border-slate-800/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-200 text-xs">
          {/* Draggable Header */}
          <div
            onPointerDown={handlePointerDown}
            className="bg-slate-900/90 border-b border-slate-800/80 px-3.5 py-2.5 flex items-center justify-between cursor-grab active:cursor-grabbing hover:bg-slate-800/60 transition-colors"
            title="Drag to reposition tools HUD"
            data-testid="tools-drag-handle"
          >
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 text-sm font-bold">⠿</span>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-white tracking-wide text-xs">Viewport Tools</span>
                <span className="text-[10px] font-mono uppercase bg-cyan-950 text-cyan-300 border border-cyan-800/60 px-1.5 py-0.2 rounded">
                  HUD
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsCollapsed(true);
              }}
              className="w-6 h-6 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-xs transition-colors border border-slate-700/60"
              title="Minimize to floating chip"
              aria-label="Collapse Tools Menu"
              data-testid="collapse-tools-btn"
            >
              ▲
            </button>
          </div>

          <div className="p-3 flex flex-col gap-3 max-h-[75vh] overflow-y-auto">
            {/* 1. Viewport Layer Toggles */}
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                <span>Anatomical Layers</span>
                <span className="text-slate-500 font-mono text-[9px]">Toggle</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={toggleHemodynamics}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border transition-all flex items-center gap-1.5 ${
                    showHemodynamics
                      ? 'bg-cyan-950/80 text-cyan-200 border-cyan-500 shadow-sm shadow-cyan-950/50'
                      : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                  }`}
                  data-testid="toggle-hemodynamics"
                  title="Toggle hemodynamic blood flow velocity stream pulses"
                >
                  <span>🌊 Flow</span>
                  <span className={`w-1.5 h-1.5 rounded-full ml-auto ${showHemodynamics ? 'bg-cyan-400' : 'bg-slate-600'}`} />
                </button>

                <button
                  type="button"
                  onClick={toggleCavities}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border transition-all flex items-center gap-1.5 ${
                    showCavities
                      ? 'bg-purple-950/80 text-purple-200 border-purple-500 shadow-sm shadow-purple-950/50'
                      : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                  }`}
                  data-testid="toggle-cavities"
                  title="Toggle interior cavities, ventricles, and heart valves"
                >
                  <span>🫀 Cavities</span>
                  <span className={`w-1.5 h-1.5 rounded-full ml-auto ${showCavities ? 'bg-purple-400' : 'bg-slate-600'}`} />
                </button>

                <button
                  type="button"
                  onClick={togglePerfusion}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border transition-all flex items-center gap-1.5 ${
                    showPerfusion
                      ? 'bg-emerald-950/80 text-emerald-200 border-emerald-500 shadow-sm shadow-emerald-950/50'
                      : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                  }`}
                  data-testid="toggle-perfusion"
                  title="Toggle myocardial vascular perfusion territory map"
                >
                  <span>🗺️ Perfusion</span>
                  <span className={`w-1.5 h-1.5 rounded-full ml-auto ${showPerfusion ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                </button>

                <button
                  type="button"
                  onClick={toggleCalibers}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border transition-all flex items-center gap-1.5 ${
                    showCalibers
                      ? 'bg-blue-950/80 text-blue-200 border-blue-500 shadow-sm shadow-blue-950/50'
                      : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                  }`}
                  data-testid="toggle-calibers"
                  title="Toggle vessel labels, calibers, and probability chips"
                >
                  <span>🏷️ Labels</span>
                  <span className={`w-1.5 h-1.5 rounded-full ml-auto ${showCalibers ? 'bg-blue-400' : 'bg-slate-600'}`} />
                </button>

                <button
                  type="button"
                  onClick={toggleECG}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border transition-all flex items-center gap-1.5 ${
                    showECG
                      ? 'bg-amber-950/80 text-amber-200 border-amber-500 shadow-sm shadow-amber-950/50'
                      : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                  }`}
                  data-testid="toggle-ecg"
                  title="Toggle synchronized physiological ECG rhythm strip"
                >
                  <span>📈 ECG Strip</span>
                  <span className={`w-1.5 h-1.5 rounded-full ml-auto ${showECG ? 'bg-amber-400' : 'bg-slate-600'}`} />
                </button>

                <button
                  type="button"
                  onClick={toggleFluoroscopyMode}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border transition-all flex items-center gap-1.5 ${
                    fluoroscopyMode
                      ? 'bg-amber-600 text-white border-amber-400 shadow-sm shadow-amber-950/50'
                      : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                  }`}
                  data-testid="toggle-fluoroscopy"
                  title="Toggle Cath-Lab Cine Fluoroscopy X-Ray radiographic contrast mode"
                >
                  <span>⚡ Cine X-Ray</span>
                  <span className={`w-1.5 h-1.5 rounded-full ml-auto ${fluoroscopyMode ? 'bg-white' : 'bg-slate-600'}`} />
                </button>

                <button
                  type="button"
                  onClick={toggleTorso}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border transition-all flex items-center gap-1.5 ${
                    showTorso
                      ? 'bg-sky-950/80 text-sky-200 border-sky-500 shadow-sm shadow-sky-950/50'
                      : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                  }`}
                  data-testid="toggle-torso"
                  title="Toggle anatomical holographic thoracic torso and ribcage housing"
                >
                  <span>👤 Torso</span>
                  <span className={`w-1.5 h-1.5 rounded-full ml-auto ${showTorso ? 'bg-sky-400' : 'bg-slate-600'}`} />
                </button>
              </div>
            </div>

            {/* 2. Cardiac Playback & Physiological Motion */}
            <div className="border-t border-slate-800/80 pt-2.5">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                <span>Cardiac Motion &amp; Phase</span>
                <span className="font-mono text-rose-400 text-[10px] font-semibold">{heartRateBpm} BPM</span>
              </div>

              {/* Play/Pause & Phase Buttons */}
              <div className="flex items-center gap-1.5 mb-2">
                <button
                  type="button"
                  onClick={togglePlayback}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                    isPlaying
                      ? 'bg-emerald-950/80 text-emerald-200 border-emerald-500 hover:bg-emerald-900/80 shadow-sm shadow-emerald-950/50'
                      : 'bg-amber-950/80 text-amber-200 border-amber-500 hover:bg-amber-900/80 shadow-sm shadow-amber-950/50'
                  }`}
                  data-testid="toggle-playback"
                  title={isPlaying ? 'Pause cardiac motion' : 'Play cardiac motion'}
                >
                  <span>{isPlaying ? '⏸ Pause' : '▶ Play'}</span>
                </button>

                {/* Phase Selection Chips */}
                <div className="flex items-center bg-slate-900/80 p-0.5 rounded-lg border border-slate-800">
                  {(['auto', 'diastole', 'systole'] as const).map((ph) => (
                    <button
                      key={ph}
                      type="button"
                      onClick={() => setCardiacPhase(ph)}
                      className={`px-2 py-1 rounded-md text-[10px] font-medium capitalize transition-all ${
                        cardiacPhase === ph
                          ? 'bg-cyan-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      data-testid={`phase-${ph}`}
                    >
                      {ph}
                    </button>
                  ))}
                </div>
              </div>

              {/* BPM Scrubber */}
              <div className="flex items-center gap-2 bg-slate-950/50 p-1.5 rounded-lg border border-slate-800/60">
                <span className="text-[10px] text-slate-400">Rate:</span>
                <input
                  type="range"
                  min="40"
                  max="140"
                  step="2"
                  value={heartRateBpm}
                  onChange={(e) => setHeartRateBpm(parseInt(e.target.value, 10))}
                  className="flex-1 h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-rose-500"
                  data-testid="bpm-slider"
                  title="Adjust heart rate BPM"
                />
                <span className="font-mono text-[10px] text-slate-300 w-8 text-right font-bold">
                  {heartRateBpm}
                </span>
              </div>
            </div>

            {/* 3. Auscultation Audio & Camera Presets */}
            <div className="border-t border-slate-800/80 pt-2.5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Auscultation</span>
                <button
                  type="button"
                  onClick={toggleAudio}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all flex items-center gap-1.5 ${
                    !isAudioMuted
                      ? 'bg-rose-950/80 text-rose-200 border-rose-500 shadow-sm shadow-rose-950/50'
                      : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                  data-testid="toggle-audio"
                  title="Toggle synthesized physiological heart sounds (S1 'Lub' / S2 'Dub')"
                >
                  <span>{!isAudioMuted ? '🔊 Heart Sounds ON' : '🔇 Audio Muted'}</span>
                </button>
              </div>

              {/* Camera Presets */}
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">
                  Camera Presets
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => setCameraPreset('anterior')}
                    disabled={isTweening}
                    className="py-1 px-1.5 rounded-lg text-[10px] font-medium bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 transition-colors disabled:opacity-50 text-center"
                    data-testid="camera-anterior"
                    title="Frontal anterior view: LAD overview"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => setCameraPreset('lateral')}
                    disabled={isTweening}
                    className="py-1 px-1.5 rounded-lg text-[10px] font-medium bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 transition-colors disabled:opacity-50 text-center flex items-center justify-center gap-1"
                    data-testid="camera-lateral"
                    title="Left lateral view: LCX groove"
                  >
                    <span>Lateral</span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-950 text-cyan-300 font-mono font-bold">
                      LCX
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCameraPreset('posterior')}
                    disabled={isTweening}
                    className="py-1 px-1.5 rounded-lg text-[10px] font-medium bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 transition-colors disabled:opacity-50 text-center"
                    data-testid="camera-posterior"
                    title="Posterior view: RCA Crux"
                  >
                    Posterior
                  </button>
                </div>
              </div>
            </div>

            {/* 4. Canvas Zoom Controls */}
            <div className="border-t border-slate-800/80 pt-2 flex items-center justify-between gap-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Zoom:</span>
              <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={zoomOut}
                  className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center justify-center text-xs font-bold transition-colors"
                  data-testid="zoom-out"
                  title="Zoom Out"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={resetZoom}
                  className="px-2 py-0.5 rounded text-[10px] font-mono font-bold text-cyan-300 hover:bg-slate-800 transition-colors"
                  data-testid="zoom-reset"
                  title="Reset to 100% zoom"
                >
                  {Math.round(zoomLevel * 100)}%
                </button>
                <button
                  type="button"
                  onClick={zoomIn}
                  className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center justify-center text-xs font-bold transition-colors"
                  data-testid="zoom-in"
                  title="Zoom In"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
