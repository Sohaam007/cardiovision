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

  // Movable Floating Window State (starts collapsed as minimal chip)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);
  const [position, setPosition] = useState<Position>({
    x: 16,
    y: typeof window !== 'undefined' ? Math.max(16, window.innerHeight - 52) : 550,
  });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragOffsetRef = useRef<{ offsetX: number; offsetY: number }>({ offsetX: 0, offsetY: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isInitializedRef = useRef<boolean>(false);

  // Boundary clamping and corner snapping helper
  const clampAndSnap = useCallback((pos: Position, menuWidth: number, menuHeight: number): Position => {
    const parent = containerRef.current?.parentElement;
    const parentWidth = parent?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 800);
    const parentHeight = parent?.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 600);

    const margin = 12;
    const snapThreshold = 10;

    const minX = margin;
    const maxX = Math.max(margin, parentWidth - menuWidth - margin);
    const minY = margin;
    const maxY = Math.max(margin, parentHeight - menuHeight - margin);

    let clampedX = Math.max(minX, Math.min(maxX, pos.x));
    let clampedY = Math.max(minY, Math.min(maxY, pos.y));

    // Corner / edge snapping with gentle threshold
    if (clampedX - minX < snapThreshold) clampedX = minX;
    if (maxX - clampedX < snapThreshold) clampedX = maxX;
    if (clampedY - minY < snapThreshold) clampedY = minY;
    if (maxY - clampedY < snapThreshold) clampedY = maxY;

    return { x: clampedX, y: clampedY };
  }, []);

  // Initial placement at bottom-left in collapsed chip state (runs strictly once)
  useEffect(() => {
    if (isInitializedRef.current) return;
    const parent = containerRef.current?.parentElement;
    if (parent && parent.clientHeight > 100) {
      isInitializedRef.current = true;
      setPosition(clampAndSnap({
        x: 16,
        y: Math.max(16, parent.clientHeight - 52),
      }, 200, 36));
    }
  }, [clampAndSnap]);

  // Fluid expand/collapse handlers with boundary clamping
  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    const parent = containerRef.current?.parentElement;
    if (parent) {
      const parentHeight = parent.clientHeight;
      const expandedHeight = 350;
      setPosition((prev) => clampAndSnap({
        x: prev.x,
        y: Math.max(12, Math.min(prev.y, parentHeight - expandedHeight - 12)),
      }, 320, expandedHeight));
    }
    setIsCollapsed(false);
  };

  const handleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Maintain current position without jumping or snapping to bottom
    setPosition((prev) => ({
      x: prev.x,
      y: prev.y,
    }));
    setIsCollapsed(true);
  };

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
      <div
        className="w-72 bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col text-card-foreground text-xs transition-all duration-200 ease-in-out"
      >
        {/* Draggable Header */}
        <div
          onPointerDown={handlePointerDown}
          onClick={isCollapsed ? handleExpand : undefined}
          className={`bg-muted/40 border-border/80 px-3.5 py-2.5 flex items-center justify-between cursor-grab active:cursor-grabbing hover:bg-muted/60 transition-colors ${
            isCollapsed ? 'border-b-0 cursor-pointer' : 'border-b'
          }`}
          title={isCollapsed ? "Click to expand clinical risk scale or drag to reposition" : "Drag to reposition Clinical Risk Scale"}
          data-testid={isCollapsed ? "risk-legend-collapsed-pill" : "risk-legend-drag-handle"}
        >
          <div className="flex items-center gap-2">
            <span className="text-primary text-sm font-bold">⠿</span>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-foreground tracking-wide text-xs">
                {isCollapsed ? '📊 Risk Scale' : 'Clinical Risk Scale'}
              </span>
              {isCollapsed ? (
                <div className="flex items-center gap-1.5 text-[10px] font-mono px-1 border-l border-border/80">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: activePalette.low }}
                    title="Low Risk (<40%)"
                    data-testid="risk-indicator-low"
                  />
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: activePalette.mid }}
                    title="Moderate Risk (40%-70%)"
                    data-testid="risk-indicator-mid"
                  />
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: activePalette.high }}
                    title="High Risk (≥70%)"
                    data-testid="risk-indicator-high"
                  />
                </div>
              ) : (
                <span className="text-[10px] font-mono uppercase bg-primary/20 text-primary border border-primary/40 px-1.5 py-0.2 rounded">
                  {colorblindMode ? 'Okabe-Ito' : 'Standard'}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={isCollapsed ? handleExpand : handleCollapse}
            className="w-6 h-6 rounded-lg bg-secondary/80 hover:bg-secondary text-secondary-foreground hover:text-foreground flex items-center justify-center text-xs transition-colors border border-border shrink-0"
            title={isCollapsed ? "Expand Clinical Risk Scale" : "Minimize to floating chip"}
            aria-label={isCollapsed ? "Expand Clinical Risk Scale" : "Collapse Risk Legend"}
            data-testid={isCollapsed ? "expand-risk-legend-btn" : "collapse-risk-legend-btn"}
          >
            {isCollapsed ? '▼' : '▲'}
          </button>
        </div>

        {/* Smooth Expandable Body via CSS Grid */}
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
            isCollapsed ? 'grid-rows-[0fr] opacity-0 pointer-events-none' : 'grid-rows-[1fr] opacity-100'
          }`}
        >
          <div className="overflow-hidden">
            <div className="p-3 flex flex-col gap-2.5 max-h-[75vh] overflow-y-auto no-scrollbar">
              {/* Selected Vessel Details Card */}
              {selectedVessel && (
                <div className="bg-muted/40 border border-primary/40 rounded-xl p-2.5 shadow-xl text-xs">
                  <div className="flex items-center justify-between border-b border-border/80 pb-1 mb-1.5">
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
                      <span className="font-bold text-foreground tracking-wide text-[11px]">
                        {VESSEL_PARAMS[selectedVessel]?.fullName || selectedVessel} ({selectedVessel})
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedVessel(null)}
                      className="text-muted-foreground hover:text-foreground text-[10px] px-1.5 py-0.5 rounded hover:bg-muted transition-colors"
                      title="Deselect vessel"
                    >
                      &times; Close
                    </button>
                  </div>
                  <div className="flex items-center justify-between py-1 bg-background/50 px-2 rounded-lg border border-border/60 mb-1.5">
                    <span className="text-[10px] text-muted-foreground">Stenosis Risk Probability:</span>
                    <span className="font-mono font-bold text-primary text-xs ml-2">
                      {(((predictions?.vessels[selectedVessel]?.prob ?? 0) * 100)).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-[9.5px] text-muted-foreground leading-snug">
                    {selectedVessel === 'LAD' && 'Traverses the anterior interventricular groove toward apex.'}
                    {selectedVessel === 'LCX' && 'Wraps left AV groove to posterior crux (view via Left Lateral).'}
                    {selectedVessel === 'RCA' && 'Curves through right AV sulcus toward inferior diaphragmatic crux.'}
                  </p>
                </div>
              )}

              {/* Camera Angle Presets Toolbar */}
              <div className="bg-muted/30 border border-border/80 rounded-xl p-1.5 flex items-center justify-between gap-1 text-xs">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground px-1">
                  View:
                </span>
                <div className="flex items-center gap-1 flex-1 justify-end">
                  <button
                    type="button"
                    onClick={() => setCameraPreset('anterior')}
                    disabled={isTweening}
                    className="px-2 py-1 rounded-lg bg-secondary/80 hover:bg-secondary text-secondary-foreground hover:text-foreground border border-border transition-all font-medium text-[10px] disabled:opacity-50"
                    title="Frontal anterior view: LAD overview and outflow"
                    data-testid="camera-preset-anterior"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => setCameraPreset('lateral')}
                    disabled={isTweening}
                    className="px-2 py-1 rounded-lg bg-secondary/80 hover:bg-secondary text-secondary-foreground hover:text-foreground border border-border transition-all font-medium text-[10px] disabled:opacity-50 flex items-center gap-1"
                    title="Left lateral view: LCX groove"
                    data-testid="camera-preset-lateral"
                  >
                    <span>Lateral</span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-primary/20 text-primary border border-primary/40 font-mono font-bold">
                      LCX
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCameraPreset('posterior')}
                    disabled={isTweening}
                    className="px-2 py-1 rounded-lg bg-secondary/80 hover:bg-secondary text-secondary-foreground hover:text-foreground border border-border transition-all font-medium text-[10px] disabled:opacity-50"
                    title="Posterior view: RCA Crux and distal LCX"
                    data-testid="camera-preset-posterior"
                  >
                    Posterior
                  </button>
                </div>
              </div>

              {/* Legend Swatches with Numeric Percentage Thresholds */}
              <div className="grid grid-cols-3 gap-1.5">
                {/* Low Risk */}
                <div className="flex flex-col gap-0.5 bg-muted/40 p-1.5 rounded-lg border border-border/70">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: activePalette.low }}
                    />
                    <span className="font-semibold text-foreground text-[10px]">Low</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold">
                    &lt; 40%
                  </span>
                </div>

                {/* Moderate Risk */}
                <div className="flex flex-col gap-0.5 bg-muted/40 p-1.5 rounded-lg border border-border/70">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: activePalette.mid }}
                    />
                    <span className="font-semibold text-foreground text-[10px]">Moderate</span>
                  </div>
                  <span className="text-[10px] text-amber-400 font-mono font-bold">
                    40%–70%
                  </span>
                </div>

                {/* High Risk */}
                <div className="flex flex-col gap-0.5 bg-muted/40 p-1.5 rounded-lg border border-border/70">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: activePalette.high }}
                    />
                    <span className="font-semibold text-foreground text-[10px]">High</span>
                  </div>
                  <span className="text-[10px] text-rose-400 font-mono font-bold">
                    &ge; 70%
                  </span>
                </div>
              </div>

              <div className="text-[9.5px] text-muted-foreground leading-snug">
                Vessels colored uniformly by predicted probability of significant stenosis. Never color alone: numeric percentages shown per territory.
              </div>

              {/* Controls: Opacity, Cutaway, Torso & Colorblind Toggle */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-border/80">
                {!is2D && (
                  <>
                    {/* Heart Opacity Slider */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">
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
                          className="w-full h-1 bg-secondary rounded appearance-none cursor-pointer accent-primary focus:outline-none"
                        />
                        <span className="font-mono text-[10px] text-muted-foreground w-7 text-right">
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
                            : 'bg-secondary/70 text-secondary-foreground border-border hover:bg-secondary'
                        }`}
                        title="Toggle anatomical cutaway revealing interior ventricular cavities and valves"
                      >
                        <span>🫀 Cutaway</span>
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            chamberCutaway ? 'bg-purple-400' : 'bg-muted-foreground/60'
                          }`}
                        />
                      </button>

                      {/* Torso Toggle */}
                      <button
                        type="button"
                        onClick={toggleTorso}
                        className={`flex-1 px-2 py-1 rounded-lg text-[10px] font-medium border transition-colors flex items-center justify-center gap-1.5 ${
                          showTorso
                            ? 'bg-primary/20 text-primary border-primary/50 shadow-sm shadow-primary/20'
                            : 'bg-secondary/70 text-secondary-foreground border-border hover:bg-secondary'
                        }`}
                        data-testid="toggle-torso-legend-btn"
                      >
                        <span>👤 Torso</span>
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            showTorso ? 'bg-primary' : 'bg-muted-foreground/60'
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
                      : 'bg-secondary/70 text-secondary-foreground border-border hover:bg-secondary'
                  }`}
                  data-testid="toggle-colorblind-btn"
                >
                  <span>🎨 Colorblind Palette (Okabe-Ito)</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      colorblindMode ? 'bg-amber-400' : 'bg-muted-foreground/60'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
