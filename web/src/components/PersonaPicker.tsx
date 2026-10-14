import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { DemoPatient } from '../api/client';

export const PersonaPicker: React.FC = () => {
  const demoPatients = useStore((state) => state.demoPatients);
  const selectedPersonaId = useStore((state) => state.selectedPersonaId);
  const loadPersona = useStore((state) => state.loadPersona);

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!demoPatients || demoPatients.length === 0) {
    return null;
  }

  const activePatient = demoPatients.find((p) => p.id === selectedPersonaId) || demoPatients[0];
  const activeCadProb = activePatient?.prediction?.cad?.prob ?? 0;
  const activeRiskLabel = `${(activeCadProb * 100).toFixed(0)}% CAD`;

  // Determine active ground truth vessel stenoses
  const activeStenoticVessels = Object.entries(activePatient?.truth ?? {})
    .filter(([k, v]) => k !== 'CAD' && v === 1)
    .map(([k]) => k);
  const activeTruthDesc =
    activePatient?.truth?.CAD === 0
      ? 'Normal'
      : activeStenoticVessels.length === 0
      ? 'CAD+'
      : activeStenoticVessels.join('+');

  // Quick Pagination Prev / Next
  const currentIndex = demoPatients.findIndex((p) => p.id === activePatient.id);
  const handlePrevPersona = () => {
    const prevIdx = (currentIndex - 1 + demoPatients.length) % demoPatients.length;
    loadPersona(demoPatients[prevIdx]);
  };
  const handleNextPersona = () => {
    const nextIdx = (currentIndex + 1) % demoPatients.length;
    loadPersona(demoPatients[nextIdx]);
  };

  return (
    <div
      ref={containerRef}
      className="bg-card/95 backdrop-blur-md border-b border-border border-slate-800/80 px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs z-20 shadow-md relative"
      data-testid="persona-picker-hud"
    >
      {/* Left Sub-Section: Access Patient Label & Dropdown Trigger */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1.5 font-bold text-foreground tracking-wide">
          <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="hidden sm:inline">Access Patient:</span>
        </div>

        {/* Dropdown Trigger Pill */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="bg-secondary/80 hover:bg-secondary border border-border hover:border-primary/60 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs text-foreground shadow-md transition-all cursor-pointer group"
          title="Click to select another benchmark patient persona"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <span className="text-primary font-semibold group-hover:text-primary/80 transition-colors">
            {activePatient.name}
          </span>

          {/* Predicted Risk Badge */}
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

          {/* Truth Badge */}
          <span
            className={`hidden md:inline-block px-1.5 py-0.5 rounded text-[10px] uppercase font-mono font-bold ${
              activePatient.truth.CAD === 1
                ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
            }`}
            title={`Ground Truth Angiography: CAD=${activePatient.truth.CAD}`}
          >
            Truth: {activeTruthDesc}
          </span>

          {/* Dropdown Arrow */}
          <span className="text-muted-foreground group-hover:text-foreground text-[10px] font-bold transition-transform">
            {isOpen ? '▲' : '▼'}
          </span>
        </button>
      </div>

      {/* Center Sub-Section: Compact Active Vitals Strip */}
      <div className="hidden md:flex items-center gap-2.5 text-[11px] text-muted-foreground bg-muted/40 border border-border/80 rounded-xl px-3 py-1 font-mono">
        <span>
          <strong className="text-foreground">Age:</strong> {activePatient.features?.Age ?? 60}y
        </span>
        <span className="text-muted-foreground/50">•</span>
        <span>
          <strong className="text-foreground">Sex:</strong> {activePatient.features?.Sex ?? 'Male'}
        </span>
        <span className="text-muted-foreground/50">•</span>
        <span>
          <strong className="text-foreground">EF:</strong> {activePatient.features?.['EF-TTE'] ?? 50}%
        </span>
        <span className="text-muted-foreground/50">•</span>
        <span>
          <strong className="text-foreground">BP:</strong> {activePatient.features?.BP ?? 120} mmHg
        </span>
        <span className="text-muted-foreground/50">•</span>
        <span>
          <strong className="text-foreground">PR:</strong> {activePatient.features?.PR ?? 75} bpm
        </span>
      </div>

      {/* Right Sub-Section: Benchmark Badge & Pagination Controls */}
      <div className="flex items-center gap-2">
        <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/30 font-mono text-[10px]">
          <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
          UCI 411 Benchmark (N=8)
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevPersona}
            className="px-2.5 py-1 rounded-lg bg-secondary/80 hover:bg-secondary text-secondary-foreground hover:text-foreground border border-border transition-colors flex items-center gap-1 font-semibold text-[11px]"
            title="Previous Holdout Persona (Wrap-around)"
            aria-label="Previous Persona"
          >
            <span>◀</span>
            <span className="hidden sm:inline">Prev</span>
          </button>
          <button
            type="button"
            onClick={handleNextPersona}
            className="px-2.5 py-1 rounded-lg bg-secondary/80 hover:bg-secondary text-secondary-foreground hover:text-foreground border border-border transition-colors flex items-center gap-1 font-semibold text-[11px]"
            title="Next Holdout Persona (Wrap-around)"
            aria-label="Next Persona"
          >
            <span className="hidden sm:inline">Next</span>
            <span>▶</span>
          </button>
        </div>
      </div>

      {/* Anchored Popover / Dropdown Menu for Persona Selection */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-4 sm:left-6 mt-1.5 z-50 w-[92vw] sm:w-[480px] bg-slate-950/98 backdrop-blur-3xl border border-border/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-xs max-h-[75vh] animate-in fade-in duration-150"
          role="listbox"
          aria-label="Benchmark Holdout Personas"
        >
          {/* Popover Header */}
          <div className="bg-muted/60 border-b border-border/80 px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <div className="flex items-center gap-1.5 font-bold text-foreground tracking-wide">
                <span>Access Patient</span>
                <span className="text-[10px] font-normal text-muted-foreground">
                  (8 Holdout Personas)
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-6 h-6 rounded-lg bg-secondary/80 hover:bg-secondary text-secondary-foreground hover:text-foreground flex items-center justify-center text-xs transition-colors border border-border"
              title="Close patient selector"
              aria-label="Close"
            >
              ▲
            </button>
          </div>

          {/* Subtext info */}
          <div className="px-4 py-1.5 bg-muted/30 border-b border-border/60 text-[11px] text-muted-foreground flex items-center justify-between">
            <span>Select a benchmark patient to load multimodal clinical inputs:</span>
            <span className="font-mono text-primary text-[10px] font-semibold">UCI 411 Test Set</span>
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
                  : stenoticVessels.join('+');

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
                      ? 'bg-primary/20 border-primary text-foreground shadow-md shadow-primary/20 scale-[1.01]'
                      : 'bg-card/90 border-border/80 text-card-foreground hover:border-primary/50 hover:bg-muted/70'
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-cyan-400' : 'bg-slate-600'}`} />
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

export default PersonaPicker;
