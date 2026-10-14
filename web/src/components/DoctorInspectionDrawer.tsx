import React from 'react';
import { useStore, CardiacCyclePhase } from '../store/useStore';
import { INTERNAL_HEART_STRUCTURES } from '../data/heartAnatomyData';

export const DoctorInspectionDrawer: React.FC = () => {
  const selectedStructureKey = useStore((state) => state.selectedInternalStructure);
  const setSelectedStructure = useStore((state) => state.setSelectedInternalStructure);
  const cardiacCyclePhase = useStore((state) => state.cardiacCyclePhase);
  const setCardiacCyclePhase = useStore((state) => state.setCardiacCyclePhase);
  const prediction = useStore((state) => state.prediction);

  if (!selectedStructureKey) return null;

  const detail = INTERNAL_HEART_STRUCTURES[selectedStructureKey];
  if (!detail) return null;

  const relatedVesselKey =
    detail.coronaryPerfusion.primaryArtery === 'LAD'
      ? 'LAD'
      : detail.coronaryPerfusion.primaryArtery === 'LCX'
      ? 'LCX'
      : detail.coronaryPerfusion.primaryArtery === 'RCA'
      ? 'RCA'
      : null;

  const relatedVesselProb = relatedVesselKey
    ? (prediction.vessels[relatedVesselKey]?.prob ?? 0) * 100
    : null;

  const phases: { key: CardiacCyclePhase; label: string }[] = [
    { key: 'diastole', label: 'Diastole' },
    { key: 'isovolumetric', label: 'Isovolumetric' },
    { key: 'systole', label: 'Systole' },
    { key: 'relaxation', label: 'Relaxation' },
  ];

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-slate-950/95 backdrop-blur-xl border-l border-cyan-800/80 shadow-2xl flex flex-col text-slate-100 overflow-hidden animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-4 border-b border-slate-800/90 bg-gradient-to-r from-slate-900 to-cyan-950/40 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-900/60 text-cyan-300 border border-cyan-700/60">
              {detail.category}
            </span>
            <span className="text-xs font-mono text-slate-400 italic">
              {detail.latinName}
            </span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight leading-snug">
            {detail.name}
          </h2>
        </div>
        <button
          onClick={() => setSelectedStructure(null)}
          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          title="Close Inspector"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Body content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Live Patient Risk Banner */}
        {relatedVesselKey && relatedVesselProb !== null && (
          <div
            className={`p-3 rounded-lg border flex items-center justify-between ${
              relatedVesselProb >= 70
                ? 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                : relatedVesselProb >= 40
                ? 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                : 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-lg font-bold font-mono">{relatedVesselKey}</span>
              <span className="text-[11px] leading-tight">
                Supplying Vessel Risk: <strong>{relatedVesselProb.toFixed(1)}%</strong>
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                relatedVesselProb >= 70
                  ? 'bg-rose-900 text-rose-100'
                  : relatedVesselProb >= 40
                  ? 'bg-amber-900 text-amber-100'
                  : 'bg-emerald-900 text-emerald-100'
              }`}
            >
              {relatedVesselProb >= 70 ? 'High Risk' : relatedVesselProb >= 40 ? 'Moderate' : 'Low Risk'}
            </span>
          </div>
        )}

        {/* 1. Physiological & Anatomical Metrics */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 space-y-2">
          <h3 className="font-semibold text-cyan-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Clinical & Echocardiographic Metrics
          </h3>
          <div className="grid grid-cols-1 gap-1.5 text-slate-300">
            <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 uppercase block font-medium">Dimensions & Wall Thickness</span>
              <span className="font-semibold text-slate-100">{detail.normalMetrics.dimensions}</span>
            </div>
            <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 uppercase block font-medium">Intracardiac Pressures</span>
              <span className="font-semibold text-slate-100">{detail.normalMetrics.pressures}</span>
            </div>
            {detail.normalMetrics.velocityOrVolume && (
              <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 uppercase block font-medium">Doppler Velocity / Volumes</span>
                <span className="font-semibold text-slate-100">{detail.normalMetrics.velocityOrVolume}</span>
              </div>
            )}
          </div>
        </div>

        {/* 2. Cardiac Cycle Dynamic Behavior */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-rose-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Cardiac Cycle Dynamics (Wiggers)
            </h3>
          </div>

          <div className="grid grid-cols-4 gap-1">
            {phases.map((phase) => (
              <button
                key={phase.key}
                onClick={() => setCardiacCyclePhase(phase.key)}
                className={`px-1.5 py-1 rounded text-[10px] font-medium transition-all ${
                  cardiacCyclePhase === phase.key
                    ? 'bg-rose-950 text-rose-200 border border-rose-600 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                {phase.label}
              </button>
            ))}
          </div>

          <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800 text-slate-200 leading-relaxed text-[11px]">
            <span className="font-semibold text-rose-400 block mb-1">
              Active Phase: {cardiacCyclePhase.toUpperCase()}
            </span>
            {detail.cardiacCycleDynamics[cardiacCyclePhase as keyof typeof detail.cardiacCycleDynamics]}
          </div>
        </div>

        {/* 3. Coronary Artery Perfusion Map */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
          <h3 className="font-semibold text-amber-300 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Coronary Perfusion Architecture
          </h3>
          <p className="text-slate-300 leading-relaxed text-[11px]">
            <strong className="text-white">Primary Artery: {detail.coronaryPerfusion.primaryArtery}</strong> —{' '}
            {detail.coronaryPerfusion.vesselDetails}
          </p>
        </div>

        {/* 4. Pathology, Auscultation, & Surgical Considerations */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 space-y-2.5">
          <h3 className="font-semibold text-purple-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Clinical Pathology & Surgical Notes
          </h3>

          <div>
            <span className="text-[10px] text-purple-400 uppercase font-semibold block mb-1">Common Diseases & Lesions</span>
            <ul className="list-disc list-inside space-y-0.5 text-slate-300 text-[11px]">
              {detail.clinicalPathology.commonDiseases.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </div>

          <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] text-purple-400 uppercase font-semibold block mb-0.5">Auscultation & ECG Hallmarks</span>
            <p className="text-slate-300 text-[11px] leading-relaxed">{detail.clinicalPathology.auscultationOrECG}</p>
          </div>

          <div className="p-2 rounded bg-purple-950/30 border border-purple-900/60">
            <span className="text-[10px] text-purple-300 uppercase font-semibold block mb-0.5">Surgical Considerations</span>
            <p className="text-purple-200 text-[11px] leading-relaxed">{detail.clinicalPathology.surgicalConsiderations}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
