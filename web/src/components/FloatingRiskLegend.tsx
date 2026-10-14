import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore.ts';
import { PALETTES, VESSEL_PARAMS, getVesselColorHex } from '../scene/vesselConfig.ts';

interface Position {
  x: number;
  y: number;
}

export const FloatingRiskLegend: React.FC = () => {
  const colorblindMode = useStore((state) => state.colorblindMode);
  const toggleColorblindMode = useStore((state) => state.toggleColorblindMode);
  const showTorso = useStore((state) => state.showTorso);
  const toggleTorso = useStore((state) => state.toggleTorso);
  const chamberCutaway = useStore((state) => state.chamberCutaway);
  const toggleChamberCutaway = useStore((state) => state.toggleChamberCutaway);
  const heartOpacity = useStore((state) => state.heartOpacity);
  const setHeartOpacity = useStore((state) => state.setHeartOpacity);
  const setCameraPreset = useStore((state) => state.setCameraPreset);
  const isTweening = useStore((state) => state.isTweening);
  const selectedVessel = useStore((state) => state.selectedVessel);
  const setSelectedVessel = useStore((state) => state.setSelectedVessel);
  const predictions = useStore((state) => state.predictions);
  const viewerMode = useStore((state) => state.viewerMode);
  const force2DFallback = useStore((state) => state.force2DFallback);
  const webglError = useStore((state) => state.webglError);

  const is2D = viewerMode === '2d' || force2DFallback || webglError;
  const activePalette = colorblindMode ? PALETTES.colorblind : PALETTES.standard;

  // Movable Floating Window State
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [position, setPosition] = useState<Position>({ x: 16, y: 380 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragOffsetRef = useRef<{ offsetX: number; offsetY: number }>({ offsetX: 0, offsetY: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Boundary clamping and corner snapping helper
  const clampAndSnap = useCallback((pos: Position, menuWidth: number, menuHeight: number): Position => {
    const parent = containerRef.current?.parentElement;
    const parentWidth = parent?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 800);
    const parentHeight = parent?.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 600);

    const margin = 12;
    const snapThreshold = 24;

    const minX = margin;
    const maxX = Math.max(margin, parentWidth - menuWidth - margin);
    const minY = margin;
    const maxY = Math.max(margin, parentHeight - menuHeight - margin);

    let clampedX = Math.max(minX, Math.min(maxX, pos.x));
    let clampedY = Math.max(minY, Math.min(maxY, pos.y));

    // Corner / edge snapping
    if (clampedX - minX < snapThreshold) clampedX = minX;
    if (maxX - clampedX < snapThreshold) clampedX = maxX;
    if (clampedY - minY < snapThreshold) clampedY = minY;
    if (maxY - clampedY < snapThreshold) clampedY = maxY;

    return { x: clampedX, y: clampedY };
  }, []);

  // Position initialized dynamically based on parent height
  useEffect(() => {
    const parent = containerRef.current?.parentElement;
    if (parent && parent.clientHeight > 450) {
      setPosition((prev) => ({
        x: prev.x,
        y: Math.max(120, parent.clientHeight - 390),
      }));
    }
  }, []);

  // Dragging event listeners
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
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
      const menuWidth = containerRef.current?.offsetWidth || 300;
      const menuHeight = containerRef.current?.offsetHeight || 320;

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

  // Prevent wheel bleed into 3D OrbitControls
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
      className={`absolute top-0 left-0 z-20 select-none transition-shadow pointer-events-auto ${
        isDragging ? 'cursor-grabbing shadow-2xl scale-[1.01]' : 'shadow-xl'
      }`}
      data-testid="floating-risk-legend-window"
    >
      {isCollapsed ? (
        /* Collapsed Floating Chip / Pill */
        <div
          onPointerDown={handlePointerDown}
          className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 hover:border-cyan-500/50 rounded-full px-3 py-1.5 flex items-center gap-2.5 cursor-grab text-xs text-slate-200 shadow-2xl transition-all hover:bg-slate-800"
          title="Click to expand clinical risk scale or drag to reposition"
          data-testid="risk-legend-collapsed-pill"
        >
          <span className="text-cyan-400 font-bold">⠿</span>
          <span className="font-semibold text-slate-100 flex items-center gap-1.5">
            <span>📊 Risk Scale</span>
          </span>
          <div className="flex items-center gap-1.5 text-[10px] font-mono px-1 border-l border-slate-700">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: activePalette.low }}
              title="Low Risk (<40%)"
            />
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: activePalette.mid }}
              title="Moderate Risk (40%-70%)"
            />
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: activePalette.high }}
              title="High Risk (≥70%)"
            />
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed(false);
            }}
            className="w-5 h-5 rounded-full bg-slate-800 hover:bg-cyan-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors text-[10px]"
            title="Expand Clinical Risk Scale"
            aria-label="Expand Clinical Risk Scale"
            data-testid="expand-risk-legend-btn"
          >
            ▼
          </button>
        </div>
      ) : (
        /* Expanded Floating Window */
        <div className="w-80 bg-[#090d16]/95 backdrop-blur-md border border-slate-800/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-200 text-xs transition-all">
          {/* Draggable Header */}
          <div
            onPointerDown={handlePointerDown}
            className="bg-slate-900/90 border-b border-slate-800/80 px-3.5 py-2.5 flex items-center justify-between cursor-grab active:cursor-grabbing hover:bg-slate-800/60 transition-colors"
            title="Drag to reposition Clinical Risk Scale"
            data-testid="risk-legend-drag-handle"
          >
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 text-sm font-bold">⠿</span>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-white tracking-wide text-xs">Clinical Risk Scale</span>
                <span className="text-[10px] font-mono uppercase bg-cyan-950 text-cyan-300 border border-cyan-800/60 px-1.5 py-0.2 rounded">
                  {colorblindMode ? 'Okabe-Ito' : 'Standard'}
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
              aria-label="Collapse Risk Legend"
              data-testid="collapse-risk-legend-btn"
            >
              ▲
            </button>
          </div>

          <div className="p-3 flex flex-col gap-2.5 max-h-[75vh] overflow-y-auto">
            {/* Selected Vessel Details Card */}
            {selectedVessel && (
              <div className="bg-slate-950/80 border border-cyan-500/50 rounded-xl p-2.5 shadow-xl text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow"
                      style={{
                        backgroundColor: getVesselColorHex(
                          predictions?.vessels[selectedVessel]?.prob ?? 0,
                          colorblindMode
                        ),
                      }}
                    />
                    <span className="font-bold text-white tracking-wide text-[11px]">
                      {VESSEL_PARAMS[selectedVessel]?.fullName || selectedVessel} ({selectedVessel})
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedVessel(null)}
                    className="text-slate-400 hover:text-white text-[10px] px-1.5 py-0.5 rounded hover:bg-slate-800 transition-colors"
                    title="Deselect vessel"
                  >
                    &times; Close
                  </button>
                </div>
                <div className="flex items-center justify-between py-1 bg-slate-900/60 px-2 rounded-lg border border-slate-800/60 mb-1.5">
                  <span className="text-[10px] text-slate-300">Stenosis Risk Probability:</span>
                  <span className="font-mono font-bold text-cyan-300 text-xs ml-2">
                    {(((predictions?.vessels[selectedVessel]?.prob ?? 0) * 100)).toFixed(0)}%
                  </span>
                </div>
                <p className="text-[9.5px] text-slate-400 leading-snug">
                  {selectedVessel === 'LAD' && 'Traverses the anterior interventricular groove toward apex.'}
                  {selectedVessel === 'LCX' && 'Wraps left AV groove to posterior crux (view via Left Lateral).'}
                  {selectedVessel === 'RCA' && 'Curves through right AV sulcus toward inferior diaphragmatic crux.'}
                </p>
              </div>
            )}

            {/* Camera Angle Presets Toolbar */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-1.5 flex items-center justify-between gap-1 text-xs">
              <span className="text-[10px] uppercase font-semibold text-slate-400 px-1">
                View:
              </span>
              <div className="flex items-center gap-1 flex-1 justify-end">
                <button
                  type="button"
                  onClick={() => setCameraPreset('anterior')}
                  disabled={isTweening}
                  className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 transition-all font-medium text-[10px] disabled:opacity-50"
                  title="Frontal anterior view: LAD overview and outflow"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setCameraPreset('lateral')}
                  disabled={isTweening}
                  className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 transition-all font-medium text-[10px] disabled:opacity-50 flex items-center gap-1"
                  title="Left lateral view: LCX groove"
                >
                  <span>Lateral</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono font-bold">
                    LCX
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setCameraPreset('posterior')}
                  disabled={isTweening}
                  className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 transition-all font-medium text-[10px] disabled:opacity-50"
                  title="Posterior view: RCA Crux and distal LCX"
                >
                  Posterior
                </button>
              </div>
            </div>

            {/* Legend Swatches with Numeric Percentage Thresholds */}
            <div className="grid grid-cols-3 gap-1.5">
              {/* Low Risk */}
              <div className="flex flex-col gap-0.5 bg-slate-950/70 p-1.5 rounded-lg border border-slate-800/70">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: activePalette.low }}
                  />
                  <span className="font-semibold text-slate-200 text-[10px]">Low</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono font-bold">
                  &lt; 40%
                </span>
              </div>

              {/* Moderate Risk */}
              <div className="flex flex-col gap-0.5 bg-slate-950/70 p-1.5 rounded-lg border border-slate-800/70">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: activePalette.mid }}
                  />
                  <span className="font-semibold text-slate-200 text-[10px]">Moderate</span>
                </div>
                <span className="text-[10px] text-amber-400 font-mono font-bold">
                  40%–70%
                </span>
              </div>

              {/* High Risk */}
              <div className="flex flex-col gap-0.5 bg-slate-950/70 p-1.5 rounded-lg border border-slate-800/70">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: activePalette.high }}
                  />
                  <span className="font-semibold text-slate-200 text-[10px]">High</span>
                </div>
                <span className="text-[10px] text-rose-400 font-mono font-bold">
                  &ge; 70%
                </span>
              </div>
            </div>

            <div className="text-[9.5px] text-slate-400 leading-snug">
              Vessels colored uniformly by predicted probability of significant stenosis. Never color alone: numeric percentages shown per territory.
            </div>

            {/* Controls: Opacity, Cutaway, Torso & Colorblind Toggle */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800/80">
              {!is2D && (
                <>
                  {/* Heart Opacity Slider */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-300 font-medium whitespace-nowrap">
                      Heart Opacity:
                    </span>
                    <div className="flex items-center gap-2 flex-1 max-w-[130px]">
                      <input
                        type="range"
                        min="0.10"
                        max="1.00"
                        step="0.05"
                        value={heartOpacity}
                        onChange={(e) => setHeartOpacity(parseFloat(e.target.value))}
                        className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
                      />
                      <span className="font-mono text-[10px] text-slate-400 w-7 text-right">
                        {(heartOpacity * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {/* 3D Toggles Row */}
                  <div className="flex items-center justify-between gap-1.5">
                    {/* Cutaway Toggle */}
                    <button
                      type="button"
                      onClick={toggleChamberCutaway}
                      className={`flex-1 px-2 py-1 rounded-lg text-[10px] font-medium border transition-colors flex items-center justify-center gap-1.5 ${
                        chamberCutaway
                          ? 'bg-purple-950/80 text-purple-200 border-purple-500 shadow-sm shadow-purple-950/50'
                          : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                      title="Toggle anatomical cutaway revealing interior ventricular cavities and valves"
                    >
                      <span>🫀 Cutaway</span>
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          chamberCutaway ? 'bg-purple-400' : 'bg-slate-600'
                        }`}
                      />
                    </button>

                    {/* Torso Toggle */}
                    <button
                      type="button"
                      onClick={toggleTorso}
                      className={`flex-1 px-2 py-1 rounded-lg text-[10px] font-medium border transition-colors flex items-center justify-center gap-1.5 ${
                        showTorso
                          ? 'bg-cyan-950/80 text-cyan-200 border-cyan-500 shadow-sm shadow-cyan-950/50'
                          : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <span>👤 Torso</span>
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          showTorso ? 'bg-cyan-400' : 'bg-slate-600'
                        }`}
                      />
                    </button>
                  </div>
                </>
              )}

              {/* Colorblind Toggle Row */}
              <button
                type="button"
                onClick={toggleColorblindMode}
                className={`w-full px-2 py-1 rounded-lg text-[10px] font-medium border transition-colors flex items-center justify-center gap-1.5 ${
                  colorblindMode
                    ? 'bg-amber-950/80 text-amber-200 border-amber-500 shadow-sm shadow-amber-950/50'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span>🎨 Colorblind Palette (Okabe-Ito)</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    colorblindMode ? 'bg-amber-400' : 'bg-slate-600'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
