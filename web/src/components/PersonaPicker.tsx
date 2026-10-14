import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { DemoPatient } from '../api/client';

interface Position {
  x: number;
  y: number;
}

export const PersonaPicker: React.FC = () => {
  const demoPatients = useStore((state) => state.demoPatients);
  const selectedPersonaId = useStore((state) => state.selectedPersonaId);
  const loadPersona = useStore((state) => state.loadPersona);

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<Position>({ x: 16, y: 16 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragOffsetRef = useRef<{ offsetX: number; offsetY: number }>({ offsetX: 0, offsetY: 0 });

  // Initial position at top-left
  useEffect(() => {
    const parent = containerRef.current?.parentElement;
    if (parent) {
      const parentWidth = parent.clientWidth;
      setPosition({
        x: Math.max(16, Math.min(parentWidth - 320, 16)),
        y: 16,
      });
    }
  }, []);

  // Clamping within parent bounds
  const clamp = useCallback((pos: Position, width: number, height: number): Position => {
    const parent = containerRef.current?.parentElement;
    const parentWidth = parent?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 800);
    const parentHeight = parent?.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 600);

    const margin = 12;
    const minX = margin;
    const maxX = Math.max(margin, parentWidth - width - margin);
    const minY = margin;
    const maxY = Math.max(margin, parentHeight - height - margin);

    return {
      x: Math.max(minX, Math.min(maxX, pos.x)),
      y: Math.max(minY, Math.min(maxY, pos.y)),
    };
  }, []);

  // Window-level dragging listeners
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
      const width = containerRef.current?.offsetWidth || (isOpen ? 440 : 280);
      const height = containerRef.current?.offsetHeight || (isOpen ? 400 : 40);

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
  }, [isDragging, isOpen, clamp]);

  if (!demoPatients || demoPatients.length === 0) {
    return null;
  }

  const activePatient = demoPatients.find((p) => p.id === selectedPersonaId) || demoPatients[0];
  const activeCadProb = activePatient?.prediction?.cad?.prob ?? 0;
  const activeRiskLabel = `${(activeCadProb * 100).toFixed(0)}% CAD`;

  return (
    <div
      ref={containerRef}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        touchAction: 'none',
      }}
      className={`absolute top-0 left-0 z-30 select-none transition-shadow pointer-events-auto ${
        isDragging ? 'cursor-grabbing shadow-2xl scale-[1.01]' : 'shadow-xl'
      }`}
      data-testid="persona-picker-hud"
    >
      {!isOpen ? (
        /* Collapsed Floating Pill */
        <div
          className="bg-[#090d16]/95 backdrop-blur-md border border-slate-700/80 hover:border-cyan-500/60 rounded-xl px-3 py-1.5 flex items-center gap-2.5 text-xs text-slate-200 shadow-2xl transition-all"
        >
          {/* Drag Handle */}
          <div
            onPointerDown={handlePointerDown}
            className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-cyan-400 p-0.5"
            title="Drag to reposition Access Patient tool"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 5a2 2 0 11-4 0 2 2 0 014 0zm0 7a2 2 0 11-4 0 2 2 0 014 0zm0 7a2 2 0 11-4 0 2 2 0 014 0zm10-14a2 2 0 11-4 0 2 2 0 014 0zm0 7a2 2 0 11-4 0 2 2 0 014 0zm0 7a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>

          {/* Quick Access Status */}
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 hover:opacity-90 transition-opacity"
            title="Click to open Holdout Patient selector"
          >
            <div className="flex items-center gap-1.5 font-bold text-white tracking-tight">
              <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Access Patient:</span>
              <span className="text-cyan-300 font-semibold">{activePatient?.name}</span>
            </div>

            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                activeCadProb >= 0.7
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-800/60'
                  : activeCadProb >= 0.4
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-800/60'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-800/60'
              }`}
            >
              {activeRiskLabel}
            </span>

            <span className="text-slate-400 hover:text-white text-[11px] font-bold">
              ▼
            </span>
          </button>
        </div>
      ) : (
        /* Expanded Floating Tool Card */
        <div className="w-[92vw] sm:w-[460px] bg-[#090d16]/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-xs max-h-[75vh]">
          {/* Header Bar */}
          <div
            className="bg-slate-900/90 border-b border-slate-800/80 px-3.5 py-2.5 flex items-center justify-between"
          >
            <div
              onPointerDown={handlePointerDown}
              className="flex items-center gap-2 cursor-grab active:cursor-grabbing flex-1 mr-2"
              title="Drag to reposition Access Patient window"
            >
              <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 5a2 2 0 11-4 0 2 2 0 014 0zm0 7a2 2 0 11-4 0 2 2 0 014 0zm0 7a2 2 0 11-4 0 2 2 0 014 0zm10-14a2 2 0 11-4 0 2 2 0 014 0zm0 7a2 2 0 11-4 0 2 2 0 014 0zm0 7a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <div className="flex items-center gap-1.5 font-bold text-white tracking-wide">
                <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Access Patient</span>
                <span className="text-[10px] font-normal text-slate-400">
                  (8 Holdout Personas)
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-6 h-6 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-xs transition-colors border border-slate-700/60"
              title="Collapse Access Patient menu"
            >
              ▲
            </button>
          </div>

          {/* Subtext info */}
          <div className="px-3.5 py-1.5 bg-slate-950/60 border-b border-slate-800/60 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Select a benchmark patient to load multimodal clinical inputs:</span>
            <span className="font-mono text-cyan-400 text-[10px]">UCI 411 Test Set</span>
          </div>

          {/* Patients List */}
          <div className="p-2.5 overflow-y-auto flex flex-col gap-1.5 scrollbar-thin">
            {demoPatients.map((patient: DemoPatient) => {
              const isSelected = selectedPersonaId === patient.id;
              const cadProb = patient.prediction?.cad?.prob ?? 0;
              const isHighRisk = cadProb >= 0.70;
              const isMidRisk = cadProb >= 0.40 && cadProb < 0.70;

              // Truth label description
              const stenoticVessels = Object.entries(patient.truth)
                .filter(([k, v]) => k !== 'CAD' && v === 1)
                .map(([k]) => k);
              const truthDesc =
                patient.truth.CAD === 0
                  ? 'Normal'
                  : stenoticVessels.length === 0
                  ? 'CAD+'
                  : `${stenoticVessels.join('+')}`;

              return (
                <button
                  key={patient.id}
                  type="button"
                  onClick={() => {
                    loadPersona(patient);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all border text-left ${
                    isSelected
                      ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200 shadow-md shadow-cyan-950/50 scale-[1.01]'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <div>
                      <div className="font-bold text-white text-[12px]">{patient.name}</div>
                      <div className="text-[10px] text-slate-400">
                        {patient.features?.Age ?? 60}y &bull; {patient.features?.Sex ?? 'Male'} &bull; EF: {patient.features?.['EF-TTE'] ?? 50}%
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Truth badge */}
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-mono font-bold ${
                        patient.truth.CAD === 1
                          ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                          : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                      }`}
                      title={`Ground Truth: CAD=${patient.truth.CAD}, LAD=${patient.truth.LAD}, LCX=${patient.truth.LCX}, RCA=${patient.truth.RCA}`}
                    >
                      Truth: {truthDesc}
                    </span>

                    {/* Predicted Risk badge */}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        isHighRisk
                          ? 'bg-red-500/20 text-red-300 border border-red-800/60'
                          : isMidRisk
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-800/60'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-800/60'
                      }`}
                    >
                      {(cadProb * 100).toFixed(0)}% CAD
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
