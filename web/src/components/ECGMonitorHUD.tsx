import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore.ts';

interface Position {
  x: number;
  y: number;
}

export const ECGMonitorHUD: React.FC = () => {
  const showECG = useStore((state) => state.showECG);
  const toggleECG = useStore((state) => state.toggleECG);
  const isPlaying = useStore((state) => state.isPlaying);
  const heartRateBpm = useStore((state) => state.heartRateBpm);
  const cardiacPhase = useStore((state) => state.cardiacPhase);
  const patientInputs = useStore((state) => state.patientInputs);

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

  // Draggable window state
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<Position>({ x: 16, y: 16 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragOffsetRef = useRef<{ offsetX: number; offsetY: number }>({ offsetX: 0, offsetY: 0 });

  // Animation phase timer
  const [phaseTime, setPhaseTime] = useState<number>(0);
  const lastTimestampRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  // Heart beat period in seconds
  const beatPeriod = 60 / currentBpm;

  // Real-time animated oscilloscope loop
  useEffect(() => {
    if (!showECG) return;

    const animate = (timestamp: number) => {
      if (!lastTimestampRef.current) lastTimestampRef.current = timestamp;
      const delta = (timestamp - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = timestamp;

      if (isPlaying) {
        if (cardiacPhase === 'auto') {
          setPhaseTime((prev) => (prev + delta / beatPeriod) % 1.0);
        } else if (cardiacPhase === 'systole') {
          setPhaseTime(0.18);
        } else if (cardiacPhase === 'diastole') {
          setPhaseTime(0.65);
        }
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [showECG, isPlaying, cardiacPhase, beatPeriod]);

  // Initial placement at bottom-center of viewport
  useEffect(() => {
    const parent = containerRef.current?.parentElement;
    if (parent) {
      const parentWidth = parent.clientWidth;
      const parentHeight = parent.clientHeight;
      const targetWidth = isMinimized ? 240 : 500;
      const targetHeight = isMinimized ? 40 : 160;

      setPosition({
        x: Math.max(16, Math.min(parentWidth - targetWidth - 16, (parentWidth - targetWidth) / 2)),
        y: Math.max(16, parentHeight - targetHeight - 20),
      });
    }
  }, []);

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
          className="bg-[#070b12]/95 backdrop-blur-md border border-slate-700/80 hover:border-emerald-500/60 rounded-xl px-3 py-1.5 flex items-center gap-2.5 text-xs text-slate-200 shadow-2xl transition-all"
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
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-2 cursor-pointer hover:opacity-90"
            title="Click to expand ECG Oscilloscope Monitor"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-white tracking-tight">ECG Lead {selectedLead}</span>
            <span className="font-mono text-emerald-400 font-bold">{currentBpm} BPM</span>
          </div>

          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="w-5 h-5 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-[10px] transition-colors"
            title="Expand ECG Monitor"
          >
            ▲
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
          className="w-[92vw] sm:w-[480px] md:w-[500px] rounded-2xl border border-slate-800/90 bg-[#070b12]/95 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col text-xs"
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
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-white tracking-wide">ECG Telemetry</span>
                <span className="text-[10px] font-mono text-emerald-400/90 font-semibold px-1.5 py-0.2 rounded bg-emerald-950/60 border border-emerald-800/60">
                  Lead {selectedLead}
                </span>
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
                onClick={() => setIsMinimized(true)}
                className="w-6 h-6 rounded-lg bg-slate-800/70 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-xs transition-colors border border-slate-700/50"
                title="Minimize"
              >
                —
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

              {/* Dynamic Oscilloscope P-Q-R-S-T Waveform */}
              <svg viewBox="0 0 600 56" preserveAspectRatio="none" className="w-full h-full relative z-10">
                <path
                  d={`M 0 28
                      L 40 28
                      Q 60 19 75 28
                      L 95 28
                      L 102 32
                      L 115 ${hasSTElevation ? 4 : 6}
                      L 128 50
                      L 135 28
                      L 155 ${hasSTElevation ? 19 : hasSTDepression ? 37 : 28}
                      Q 185 ${hasTInversion ? 38 : 16} 210 28
                      L 280 28
                      L 300 28
                      Q 320 19 335 28
                      L 355 28
                      L 362 32
                      L 375 ${hasSTElevation ? 4 : 6}
                      L 388 50
                      L 395 28
                      L 415 ${hasSTElevation ? 19 : hasSTDepression ? 37 : 28}
                      Q 445 ${hasTInversion ? 38 : 16} 470 28
                      L 540 28
                      L 600 28`}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.0"
                  strokeLinecap="round"
                  className="drop-shadow-[0_0_6px_rgba(16,185,129,0.85)]"
                />

                {/* Sweeping Beam Bar */}
                <line
                  x1={phaseTime * 600}
                  y1="0"
                  x2={phaseTime * 600}
                  y2="56"
                  stroke="#38bdf8"
                  strokeWidth="2"
                  className="drop-shadow-[0_0_6px_#38bdf8]"
                  opacity="0.85"
                />

                {/* Phosphor Glow Point */}
                <circle
                  cx={phaseTime * 600}
                  cy="28"
                  r="3.5"
                  fill="#38bdf8"
                  className="drop-shadow-[0_0_6px_#38bdf8]"
                />
              </svg>
            </div>

            {/* Subtext Footer */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 px-1 font-mono">
              <span className="flex items-center gap-1">
                <span className="text-slate-500">Phase:</span>
                <span className="text-amber-300 font-semibold">
                  {phaseTime <= 0.35 ? 'Ventricular Systole' : 'Diastolic Filling'}
                </span>
              </span>
              <span className="text-slate-500 hidden sm:inline">
                25mm/s &bull; 10mm/mV &bull; Calibrated
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
