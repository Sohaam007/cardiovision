import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useStore } from '../store/useStore.ts';

interface Position {
  x: number;
  y: number;
}

// Generate an anatomically accurate P-Q-R-S-T beat path relative to startX and beatWidth W
function generateSingleBeatPath(
  startX: number,
  w: number,
  lead: 'II' | 'V1' | 'V5' | 'aVR',
  hasSTElevation: boolean,
  hasSTDepression: boolean,
  hasTInversion: boolean
): string {
  // Center isoelectric baseline is Y = 28 (in a 56px high oscilloscope canvas)
  const baseline = 28;

  const isAVR = lead === 'aVR';
  const isV1 = lead === 'V1';
  const isV5 = lead === 'V5';

  // P wave deflection
  const pSign = isAVR ? 1 : -1;
  const pHeight = 7.5;
  const pPeakY = baseline + pSign * pHeight;

  // Q dip
  const qDepth = isAVR ? -3.5 : 3.5;
  const qY = baseline + qDepth;

  // R spike
  let rPeakY = baseline - 22; // default tall R peak
  if (isAVR) rPeakY = baseline + 21; // inverted QS complex
  else if (isV1) rPeakY = baseline - 11; // small r wave in V1
  else if (isV5) rPeakY = baseline - 24; // tall lateral R wave in V5

  if (hasSTElevation && !isAVR) rPeakY -= 2;

  // S wave
  let sDepthY = baseline + 22;
  if (isAVR) sDepthY = baseline - 8;
  else if (isV1) sDepthY = baseline + 24; // deeper S in V1

  // ST segment shift
  let stY = baseline;
  if (hasSTElevation) stY = isAVR ? baseline + 8 : baseline - 9;
  else if (hasSTDepression) stY = isAVR ? baseline - 8 : baseline + 9;

  // T wave deflection
  const tInvert = hasTInversion || isAVR;
  const tPeakY = tInvert ? baseline + 10 : baseline - 11.5;

  // Seamless beat trajectory from startX to startX + w
  return `M ${startX.toFixed(1)} ${baseline}
    L ${(startX + 0.08 * w).toFixed(1)} ${baseline}
    Q ${(startX + 0.12 * w).toFixed(1)} ${pPeakY.toFixed(1)} ${(startX + 0.16 * w).toFixed(1)} ${baseline}
    L ${(startX + 0.20 * w).toFixed(1)} ${baseline}
    L ${(startX + 0.215 * w).toFixed(1)} ${qY.toFixed(1)}
    L ${(startX + 0.24 * w).toFixed(1)} ${rPeakY.toFixed(1)}
    L ${(startX + 0.265 * w).toFixed(1)} ${sDepthY.toFixed(1)}
    L ${(startX + 0.28 * w).toFixed(1)} ${baseline}
    L ${(startX + 0.32 * w).toFixed(1)} ${stY.toFixed(1)}
    Q ${(startX + 0.38 * w).toFixed(1)} ${tPeakY.toFixed(1)} ${(startX + 0.44 * w).toFixed(1)} ${baseline}
    L ${(startX + w).toFixed(1)} ${baseline}`;
}

