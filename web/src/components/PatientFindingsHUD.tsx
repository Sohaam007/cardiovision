import React from 'react';
import { useStore } from '../store/useStore';
import { evaluatePatientFindings, PatientFinding } from '../clinical/patientFindingsEngine';

export const PatientFindingsHUD: React.FC = () => {
  const patientInputs = useStore((state) => state.patientInputs);
  const selectedStructure = useStore((state) => state.selectedInternalStructure);
  const setSelectedStructure = useStore((state) => state.setSelectedInternalStructure);
  const setCameraPreset = useStore((state) => state.setCameraPreset);
  const setSelectedVessel = useStore((state) => state.setSelectedVessel);

  const findings = React.useMemo(() => {
    return evaluatePatientFindings(patientInputs);
  }, [patientInputs]);

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
      className="w-full flex items-center justify-start gap-2 overflow-x-auto py-1 px-1 scrollbar-none"
      data-testid="patient-findings-hud"
    >
      <div className="flex items-center gap-1.5 shrink-0 bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 text-[11px] font-semibold text-slate-300 shadow-md">
        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
        <span>Findings:</span>
        <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-200 font-mono text-[10px]">
          {findings.length}
        </span>
      </div>

      {findings.length === 0 ? (
        <div className="bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1.5 shrink-0 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>No abnormal anatomical findings detected (Healthy Screening)</span>
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
    </div>
  );
};
