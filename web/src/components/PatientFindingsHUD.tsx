import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { evaluatePatientFindings, PatientFinding } from '../clinical/patientFindingsEngine';

interface Position {
  x: number;
  y: number;
}

export const PatientFindingsHUD: React.FC = () => {
  const patientInputs = useStore((state) => state.patientInputs);
  const selectedStructure = useStore((state) => state.selectedInternalStructure);
  const setSelectedStructure = useStore((state) => state.setSelectedInternalStructure);
  const setCameraPreset = useStore((state) => state.setCameraPreset);
  const setSelectedVessel = useStore((state) => state.setSelectedVessel);

  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<Position>({ x: 16, y: 124 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragOffsetRef = useRef<{ offsetX: number; offsetY: number }>({ offsetX: 0, offsetY: 0 });

  const findings = React.useMemo(() => {
    return evaluatePatientFindings(patientInputs);
  }, [patientInputs]);

  // Initial placement at top-left under tools menu
  useEffect(() => {
    const parent = containerRef.current?.parentElement;
    if (parent) {
      const parentWidth = parent.clientWidth;
      setPosition({
        x: Math.max(16, Math.min(parentWidth - 320, 16)),
        y: 124,
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
      const width = containerRef.current?.offsetWidth || 300;
      const height = containerRef.current?.offsetHeight || 40;

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
  }, [isDragging, clamp]);

  const handleSelectFinding = (finding: PatientFinding) => {
    // 1. Direct camera preset navigation to affected anatomical region
    setCameraPreset(finding.cameraPreset);

    // 2. Highlight anatomical pin and open Doctor Inspection Drawer
    setSelectedStructure(finding.targetStructureId);

    // 3. Highlight supplying coronary artery if applicable
    if (
      finding.supplyingVessel === 'LAD' ||
      finding.supplyingVessel === 'LCX' ||
      finding.supplyingVessel === 'RCA'
    ) {
      setSelectedVessel(finding.supplyingVessel);
    }
  };

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
      data-testid="patient-findings-hud"
    >
      {isCollapsed ? (
        /* Collapsed Findings Pill */
        <div className="bg-[#090d16]/95 backdrop-blur-md border border-slate-700/80 hover:border-rose-500/60 rounded-xl px-3 py-1.5 flex items-center gap-2.5 text-xs text-slate-200 shadow-2xl transition-all">
          <div
            onPointerDown={handlePointerDown}
            className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-rose-400 p-0.5"
            title="Drag to reposition Findings HUD"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 5a2 2 0 11-4 0 2 2 0 014 0zm0 7a2 2 0 11-4 0 2 2 0 014 0zm0 7a2 2 0 11-4 0 2 2 0 014 0zm10-14a2 2 0 11-4 0 2 2 0 014 0zm0 7a2 2 0 11-4 0 2 2 0 014 0zm0 7a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>

          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="flex items-center gap-2 hover:opacity-90"
            title="Expand Clinical Findings HUD"
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="font-semibold text-white tracking-tight">Clinical Findings:</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-200 font-mono text-[10px] font-bold">
              {findings.length}
            </span>
            <span className="text-slate-400 text-[10px] font-bold">▼</span>
          </button>
        </div>
      ) : (
        /* Expanded Findings Floating Bar */
        <div className="bg-[#090d16]/95 backdrop-blur-xl border border-slate-800 rounded-xl shadow-2xl p-1.5 flex items-center gap-2 max-w-[94vw] overflow-x-auto scrollbar-thin">
          {/* Drag Handle */}
          <div
            onPointerDown={handlePointerDown}
            className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-white p-1 shrink-0"
            title="Drag to reposition Findings Bar"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 5a2 2 0 11-4 0 2 2 0 014 0zm0 7a2 2 0 11-4 0 2 2 0 014 0zm0 7a2 2 0 11-4 0 2 2 0 014 0zm10-14a2 2 0 11-4 0 2 2 0 014 0zm0 7a2 2 0 11-4 0 2 2 0 014 0zm0 7a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>

          {/* Title Chip */}
          <div className="flex items-center gap-1.5 shrink-0 bg-slate-900/90 px-2 py-1 rounded-lg border border-slate-800 text-[11px] font-semibold text-slate-300">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>Findings:</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-200 font-mono text-[10px]">
              {findings.length}
            </span>
          </div>

          {/* Findings Badges List */}
          {findings.length === 0 ? (
            <div className="bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1.5 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>No abnormal anatomical findings (Healthy Screening)</span>
            </div>
          ) : (
            findings.map((f) => {
              const isSelected = selectedStructure === f.targetStructureId;

              let badgeClasses = 'bg-slate-900/80 border-slate-700 text-slate-300 hover:border-slate-500';
              if (f.severity === 'critical') {
                badgeClasses = isSelected
                  ? 'bg-rose-950 text-rose-100 border-rose-500 ring-2 ring-rose-500/50 shadow-rose-950/60 shadow-md'
                  : 'bg-rose-950/80 text-rose-200 border-rose-700/80 hover:bg-rose-900/90';
              } else if (f.severity === 'abnormal') {
                badgeClasses = isSelected
                  ? 'bg-amber-950 text-amber-100 border-amber-500 ring-2 ring-amber-500/50 shadow-amber-950/60 shadow-md'
                  : 'bg-amber-950/80 text-amber-200 border-amber-700/80 hover:bg-amber-900/90';
              } else if (f.severity === 'warning') {
                badgeClasses = isSelected
                  ? 'bg-orange-950 text-orange-100 border-orange-500 ring-2 ring-orange-500/50 shadow-orange-950/60 shadow-md'
                  : 'bg-orange-950/80 text-orange-200 border-orange-700/80 hover:bg-orange-900/90';
              }

              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handleSelectFinding(f)}
                  className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${badgeClasses}`}
                  title={`Click to focus camera (${f.cameraPreset}), highlight pin, and inspect ${f.structureName} (${f.supplyingVessel})`}
                  data-testid={`finding-badge-${f.id}`}
                >
                  <span>{f.badgeLabel}</span>
                  <span className="text-[10px] opacity-70">➔</span>
                  <span className="font-semibold text-white/90">{f.structureName.split(' ')[0]}</span>
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-black/40 text-cyan-300 border border-cyan-800/40">
                    {f.supplyingVessel}
                  </span>
                </button>
              );
            })
          )}

          {/* Minimize / Collapse Button */}
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="w-5 h-5 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-[10px] transition-colors shrink-0 border border-slate-700/60 ml-1"
            title="Minimize Findings Bar"
          >
            ▲
          </button>
        </div>
      )}
    </div>
  );
};
