import React from 'react';
import { useStore } from '../store/useStore';
import { RiskExplainer } from './RiskExplainer';
import { SensitivityPanel } from './SensitivityPanel';
import { ClinicalForm } from './ClinicalForm';
import { DebugPanel } from './DebugPanel';

export const ClinicalPanel: React.FC = () => {
  const activeTab = useStore((state) => state.activeTab);
  const setActiveTab = useStore((state) => state.setActiveTab);
  const predictions = useStore((state) => state.predictions);
  const apiStatus = useStore((state) => state.apiStatus);

  const cadProb = predictions?.cad?.prob ?? 0;
  const isHighRisk = cadProb >= 0.7;
  const isMidRisk = cadProb >= 0.4 && cadProb < 0.7;

  return (
    <aside className="w-full lg:w-[460px] bg-slate-900/95 border-l border-slate-800 flex flex-col h-full shadow-2xl z-20">
      {/* Header Summary Card */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/70">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
              Risk Stratification
            </span>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                apiStatus === 'live'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                  : 'bg-amber-950 text-amber-400 border border-amber-800/60'
              }`}
            >
              {apiStatus === 'live' ? 'Live Model Serving' : 'Demo Offline Engine'}
            </span>
          </div>

          <div className="text-right">
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
          </div>
        </div>

        {/* Vessel Risk Micro-Badges */}
        {predictions && (
          <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-800/60 text-center">
            {(['LAD', 'LCX', 'RCA'] as const).map((vessel) => {
              const p = predictions.vessels[vessel]?.prob ?? 0;
              const isStenotic = p >= 0.5;
              return (
                <div
                  key={vessel}
                  className="bg-slate-900 p-1.5 rounded border border-slate-800 text-[11px]"
                >
                  <div className="text-slate-400 font-bold">{vessel}</div>
                  <div
                    className={`font-mono font-bold ${
                      p >= 0.7 ? 'text-rose-400' : p >= 0.4 ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  >
                    {(p * 100).toFixed(0)}%
                  </div>
                  <div className="text-[9px] text-slate-500 uppercase">
                    {isStenotic ? 'Stenotic' : 'Normal'}
                  </div>
                </div>
              );
            })}
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
