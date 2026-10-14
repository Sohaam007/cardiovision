import React from 'react';
import { useStore } from '../store/useStore';
import { RiskExplainer } from './RiskExplainer';
import { SensitivityPanel } from './SensitivityPanel';
import { ClinicalForm } from './ClinicalForm';
import { DebugPanel } from './DebugPanel';
import { getVesselColorHex } from '../scene/vesselConfig';

export const ClinicalPanel: React.FC = () => {
  const activeTab = useStore((state) => state.activeTab);
  const setActiveTab = useStore((state) => state.setActiveTab);
  const predictions = useStore((state) => state.predictions);
  const apiStatus = useStore((state) => state.apiStatus);
  const modelServerUnavailable = useStore((state) => state.modelServerUnavailable);
  const selectedVessel = useStore((state) => state.selectedVessel);
  const setSelectedVessel = useStore((state) => state.setSelectedVessel);
  const colorblindMode = useStore((state) => state.colorblindMode);

  const cadProb = predictions?.cad?.prob ?? 0;
  const cadLabel = cadProb >= 0.5 ? 'Likely CAD (Significant Stenosis)' : 'Unlikely Significant CAD';
  const cadThreshold = predictions?.meta?.thresholds?.CAD ?? 0.5;
  const cadCi = predictions?.cad?.ci;

  const isHighRisk = cadProb >= 0.7;
  const isMidRisk = cadProb >= 0.4 && cadProb < 0.7;

  return (
    <aside className="w-full lg:w-[460px] bg-slate-900/95 border-l border-slate-800 flex flex-col h-full shadow-2xl z-20">
      {/* 1. Overall CAD Card & Multi-Vessel Stratification Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex flex-col gap-3">
        {/* Overall CAD Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-300">
                Overall CAD Risk
              </span>
              <span
                className={`text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  modelServerUnavailable
                    ? 'bg-rose-950 text-rose-300 border border-rose-800/80'
                    : apiStatus === 'waking'
                    ? 'bg-amber-950/80 text-amber-300 border border-amber-600/60 animate-pulse'
                    : apiStatus === 'live'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                    : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                }`}
              >
                {modelServerUnavailable
                  ? 'Server Offline'
                  : apiStatus === 'waking'
                  ? 'Waking Server...'
                  : apiStatus === 'live'
                  ? 'Live Server'
                  : 'Demo Mode'}
              </span>
            </div>

            <div className="text-right">
              {modelServerUnavailable ? (
                <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/60">
                  Model Offline
                </span>
              ) : apiStatus === 'waking' ? (
                <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/60 animate-pulse">
                  Waking Server...
                </span>
              ) : (
                <span
                  className={`text-lg font-black font-mono px-2.5 py-0.5 rounded ${
                    isHighRisk
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : isMidRisk
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {(cadProb * 100).toFixed(0)}% CAD
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-800/60 text-slate-400">
            <span className="font-medium text-slate-300">{cadLabel}</span>
            <div className="flex items-center gap-2 font-mono text-[10px]">
              <span>Threshold: &ge; {(cadThreshold * 100).toFixed(0)}%</span>
              {cadCi && (
                <span className="text-slate-500">
                  95% CI: [{(cadCi[0] * 100).toFixed(0)}%-{(cadCi[1] * 100).toFixed(0)}%]
                </span>
              )}
            </div>
          </div>
        </div>

        {apiStatus === 'waking' && (
          <div className="bg-amber-950/40 border border-amber-700/60 rounded-lg p-2.5 text-amber-200 text-xs flex items-center gap-2 animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0"></span>
            <span>Waking the model server... Initial cloud spin-up may take ~30s. Demo holdout mode active in the interim.</span>
          </div>
        )}

        {/* Three Vessel Interactive Cards (LAD, LCX, RCA) */}
        {predictions && (
          <div className="flex flex-col gap-1.5">
            <div className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider text-center">
              predicted probability of significant stenosis
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              {(['LAD', 'LCX', 'RCA'] as const).map((vKey) => {
                const prob = predictions.vessels[vKey]?.prob ?? 0;
                const isSelected = selectedVessel === vKey;
                const hexColor = getVesselColorHex(prob, colorblindMode);
                const isProbable = prob >= 0.5;

                return (
                  <button
                    key={vKey}
                    type="button"
                    onClick={() => setSelectedVessel(vKey, true)}
                    className={`p-2 rounded-lg border transition-all text-left flex flex-col gap-1 ${
                      isSelected
                        ? 'ring-2 ring-cyan-400 border-cyan-500 bg-cyan-950/40 shadow-md'
                        : 'border-slate-800 bg-slate-900/80 hover:border-slate-700 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/40"
                          style={{ backgroundColor: hexColor }}
                        />
                        <span className="text-slate-200 font-bold text-xs">{vKey}</span>
                      </div>
                      <span className="font-mono font-bold text-xs text-slate-100">
                        {modelServerUnavailable ? '--%' : `${(prob * 100).toFixed(0)}%`}
                      </span>
                    </div>

                    <div className="text-[9px] text-slate-400 font-medium">
                      {modelServerUnavailable
                        ? 'Offline'
                        : isProbable
                        ? 'Probable (≥50%)'
                        : 'Low (<50%)'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-800 bg-slate-950 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('explainability')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-all ${
            activeTab === 'explainability'
              ? 'border-cyan-500 text-cyan-300 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Explainability
        </button>
        <button
          onClick={() => setActiveTab('sensitivity')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-all ${
            activeTab === 'sensitivity'
              ? 'border-cyan-500 text-cyan-300 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Sensitivity
        </button>
        <button
          onClick={() => setActiveTab('form')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-all ${
            activeTab === 'form'
              ? 'border-cyan-500 text-cyan-300 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Clinical Form
        </button>
        <button
          onClick={() => setActiveTab('3d_debug')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-all ${
            activeTab === '3d_debug'
              ? 'border-cyan-500 text-cyan-300 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          3D View
        </button>
      </div>

      {/* Tab Content Body */}
      <div className="p-4 flex-1 overflow-y-auto scrollbar-thin">
        {activeTab === 'explainability' && <RiskExplainer />}
        {activeTab === 'sensitivity' && <SensitivityPanel />}
        {activeTab === 'form' && <ClinicalForm />}
        {activeTab === '3d_debug' && <DebugPanel />}
      </div>
    </aside>
  );
};