export const ECGMonitorHUD: React.FC = () => {
  const showECG = useStore((state) => state.showECG);
  const toggleECG = useStore((state) => state.toggleECG);
  const isPlaying = useStore((state) => state.isPlaying);
  const isBeating = useStore((state) => state.isBeating);
  const heartRateBpm = useStore((state) => state.heartRateBpm);
  const cardiacPhase = useStore((state) => state.cardiacPhase);
  const patientInputs = useStore((state) => state.patientInputs);

  // Logical heartbeat active status: active when playback is running AND beating is enabled
  const isHeartActive = isPlaying && isBeating;

  // Clinical findings from patient inputs
  const rawPulseRate = Number(patientInputs['PR'] || heartRateBpm || 72);
  const currentBpm = Math.max(30, Math.min(180, rawPulseRate));
  const hasSTElevation = Boolean(patientInputs['ST_Elevation']);
  const hasSTDepression = Boolean(patientInputs['ST_Depression']);
  const hasTInversion = Boolean(patientInputs['T_Inversion']);
  const ejectionFraction = Number(patientInputs['EF-TTE'] || 50);

  // Selected Lead (Lead II standard rhythm lead)
  const [selectedLead, setSelectedLead] = useState<'II' | 'V1' | 'V5' | 'aVR'>('II');
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Draggable window state (defaults to bottom-right)
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<Position>({
    x: typeof window !== 'undefined' ? Math.max(16, window.innerWidth - 496) : 700,
    y: typeof window !== 'undefined' ? Math.max(16, window.innerHeight - 165) : 450,
  });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragOffsetRef = useRef<{ offsetX: number; offsetY: number }>({ offsetX: 0, offsetY: 0 });

  // Real-time scrolling offset and animation frame references
  const [scrollOffset, setScrollOffset] = useState<number>(0);
  const scrollOffsetRef = useRef<number>(0);
  const lastTimestampRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  // Standard calibrated beat width in pixels: 200px per beat across 600px viewBox (3 beats visible)
  const beatWidth = 200;
  // Heart beat period in seconds: e.g. at 60 BPM, beatPeriod = 1.0s; at 120 BPM, beatPeriod = 0.5s
  const beatPeriod = 60 / currentBpm;
  // Scroll velocity in pixels per second: exactly moves 1 beatWidth per cardiac beatPeriod
  const scrollSpeed = beatWidth / beatPeriod;

  // Real-time animated ECG motion loop synchronized with heartbeat
  useEffect(() => {
    if (!showECG) return;

    const animate = (timestamp: number) => {
      if (!lastTimestampRef.current) {
        lastTimestampRef.current = timestamp;
      }
      const delta = (timestamp - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = timestamp;

      // Only advance the ECG wave when the heartbeat is actively running
      if (isHeartActive) {
        if (cardiacPhase === 'auto') {
          // Advance scroll offset continuously in lockstep with the heart rate speed
          scrollOffsetRef.current = (scrollOffsetRef.current + scrollSpeed * delta) % 1000000;
          setScrollOffset(scrollOffsetRef.current);
        } else if (cardiacPhase === 'systole') {
          // Frozen at systolic peak (R-wave centered on monitor)
          const targetOffset = beatWidth * 0.24;
          scrollOffsetRef.current = targetOffset;
          setScrollOffset(targetOffset);
        } else if (cardiacPhase === 'diastole') {
          // Frozen at diastolic baseline
          const targetOffset = beatWidth * 0.65;
          scrollOffsetRef.current = targetOffset;
          setScrollOffset(targetOffset);
        }
      }
      // When isHeartActive is false (paused), delta is consumed but scrollOffset is NOT incremented,
      // perfectly pausing the ECG wave in place without jumping.

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [showECG, isHeartActive, cardiacPhase, scrollSpeed, beatWidth]);

  // Generate continuous seamless multi-beat moving path
  const movingWaveformPath = useMemo(() => {
    // Current cyclic offset within one beat period [0, beatWidth)
    const offset = scrollOffset % beatWidth;
    // Generate 5 consecutive beats starting from -offset - beatWidth to cover [-200, 800]
    let pathD = '';
    for (let i = -1; i <= 3; i++) {
      const beatStartX = i * beatWidth - offset;
      const beat = generateSingleBeatPath(
        beatStartX,
        beatWidth,
        selectedLead,
        hasSTElevation,
        hasSTDepression,
        hasTInversion
      );
      pathD += ` ${beat}`;
    }
    return pathD;
  }, [scrollOffset, beatWidth, selectedLead, hasSTElevation, hasSTDepression, hasTInversion]);

  // Current cardiac phase derived from live scroll position
  const currentNormalizedPhase = (scrollOffset % beatWidth) / beatWidth;
  const isSystolePhase = currentNormalizedPhase >= 0.16 && currentNormalizedPhase <= 0.38;

  // Boundary clamping
  const clamp = useCallback((pos: Position, menuWidth: number, menuHeight: number): Position => {
    const parent = containerRef.current?.parentElement;
    const parentWidth = parent?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 800);
    const parentHeight = parent?.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 600);

    const margin = 12;
    const minX = margin;
    const maxX = Math.max(margin, parentWidth - menuWidth - margin);
    const minY = margin;
    const maxY = Math.max(margin, parentHeight - menuHeight - margin);

    return {
      x: Math.max(minX, Math.min(maxX, pos.x)),
      y: Math.max(minY, Math.min(maxY, pos.y)),
    };
  }, []);

  // Initial placement at bottom-right of viewport
  useEffect(() => {
    const parent = containerRef.current?.parentElement;
    if (parent) {
      const parentWidth = parent.clientWidth;
      const parentHeight = parent.clientHeight;
      const targetWidth = isMinimized ? 240 : 480;
      const targetHeight = isMinimized ? 40 : 160;

      setPosition(clamp({
        x: Math.max(16, parentWidth - 496),
        y: Math.max(16, parentHeight - 165),
      }, targetWidth, targetHeight));
    }
  }, [clamp, isMinimized]);

  // Fluid expand/minimize handlers with boundary clamping
  const handleMinimize = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const parent = containerRef.current?.parentElement;
    if (parent) {
      setPosition((prev) => clamp(prev, 240, 40));
    }
    setIsMinimized(true);
  };

  const handleExpand = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const parent = containerRef.current?.parentElement;
    if (parent) {
      const parentWidth = parent.clientWidth;
      const parentHeight = parent.clientHeight;
      setPosition((prev) => clamp({
        x: Math.min(prev.x, parentWidth - 496),
        y: Math.min(prev.y, parentHeight - 165),
      }, 480, 160));
    }
    setIsMinimized(false);
  };

  // Pointer drag listeners using robust window-level tracking
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
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
      const parentRect = parent?.getBoundingClientRect() || { left: 0, top: 0 };
      const width = containerRef.current?.offsetWidth || (isMinimized ? 240 : 500);
      const height = containerRef.current?.offsetHeight || (isMinimized ? 40 : 160);

      const rawX = e.clientX - parentRect.left - dragOffsetRef.current.offsetX;
      const rawY = e.clientY - parentRect.top - dragOffsetRef.current.offsetY;

      setPosition(clamp({ x: rawX, y: rawY }, width, height));
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
  }, [isDragging, isMinimized, clamp]);

  // Prevent wheel scroll bleed into 3D OrbitControls
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const stopPropagation = (e: Event) => e.stopPropagation();
    el.addEventListener('wheel', stopPropagation, { passive: false });

    return () => {
      el.removeEventListener('wheel', stopPropagation);
    };
  }, []);

  if (!showECG) return null;

  return (
    <div
      ref={containerRef}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        touchAction: 'none',
      }}
      className={`absolute top-0 left-0 z-30 select-none pointer-events-auto ${
        isDragging ? 'cursor-grabbing shadow-2xl scale-[1.01]' : 'shadow-xl'
      }`}
      data-testid="ecg-monitor-hud"
    >
      {isMinimized ? (
        /* Minimalist Pill */
        <div
          className="bg-[#070b12]/95 backdrop-blur-md border border-slate-700/80 hover:border-emerald-500/60 rounded-xl px-3 py-1.5 flex items-center gap-2.5 text-xs text-slate-200 shadow-2xl transition-all duration-200 ease-in-out"
        >
          {/* Drag Handle */}
          <div
            onPointerDown={handlePointerDown}
            className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-emerald-400 p-0.5"
            title="Drag to reposition ECG Pill"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 5a2 2 0 11-4 0 2 2 0 014 0zm0 7a2 2 0 11-4 0 2 2 0 014 0zm0 7a2 2 0 11-4 0 2 2 0 014 0zm10-14a2 2 0 11-4 0 2 2 0 014 0zm0 7a2 2 0 11-4 0 2 2 0 014 0zm0 7a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>

          <div
            onClick={handleExpand}
            className="flex items-center gap-2 cursor-pointer hover:opacity-90"
            title="Click to expand ECG Oscilloscope Monitor"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isHeartActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="font-semibold text-white tracking-tight">ECG Lead {selectedLead}</span>
            <span className="font-mono text-emerald-400 font-bold">{currentBpm} BPM</span>
            {!isHeartActive && (
              <span className="text-[10px] text-amber-400 font-bold px-1 rounded bg-amber-950/80 border border-amber-700/60">
                PAUSED
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleExpand}
            className="w-5 h-5 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-[10px] transition-colors"
            title="Expand ECG Monitor"
            aria-label="Expand ECG Monitor"
            data-testid="expand-ecg-btn"
          >
            ▼
          </button>
          <button
            type="button"
            onClick={() => toggleECG()}
            className="w-5 h-5 rounded-md bg-slate-800/80 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center text-[10px] transition-colors"
            title="Close ECG"
          >
            &times;
          </button>
        </div>
      ) : (
        /* Minimalist & Professional Telemetry Monitor Window */
        <div
          className="w-[92vw] sm:w-[480px] md:w-[500px] rounded-2xl border border-slate-800/90 bg-[#070b12]/95 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col text-xs transition-all duration-200 ease-in-out"
        >
          {/* Header Bar */}
          <div
            className="bg-slate-900/80 border-b border-slate-800/80 px-3.5 py-2 flex items-center justify-between"
          >
            <div
              onPointerDown={handlePointerDown}
              className="flex items-center gap-2 cursor-grab active:cursor-grabbing flex-1 mr-2"
              title="Drag to reposition ECG Monitor"
            >
              <svg className="w-3.5 h-3.5 text-slate-400 hover:text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 5a2 2 0 11-4 0 2 2 0 014 0zm0 7a2 2 0 11-4 0 2 2 0 014 0zm0 7a2 2 0 11-4 0 2 2 0 014 0zm10-14a2 2 0 11-4 0 2 2 0 014 0zm0 7a2 2 0 11-4 0 2 2 0 014 0zm0 7a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>

              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isHeartActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span className="font-bold text-white tracking-wide">ECG Telemetry</span>
                <span className="text-[10px] font-mono text-emerald-400/90 font-semibold px-1.5 py-0.2 rounded bg-emerald-950/60 border border-emerald-800/60">
                  Lead {selectedLead}
                </span>
                {!isHeartActive && (
                  <span className="text-[9.5px] font-mono font-bold text-amber-300 px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-600/80 animate-pulse">
                    ⏸ PAUSED
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Minimalist Lead Selector */}
              <div className="flex items-center bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
                {(['II', 'V1', 'V5', 'aVR'] as const).map((lead) => (
                  <button
                    key={lead}
                    type="button"
                    onClick={() => setSelectedLead(lead)}
                    className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold transition-colors ${
                      selectedLead === lead
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {lead}
                  </button>
                ))}
              </div>

              {/* Minimize & Close */}
              <button
                type="button"
                onClick={handleMinimize}
                className="w-6 h-6 rounded-lg bg-slate-800/70 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-xs transition-colors border border-slate-700/50"
                title="Minimize ECG Monitor"
                aria-label="Minimize ECG Monitor"
                data-testid="collapse-ecg-btn"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => toggleECG()}
                className="w-6 h-6 rounded-lg bg-slate-800/70 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center text-xs transition-colors border border-slate-700/50"
                title="Close"
              >
                &times;
              </button>
            </div>
          </div>

          {/* Vitals Telemetry Row */}
          <div className="px-3.5 py-1.5 bg-slate-950/60 border-b border-slate-800/60 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 font-mono">
                <span className="text-slate-400">HR:</span>
                <span className="font-bold text-emerald-400 text-xs">{currentBpm} BPM</span>
              </div>
              <div className="flex items-center gap-1 font-mono text-slate-400">
                <span>PR:</span>
                <span className="text-slate-200 font-semibold">160ms</span>
              </div>
              <div className="flex items-center gap-1 font-mono text-slate-400">
                <span>QRS:</span>
                <span className="text-slate-200 font-semibold">88ms</span>
              </div>
              <div className="hidden sm:flex items-center gap-1 font-mono text-slate-400">
                <span>EF:</span>
                <span className="text-cyan-300 font-semibold">{ejectionFraction}%</span>
              </div>
            </div>

            {/* Ischemia badge */}
            <div>
              {hasSTElevation || hasSTDepression || hasTInversion ? (
                <span className="px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800 text-[10px] font-bold flex items-center gap-1">
                  <span>⚠️</span>
                  {hasSTElevation && 'ST-Elev'}
                  {hasSTDepression && 'ST-Depr'}
                  {hasTInversion && 'T-Inv'}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-emerald-950/50 text-emerald-300 border border-emerald-800/50 text-[10px] font-medium">
                  Normal Sinus
                </span>
              )}
            </div>
          </div>

          {/* Waveform Canvas */}
          <div className="p-2.5 bg-black/90 relative">
            <div className="w-full h-14 bg-[#030906] rounded-xl border border-emerald-950/70 relative overflow-hidden flex items-center">
              {/* Medical Grid Pattern */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="ecgMinorGrid" width="8" height="8" patternUnits="userSpaceOnUse">
                    <path d="M 8 0 L 0 0 0 8" fill="none" stroke="#064e3b" strokeWidth="0.3" opacity="0.25" />
                  </pattern>
                  <pattern id="ecgMajorGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <rect width="40" height="40" fill="url(#ecgMinorGrid)" />
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#047857" strokeWidth="0.6" opacity="0.45" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#ecgMajorGrid)" />
              </svg>

              {/* Dynamic Oscilloscope Moving P-Q-R-S-T Waveform (In Sync with Heartbeat) */}
              <svg viewBox="0 0 600 56" preserveAspectRatio="none" className="w-full h-full relative z-10">
                <path
                  d={movingWaveformPath}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.0"
                  strokeLinecap="round"
                  className="drop-shadow-[0_0_6px_rgba(16,185,129,0.85)]"
                />

                {/* Sampling Lead Marker & Phosphor Beam Cursor */}
                <line
                  x1="510"
                  y1="0"
                  x2="510"
                  y2="56"
                  stroke={isHeartActive ? '#38bdf8' : '#f59e0b'}
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                  className="drop-shadow-[0_0_6px_#38bdf8]"
                  opacity={isHeartActive ? 0.75 : 0.45}
                />

                {/* Active Phosphor Pulse Blip */}
                <circle
                  cx="510"
                  cy={isSystolePhase ? (hasSTElevation ? 10 : 8) : 28}
                  r={isSystolePhase ? 4.5 : 3.0}
                  fill={isHeartActive ? (isSystolePhase ? '#34d399' : '#38bdf8') : '#f59e0b'}
                  className={isHeartActive && isSystolePhase ? 'drop-shadow-[0_0_8px_#34d399]' : 'drop-shadow-[0_0_6px_#38bdf8]'}
                />
              </svg>
            </div>

            {/* Subtext Footer */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 px-1 font-mono">
              <span className="flex items-center gap-1.5">
                <span className="text-slate-500">Telemetry:</span>
                {isHeartActive ? (
                  <span className={`font-semibold ${isSystolePhase ? 'text-emerald-300' : 'text-amber-300'}`}>
                    {isSystolePhase ? 'Ventricular Systole' : 'Diastolic Filling'}
                  </span>
                ) : (
                  <span className="text-amber-400 font-bold">
                    PAUSED — Click ▶ in Tools Menu to Resume
                  </span>
                )}
              </span>
              <span className="text-slate-500 hidden sm:inline">
                {isHeartActive ? `${currentBpm} BPM • 25mm/s • Calibrated` : 'FROZEN TRACE'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
