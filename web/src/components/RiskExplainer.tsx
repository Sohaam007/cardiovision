import React from 'react';
import { useStore, TargetKey } from '../store/useStore';
import { ExplanationItem } from '../api/client';

export const RiskExplainer: React.FC = () => {
  const predictions = useStore((state) => state.predictions);
  const selectedTarget = useStore((state) => state.selectedTarget);
  const setSelectedTarget = useStore((state) => state.setSelectedTarget);

  if (!predictions) {
    return (
      <div className="p-6 text-center text-slate-400 text-sm">
        Select a patient persona above or enter clinical features to view explainability.
      </div>
    );
  }

  const targetKey = selectedTarget as keyof typeof predictions.explanations;
  const rawExplanations = predictions.explanations?.[targetKey] || [];
  const cadAdjusted = predictions.meta?.cad_adjusted ?? false;

  // Current target probability & details
  let targetProb = 0;
  let targetCi: [number, number] | undefined = undefined;
  if (selectedTarget === 'CAD') {
    targetProb = predictions.cad.prob;
    targetCi = predictions.cad.ci;
  } else {
    targetProb = predictions.vessels[selectedTarget]?.prob ?? 0;
  }

  const maxAbs = Math.max(...rawExplanations.map((item: ExplanationItem) => Math.abs(item.shap)), 0.1);

  return (
    <div className="flex flex-col gap-4">
      {/* Target Selector Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
          {(['CAD', 'LAD', 'LCX', 'RCA'] as TargetKey[]).map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTarget(t)}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                selectedTarget === t
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Selected target probability pill */}
        <div className="flex items-center gap-2 text-right">
          <span className="text-xs text-slate-400">Estimated Risk:</span>
          <span
            className={`text-sm font-bold font-mono px-2 py-0.5 rounded ${
              targetProb >= 0.7
                ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                : targetProb >= 0.4
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
            }`}
          >
            {(targetProb * 100).toFixed(1)}%
          </span>
          {targetCi && (
            <span className="text-[10px] text-slate-500 font-mono">
              [{(targetCi[0] * 100).toFixed(0)}%-{(targetCi[1] * 100).toFixed(0)}%]
            </span>
          )}
        </div>
      </div>

      {/* CAD Adjusted Constraint Notice */}
      {selectedTarget === 'CAD' && cadAdjusted && (
        <div className="bg-amber-950/60 border border-amber-700/60 rounded-lg p-2.5 text-xs text-amber-200 flex items-start gap-2">
          <svg className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <span className="font-semibold">Anatomical Hierarchy Enforced:</span> Overall CAD probability was adjusted
            upward to guarantee P(CAD) &ge; max(vessel probabilities).
          </div>
        </div>
      )}

      {/* Explanation Header */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="font-semibold text-slate-300">Calibrated Log-Odds Contributions (TreeSHAP)</span>
        <span className="text-[10px] text-slate-500">Space: Calibrated Logit</span>
      </div>

      {/* Feature Contributions List */}
      <div className="flex flex-col gap-2 max-h-[340px] overflow-y-auto pr-1 scrollbar-thin">
        {rawExplanations.map((item: ExplanationItem, idx: number) => {
          const isPositive = item.shap >= 0;
          const barWidthPct = Math.min(100, Math.round((Math.abs(item.shap) / maxAbs) * 100));

          return (
            <div key={`${item.feature}-${idx}`} className="flex flex-col gap-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-medium truncate max-w-[170px]" title={item.feature}>
                  {item.feature}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-mono text-[11px]">
                    val: {typeof item.value === 'number' ? item.value : String(item.value)}
                  </span>
                  <span
                    className={`font-mono font-semibold text-[11px] w-14 text-right ${
                      isPositive ? 'text-rose-400' : 'text-teal-400'
                    }`}
                  >
                    {isPositive ? `+${item.shap.toFixed(3)}` : item.shap.toFixed(3)}
                  </span>
                </div>
              </div>

              {/* Bar indicator */}
              <div className="w-full bg-slate-900 rounded-full h-2 relative flex items-center overflow-hidden">
                <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-slate-700 z-10" />
                {isPositive ? (
                  <div
                    className="h-full bg-gradient-to-r from-rose-600 to-rose-400 rounded-r transition-all duration-300"
                    style={{
                      marginLeft: '50%',
                      width: `${barWidthPct / 2}%`,
                    }}
                  />
                ) : (
                  <div
                    className="h-full bg-gradient-to-l from-teal-600 to-teal-400 rounded-l transition-all duration-300"
                    style={{
                      marginRight: '50%',
                      marginLeft: `${50 - barWidthPct / 2}%`,
                      width: `${barWidthPct / 2}%`,
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800/80 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
          <span>Increases Risk</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-teal-500 inline-block"></span>
          <span>Protective / Lowers Risk</span>
        </span>
      </div>
    </div>
  );
};
