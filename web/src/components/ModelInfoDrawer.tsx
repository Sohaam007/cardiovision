import React from 'react';
import { MODEL_METRICS_DATA, TargetMetricSummary } from '../data/modelMetrics';

interface ModelInfoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModelInfoDrawer: React.FC<ModelInfoDrawerProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="model-info-title"
    >
      <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 id="model-info-title" className="text-sm font-bold text-slate-100">
                Model Information, Validation &amp; Clinical Limitations
              </h2>
              <p className="text-[11px] text-slate-400">
                Transparent evaluation metrics, calibration methodology, and safety guardrails
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close Model Info Drawer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto scrollbar-thin flex flex-col gap-5 text-xs text-slate-300">
          {/* Section 1: Validation Performance Table */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-100 uppercase tracking-wider text-[11px]">
                Cross-Validation Performance (Mean +/- SD)
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                RepeatedStratifiedKFold (5-fold x 3-repeat, N=295)
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-lg">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold font-mono">
                    <th className="py-2 px-2.5">Target</th>
                    <th className="py-2 px-2">ROC-AUC</th>
                    <th className="py-2 px-2">PR-AUC</th>
                    <th className="py-2 px-2">Accuracy</th>
                    <th className="py-2 px-2">Precision</th>
                    <th className="py-2 px-2">Recall</th>
                    <th className="py-2 px-2">F1</th>
                    <th className="py-2 px-2">Brier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 bg-slate-900/60 font-mono">
                  {MODEL_METRICS_DATA.map((row: TargetMetricSummary) => (
                    <tr key={row.target} className="hover:bg-slate-850/60 transition-colors">
                      <td className="py-2 px-2.5 font-bold text-slate-100 flex items-center gap-1.5 font-sans">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 text-[10px]">
                          {row.target}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-slate-200">
                        {row.rocAuc.mean.toFixed(3)} <span className="text-slate-500 text-[9px]">+/-{row.rocAuc.std.toFixed(3)}</span>
                      </td>
                      <td className="py-2 px-2 text-slate-200">
                        {row.prAuc.mean.toFixed(3)} <span className="text-slate-500 text-[9px]">+/-{row.prAuc.std.toFixed(3)}</span>
                      </td>
                      <td className="py-2 px-2 text-slate-200">
                        {row.accuracy.mean.toFixed(3)} <span className="text-slate-500 text-[9px]">+/-{row.accuracy.std.toFixed(3)}</span>
                      </td>
                      <td className="py-2 px-2 text-slate-200">
                        {row.precision.mean.toFixed(3)} <span className="text-slate-500 text-[9px]">+/-{row.precision.std.toFixed(3)}</span>
                      </td>
                      <td className="py-2 px-2 text-slate-200">
                        {row.recall.mean.toFixed(3)} <span className="text-slate-500 text-[9px]">+/-{row.recall.std.toFixed(3)}</span>
                      </td>
                      <td className="py-2 px-2 text-slate-200">
                        {row.f1.mean.toFixed(3)} <span className="text-slate-500 text-[9px]">+/-{row.f1.std.toFixed(3)}</span>
                      </td>
                      <td className="py-2 px-2 text-slate-200">
                        {row.brierScore.mean.toFixed(3)} <span className="text-slate-500 text-[9px]">+/-{row.brierScore.std.toFixed(3)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-[10px] text-slate-500 leading-relaxed">
              *All reported metrics are computed exclusively on outer out-of-fold test folds. 8 benchmark patients were held out entirely prior to training, validation, and calibration.
            </p>
          </div>

          {/* Section 2: Calibration Note */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 flex flex-col gap-1.5">
            <span className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              Probability Calibration Methodology
            </span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Raw margin outputs from XGBoost are calibrated using Platt scaling (Logistic Regression C=1e6) fitted strictly on out-of-fold decision margins within the training folds, never on test data. This ensures predicted probabilities represent empirical risk rates while preserving exact additive TreeSHAP explainability in calibrated log-odds space. Furthermore, the clinical hierarchy constraint P(CAD) &gt;= max(P(LAD), P(LCX), P(RCA)) is enforced server-side.
            </p>
          </div>

          {/* Section 3: Target Weakness & Specific Observations */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 flex flex-col gap-2">
            <span className="font-bold text-slate-200 text-xs">Target-Specific Diagnostic Notes</span>
            <div className="flex flex-col gap-1.5">
              {MODEL_METRICS_DATA.map((row) => (
                <div key={row.target} className="text-[11px] flex gap-2">
                  <span className="font-bold text-cyan-300 w-10 shrink-0 font-mono">{row.target}:</span>
                  <span className="text-slate-400">{row.notes}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Clinical Limitations */}
          <div className="bg-rose-950/20 border border-rose-900/40 rounded-lg p-3 flex flex-col gap-2 text-rose-200/90">
            <span className="font-bold text-rose-300 text-xs flex items-center gap-1.5">
              <svg className="w-4 h-4 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Clinical Limitations &amp; Guardrails
            </span>
            <ul className="list-disc pl-4 space-y-1 text-[11px]">
              <li>
                <strong>Single Center:</strong> Trained on data from Tehran Heart Center (Iran); external generalization across diverse demographic or ethnic cohorts has not been established.
              </li>
              <li>
                <strong>Small Sample Size:</strong> N=303 total patients (295 development, 8 holdout). Uncertainty intervals reflect finite cohort limitations.
              </li>
              <li>
                <strong>No Lesion Location:</strong> Catheterization records provide vessel-level binary classification (stenosis &gt;= 50%) without segmental coordinates. The 3D view renders whole-vessel probability and does not display focal lesions, narrowing rings, or localized plaques.
              </li>
              <li>
                <strong>Associational Model:</strong> Predictions represent statistical risk correlations from clinical, ECG, and echocardiographic variables. They are not causal mechanisms or therapy response predictions.
              </li>
            </ul>
          </div>

          {/* Section 5: Dataset & Asset Attributions */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 flex flex-col gap-2">
            <span className="font-bold text-slate-200 text-xs">Dataset Citation &amp; Asset Attribution</span>
            <div className="flex flex-col gap-1 text-[11px] text-slate-400">
              <p>
                <strong>Clinical Dataset:</strong> Alizadehsani, R., Roshanzamir, M., Sani, Z. &quot;Extension of Z-Alizadeh Sani Dataset&quot;. UCI Machine Learning Repository (DOI: 10.24432/C56W30, CC BY 4.0).
              </p>
              <p>
                <strong>3D Anatomy &amp; Shaders:</strong> Procedural coronary artery spline tubes (LAD, LCX, RCA), ventricular myocardial geometries, and translucent torso shell created under open-source project MIT license.
              </p>
              <p>
                <strong>Anatomical Reference:</strong> Database Center for Life Science (BodyParts3D) reference anatomical proportions.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <span className="text-[10px] text-slate-500 font-mono">
            CardioVision v1.0.0 | Disclaimer ID: d1
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
