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
  const fluoroscopyMode = useStore((state) => state.fluoroscopyMode);

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

  // Position at bottom center on initial render
  useEffect(() => {
    const parent = containerRef.current?.parentElement;
    if (parent) {
      const parentWidth = parent.clientWidth;
      const parentHeight = parent.clientHeight;
      const initialWidth = isMinimized ? 220 : 520;
      const initialHeight = isMinimized ? 44 : 140;

      setPosition({
        x: Math.max(16, Math.min(parentWidth - initialWidth - 16, (parentWidth - initialWidth) / 2)),
        y: Math.max(16, parentHeight - initialHeight - 16),
      });
    }
  }, [isMinimized]);

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

  // Pointer drag listeners
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    dragOffsetRef.current = {
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.stopPropagation();

    const parent = containerRef.current?.parentElement;
    const parentRect = parent?.getBoundingClientRect() || { left: 0, top: 0 };
    const width = containerRef.current?.offsetWidth || 520;
    const height = containerRef.current?.offsetHeight || 140;

    const rawX = e.clientX - parentRect.left - dragOffsetRef.current.offsetX;
    const rawY = e.clientY - parentRect.top - dragOffsetRef.current.offsetY;

    setPosition(clamp({ x: rawX, y: rawY }, width, height));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      e.stopPropagation();
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Safe fallback
      }
    }
  };

  // Prevent wheel and pointer bleed into OrbitControls
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const stopPropagation = (e: Event) => e.stopPropagation();
    el.addEventListener('wheel', stopPropagation, { passive: false });
    el.addEventListener('pointerdown', stopPropagation);

    return () => {
      el.removeEventListener('wheel', stopPropagation);
      el.removeEventListener('pointerdown', stopPropagation);
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
      className={`absolute top-0 left-0 z-30 select-none transition-shadow pointer-events-auto ${
        isDragging ? 'cursor-grabbing shadow-2xl scale-[1.01]' : 'shadow-2xl'
      }`}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      data-testid="ecg-monitor-hud"
    >
      {isMinimized ? (
        /* Minimized Floating Pill */
        <div
          onPointerDown={handlePointerDown}
          className="bg-[#090d16]/95 backdrop-blur-md border border-slate-700/80 hover:border-emerald-500/50 rounded-full px-3 py-1.5 flex items-center gap-2.5 cursor-grab text-xs text-slate-200 shadow-2xl transition-all hover:bg-slate-900"
          title="Click to expand ECG Oscilloscope Monitor or drag to reposition"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-white flex items-center gap-1.5">
            <span>📈 Lead {selectedLead}</span>
            <span className="font-mono text-emerald-400 font-bold">{currentBpm} BPM</span>
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(false);
            }}
            className="w-5 h-5 rounded-full bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors text-[10px]"
            title="Expand ECG Monitor"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleECG();
            }}
            className="w-5 h-5 rounded-full bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors text-[10px]"
            title="Close ECG Strip"
          >
            &times;
          </button>
        </div>
      ) : (
        /* Expanded Full Oscilloscope Monitor */
        <div
          className={`w-[92vw] sm:w-[500px] md:w-[540px] rounded-2xl border backdrop-blur-md overflow-hidden flex flex-col text-xs shadow-2xl transition-colors ${
            fluoroscopyMode
              ? 'bg-slate-900/95 border-amber-500/60 text-slate-200'
              : 'bg-[#090d16]/95 border-slate-800/90 text-slate-200'
          }`}
        >
          {/* Header Bar */}
          <div
            onPointerDown={handlePointerDown}
            className="bg-slate-900/90 border-b border-slate-800/80 px-3 py-2 flex items-center justify-between cursor-grab active:cursor-grabbing hover:bg-slate-800/60 transition-colors"
            title="Drag to reposition ECG Monitor"
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white tracking-wide">Physiological ECG Lead {selectedLead}</span>
                <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.2 rounded font-semibold">
                  25 mm/s &bull; 10 mm/mV
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Lead Selector Chips */}
              <div className="flex items-center bg-slate-950/70 p-0.5 rounded-md border border-slate-800">
                {(['II', 'V1', 'V5', 'aVR'] as const).map((lead) => (
                  <button
                    key={lead}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedLead(lead);
                    }}
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

              {/* Minimize & Close Buttons */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMinimized(true);
                }}
                className="w-6 h-6 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-xs transition-colors border border-slate-700/60"
                title="Minimize ECG Monitor"
              >
                ▼
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleECG();
                }}
                className="w-6 h-6 rounded-lg bg-slate-800/80 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center text-xs transition-colors border border-slate-700/60"
                title="Close ECG Strip"
              >
                &times;
              </button>
            </div>
          </div>

          {/* Vitals Telemetry Row */}
          <div className="px-3 py-1.5 bg-slate-950/60 border-b border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 font-mono">
                <span className="text-slate-400">HR:</span>
                <span className="font-bold text-emerald-400 text-xs">{currentBpm} BPM</span>
              </div>
              <div className="flex items-center gap-1 font-mono text-slate-400">
                <span>PR:</span>
                <span className="text-slate-200 font-semibold">160 ms</span>
              </div>
              <div className="flex items-center gap-1 font-mono text-slate-400">
                <span>QRS:</span>
                <span className="text-slate-200 font-semibold">88 ms</span>
              </div>
              <div className="flex items-center gap-1 font-mono text-slate-400">
                <span>QTc:</span>
                <span className="text-slate-200 font-semibold">412 ms</span>
              </div>
              <div className="hidden sm:flex items-center gap-1 font-mono text-slate-400">
                <span>EF:</span>
                <span className="text-cyan-300 font-semibold">{ejectionFraction}%</span>
              </div>
            </div>

            {/* Ischemia & Pathology Alert */}
            <div className="flex items-center gap-1.5">
              {hasSTElevation || hasSTDepression || hasTInversion ? (
                <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-bold flex items-center gap-1">
                  <span>⚠️</span>
                  {hasSTElevation && 'ST-Elevation '}
                  {hasSTDepression && 'ST-Depression '}
                  {hasTInversion && 'T-Inversion'}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 text-[10px] font-semibold">
                  Normal Sinus Rhythm
                </span>
              )}
            </div>
          </div>

          {/* Oscilloscope Canvas Waveform */}
          <div className="p-2.5 bg-black/90 relative">
            <div className="w-full h-16 bg-[#040d08] rounded-xl border border-emerald-950/80 relative overflow-hidden flex items-center">
              {/* Medical ECG Millimeter Grid Background */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  {/* Minor 1mm Grid Pattern */}
                  <pattern id="ecgMinorGrid" width="6" height="6" patternUnits="userSpaceOnUse">
                    <path d="M 6 0 L 0 0 0 6" fill="none" stroke="#064e3b" strokeWidth="0.35" opacity="0.35" />
                  </pattern>
                  {/* Major 5mm Grid Pattern */}
                  <pattern id="ecgMajorGrid" width="30" height="30" patternUnits="userSpaceOnUse">
                    <rect width="30" height="30" fill="url(#ecgMinorGrid)" />
                    <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#047857" strokeWidth="0.75" opacity="0.6" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#ecgMajorGrid)" />
              </svg>

              {/* Dynamic Oscilloscope P-Q-R-S-T Physiological Wave Path */}
              <svg viewBox="0 0 600 64" preserveAspectRatio="none" className="w-full h-full relative z-10">
                <path
                  d={`M 0 32
                      L 40 32
                      Q 60 22 75 32
                      L 95 32
                      L 102 36
                      L 115 ${hasSTElevation ? 4 : 6}
                      L 128 58
                      L 135 32
                      L 155 ${hasSTElevation ? 22 : hasSTDepression ? 42 : 32}
                      Q 185 ${hasTInversion ? 44 : 18} 210 32
                      L 280 32
                      L 300 32
                      Q 320 22 335 32
                      L 355 32
                      L 362 36
                      L 375 ${hasSTElevation ? 4 : 6}
                      L 388 58
                      L 395 32
                      L 415 ${hasSTElevation ? 22 : hasSTDepression ? 42 : 32}
                      Q 445 ${hasTInversion ? 44 : 18} 470 32
                      L 540 32
                      L 600 32`}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  className="drop-shadow-[0_0_8px_rgba(16,185,129,0.9)]"
                />

                {/* Sweeping Oscilloscope Beam Bar */}
                <line
                  x1={phaseTime * 600}
                  y1="0"
                  x2={phaseTime * 600}
                  y2="64"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  className="drop-shadow-[0_0_6px_#38bdf8]"
                  opacity="0.9"
                />

                {/* Oscilloscope Sweep Phosphor Glow Circle */}
                <circle
                  cx={phaseTime * 600}
                  cy="32"
                  r="4"
                  fill="#38bdf8"
                  className="drop-shadow-[0_0_8px_#38bdf8]"
                />
              </svg>
            </div>

            {/* Sub-text footer with cycle phase */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 px-1 font-mono">
              <span className="flex items-center gap-1">
                <span>Cycle Phase:</span>
                <span className="text-amber-300 font-semibold">
                  {phaseTime <= 0.35 ? 'Ventricular Systole (Ejection)' : 'Diastolic Filling & Coronary Perfusion'}
                </span>
              </span>
              <span className="text-slate-500">
                P-R: 0.16s &bull; QRS: 0.08s &bull; ST: Isoelectric
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
