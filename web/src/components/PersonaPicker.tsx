import React from 'react';
import { useStore } from '../store/useStore';
import { DemoPatient } from '../api/client';

export const PersonaPicker: React.FC = () => {
  const demoPatients = useStore((state) => state.demoPatients);
  const selectedPersonaId = useStore((state) => state.selectedPersonaId);
  const loadPersona = useStore((state) => state.loadPersona);

  if (!demoPatients || demoPatients.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2.5 overflow-x-auto scrollbar-thin">
      <div className="flex items-center gap-2.5 min-w-max">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold uppercase tracking-wider pr-2 border-r border-slate-800">
          <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>Holdout Personas:</span>
        </div>

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
              onClick={() => loadPersona(patient)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                isSelected
                  ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200 shadow-md shadow-cyan-950/50 scale-[1.02]'
                  : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/50'
              }`}
            >
              <span className="font-bold">{patient.name}</span>

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
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                  isHighRisk
                    ? 'bg-red-500/20 text-red-300'
                    : isMidRisk
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-emerald-500/20 text-emerald-300'
                }`}
              >
                {(cadProb * 100).toFixed(0)}% CAD
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
