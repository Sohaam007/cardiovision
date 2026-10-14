import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';

interface MetricStat {
  mean: number;
  std: number;
  ci95: [number, number];
}

interface TargetMetrics {
  prevalence: {
    positive: number;
    negative: number;
    rate: number;
  };
  notes?: string;
  best_hyperparameters: Record<string, any>;
  operating_thresholds: {
    default: number;
    high_recall: number;
  };
  xgb_calibrated: Record<string, MetricStat>;
  xgb_uncalibrated: Record<string, MetricStat>;
  xgb_high_recall_threshold: Record<string, MetricStat>;
  baselines: {
    dummy: Record<string, MetricStat>;
    elasticnet: Record<string, MetricStat>;
    random_forest: Record<string, MetricStat>;
  };
}

interface AblationTarget {
  full_features: { feature_count: number; roc_auc_mean: number; roc_auc_std: number; pr_auc_mean: number };
  without_lab: { feature_count: number; excluded_count: number; roc_auc_mean: number; roc_auc_std: number; pr_auc_mean: number };
  without_echo: { feature_count: number; excluded_count: number; roc_auc_mean: number; roc_auc_std: number; pr_auc_mean: number };
}

interface MetricsPayload {
  metadata: {
    dataset_rows_total: number;
    dev_rows_count: number;
    holdout_rows_count: number;
    cv_protocol: string;
    total_cv_folds: number;
    evaluation_rule: string;
  };
  targets: Record<string, TargetMetrics>;
  feature_ablations?: Record<string, AblationTarget>;
}

export const ModelInfoDrawer: React.FC = () => {
  const isModelInfoOpen = useStore((state) => state.isModelInfoOpen);
  const closeModelInfo = useStore((state) => state.closeModelInfo);

  const [metrics, setMetrics] = useState<MetricsPayload | null>(null);
  const [selectedTab, setSelectedTab] = useState<'cad' | 'lad' | 'lcx' | 'rca' | 'ablations' | 'protocol'>('cad');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isModelInfoOpen) return;

    fetch('/metrics.json')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load metrics.json');
        return res.json();
      })
      .then((data: MetricsPayload) => {
        setMetrics(data);
        setLoading(false);
      })
      .catch((err) => {
        console.warn('Could not load metrics.json:', err);
        setLoading(false);
      });
  }, [isModelInfoOpen]);

  if (!isModelInfoOpen) return null;

  const currentTarget = ['cad', 'lad', 'lcx', 'rca'].includes(selectedTab)
    ? metrics?.targets?.[selectedTab]
    : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
              <h2 className="text-base font-bold text-white tracking-tight">Model Validation & Quality Details</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              RepeatedStratifiedKFold (5 splits x 3 repeats = 15 folds) &bull; N=295 Development Set
            </p>
          </div>
          <button
            onClick={closeModelInfo}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close Model Info"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/80 text-xs font-semibold overflow-x-auto">
          {(['cad', 'lad', 'lcx', 'rca'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTab(t)}
              className={`px-4 py-2.5 uppercase tracking-wider transition-all border-b-2 shrink-0 ${
                selectedTab === t
                  ? 'border-cyan-500 text-cyan-300 bg-slate-900/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {t} Model
            </button>
          ))}
          <button
            onClick={() => setSelectedTab('ablations')}
            className={`px-4 py-2.5 tracking-wider transition-all border-b-2 shrink-0 ${
              selectedTab === 'ablations'
                ? 'border-cyan-500 text-cyan-300 bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Feature Ablations
          </button>
          <button
            onClick={() => setSelectedTab('protocol')}
            className={`px-4 py-2.5 tracking-wider transition-all border-b-2 shrink-0 ${
              selectedTab === 'protocol'
                ? 'border-cyan-500 text-cyan-300 bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Protocol & Invariants
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 p-5 overflow-y-auto scrollbar-thin space-y-5 text-xs text-slate-300">
          {loading && (
            <div className="p-8 text-center text-slate-400">Loading cross-validation metrics...</div>
          )}

          {!loading && currentTarget && (
            <>
              {/* Target Header & Prevalence */}
              <div className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div>
                  <div className="text-sm font-bold text-white uppercase tracking-wide">
                    {selectedTab.toUpperCase()} Target Details
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Prevalence: {currentTarget.prevalence.positive} positive / {currentTarget.prevalence.negative} negative
                    ({(currentTarget.prevalence.rate * 100).toFixed(1)}%)
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Best Hyperparameters</span>
                  <span className="font-mono text-cyan-400 text-[11px]">
                    depth={currentTarget.best_hyperparameters.max_depth}, trees={currentTarget.best_hyperparameters.n_estimators}, lr={currentTarget.best_hyperparameters.learning_rate}
                  </span>
                </div>
              </div>

              {/* Clinical Note & Weak Target Transparency */}
              {currentTarget.notes && (
                <div
                  className={`p-3.5 rounded-lg border ${
                    selectedTab === 'rca' || selectedTab === 'lcx'
                      ? 'bg-amber-950/40 border-amber-600/60 text-amber-200'
                      : 'bg-cyan-950/40 border-cyan-700/60 text-cyan-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold mb-1">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>
                      {selectedTab === 'rca' || selectedTab === 'lcx'
                        ? 'Clinical Transparency: Vessel Signal Limitation'
                        : 'Clinical Validation Note'}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-95">{currentTarget.notes}</p>
                </div>
              )}

              {/* Core Out-of-Fold Cross-Validation Metrics */}
              <div>
                <h3 className="font-semibold text-white mb-2 uppercase tracking-wider text-[11px] text-slate-400">
                  Cross-Validation Metrics (Mean &plusmn; SD across 15 folds)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: 'ROC-AUC', key: 'roc_auc', highlight: true },
                    { label: 'PR-AUC', key: 'pr_auc', highlight: true },
                    { label: 'Accuracy', key: 'accuracy' },
                    { label: 'Balanced Acc', key: 'balanced_accuracy' },
                    { label: 'Precision', key: 'precision' },
                    { label: 'Recall', key: 'recall' },
                    { label: 'F1-Score', key: 'f1' },
                    { label: 'Brier Score', key: 'brier_score' },
                  ].map((m) => {
                    const item = currentTarget.xgb_calibrated[m.key];
                    if (!item) return null;
                    return (
                      <div
                        key={m.key}
                        className={`p-2.5 rounded-lg border ${
                          m.highlight
                            ? 'bg-cyan-950/30 border-cyan-800/80 text-cyan-200'
                            : 'bg-slate-950/80 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">{m.label}</div>
                        <div className="font-mono font-bold text-sm text-white mt-0.5">
                          {item.mean.toFixed(4)}
                        </div>
                        <div className="text-[9px] text-slate-500 font-mono">
                          &plusmn;{item.std.toFixed(4)} [{item.ci95[0].toFixed(3)}, {item.ci95[1].toFixed(3)}]
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Operating Thresholds: Default vs High Recall */}
              <div>
                <h3 className="font-semibold text-white mb-2 uppercase tracking-wider text-[11px] text-slate-400">
                  Operating Point Calibration (Clinical Triage)
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
                    <div className="font-bold text-slate-200 text-xs">Default Operating Point (p &ge; 0.50)</div>
                    <div className="mt-2 space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Recall (Sensitivity):</span>
                        <span className="font-mono font-bold text-slate-200">
                          {(currentTarget.xgb_calibrated.recall.mean * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Precision (PPV):</span>
                        <span className="font-mono font-bold text-slate-200">
                          {(currentTarget.xgb_calibrated.precision.mean * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Accuracy:</span>
                        <span className="font-mono font-bold text-slate-200">
                          {(currentTarget.xgb_calibrated.accuracy.mean * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
                    <div className="font-bold text-cyan-300 text-xs">
                      Screening Triage Point (p &ge; {currentTarget.operating_thresholds.high_recall})
                    </div>
                    <div className="mt-2 space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Recall (Target &ge;90%):</span>
                        <span className="font-mono font-bold text-cyan-400">
                          {(currentTarget.xgb_high_recall_threshold.recall.mean * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Precision (Rule-Out):</span>
                        <span className="font-mono font-bold text-slate-200">
                          {(currentTarget.xgb_high_recall_threshold.precision.mean * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Accuracy:</span>
                        <span className="font-mono font-bold text-slate-200">
                          {(currentTarget.xgb_high_recall_threshold.accuracy.mean * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Baseline Architecture Comparisons */}
              <div>
                <h3 className="font-semibold text-white mb-2 uppercase tracking-wider text-[11px] text-slate-400">
                  Baseline Architecture Benchmarks (Identical 15 Folds)
                </h3>
                <div className="overflow-x-auto rounded-lg border border-slate-800">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                      <tr>
                        <th className="p-2">Model Architecture</th>
                        <th className="p-2">ROC-AUC (Mean &plusmn; SD)</th>
                        <th className="p-2">PR-AUC</th>
                        <th className="p-2">Accuracy</th>
                        <th className="p-2">Brier Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                      <tr className="hover:bg-slate-800/40">
                        <td className="p-2 font-medium text-slate-400">Dummy (Prior Only)</td>
                        <td className="p-2 font-mono">0.5000</td>
                        <td className="p-2 font-mono">{currentTarget.baselines.dummy.pr_auc.mean.toFixed(4)}</td>
                        <td className="p-2 font-mono">{currentTarget.baselines.dummy.accuracy.mean.toFixed(4)}</td>
                        <td className="p-2 font-mono">{currentTarget.baselines.dummy.brier_score.mean.toFixed(4)}</td>
                      </tr>
                      <tr className="hover:bg-slate-800/40">
                        <td className="p-2 font-medium text-slate-300">Elastic-Net Logistic Reg</td>
                        <td className="p-2 font-mono">
                          {currentTarget.baselines.elasticnet.roc_auc.mean.toFixed(4)} &plusmn;
                          {currentTarget.baselines.elasticnet.roc_auc.std.toFixed(4)}
                        </td>
                        <td className="p-2 font-mono">{currentTarget.baselines.elasticnet.pr_auc.mean.toFixed(4)}</td>
                        <td className="p-2 font-mono">{currentTarget.baselines.elasticnet.accuracy.mean.toFixed(4)}</td>
                        <td className="p-2 font-mono">{currentTarget.baselines.elasticnet.brier_score.mean.toFixed(4)}</td>
                      </tr>
                      <tr className="hover:bg-slate-800/40">
                        <td className="p-2 font-medium text-slate-300">Random Forest (100 Trees)</td>
                        <td className="p-2 font-mono">
                          {currentTarget.baselines.random_forest.roc_auc.mean.toFixed(4)} &plusmn;
                          {currentTarget.baselines.random_forest.roc_auc.std.toFixed(4)}
                        </td>
                        <td className="p-2 font-mono">{currentTarget.baselines.random_forest.pr_auc.mean.toFixed(4)}</td>
                        <td className="p-2 font-mono">{currentTarget.baselines.random_forest.accuracy.mean.toFixed(4)}</td>
                        <td className="p-2 font-mono">{currentTarget.baselines.random_forest.brier_score.mean.toFixed(4)}</td>
                      </tr>
                      <tr className="bg-cyan-950/30 text-cyan-200 font-semibold">
                        <td className="p-2 text-white">Calibrated XGBoost (Production)</td>
                        <td className="p-2 font-mono text-cyan-300">
                          {currentTarget.xgb_calibrated.roc_auc.mean.toFixed(4)} &plusmn;
                          {currentTarget.xgb_calibrated.roc_auc.std.toFixed(4)}
                        </td>
                        <td className="p-2 font-mono">{currentTarget.xgb_calibrated.pr_auc.mean.toFixed(4)}</td>
                        <td className="p-2 font-mono">{currentTarget.xgb_calibrated.accuracy.mean.toFixed(4)}</td>
                        <td className="p-2 font-mono">{currentTarget.xgb_calibrated.brier_score.mean.toFixed(4)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {!loading && selectedTab === 'ablations' && metrics?.feature_ablations && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <h3 className="font-bold text-white text-sm">Feature Set Ablation & Modality Lift</h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Testing whether laboratory tests (14 biomarkers) or echocardiography (EF-TTE, Region RWMA, VHD)
                  can be safely omitted without sacrificing diagnostic discrimination across identical 15 folds.
                </p>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">Target</th>
                      <th className="p-2.5">Full Features (54)</th>
                      <th className="p-2.5">Without Lab (40)</th>
                      <th className="p-2.5">Without Echo (51)</th>
                      <th className="p-2.5">Primary Dependency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/60 font-mono">
                    {(['cad', 'lad', 'lcx', 'rca'] as const).map((t) => {
                      const ab = metrics.feature_ablations?.[t];
                      if (!ab) return null;
                      const primary =
                        t === 'lad'
                          ? 'Echo Critical (RWMA/EF-TTE)'
                          : t === 'lcx'
                          ? 'Lab Dependent (Lipids/CR)'
                          : t === 'cad'
                          ? 'Echo Critical'
                          : 'Diffuse / Subtle';

                      return (
                        <tr key={t} className="hover:bg-slate-800/40">
                          <td className="p-2.5 uppercase font-bold text-white font-sans">{t}</td>
                          <td className="p-2.5 text-cyan-300 font-bold">{ab.full_features.roc_auc_mean.toFixed(4)}</td>
                          <td className="p-2.5 text-slate-300">
                            {ab.without_lab.roc_auc_mean.toFixed(4)}
                            <span className="text-[10px] text-slate-500 block font-sans">
                              {ab.without_lab.roc_auc_mean >= ab.full_features.roc_auc_mean ? 'Preserved' : 'Reduced'}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-300">
                            {ab.without_echo.roc_auc_mean.toFixed(4)}
                            <span className="text-[10px] text-slate-500 block font-sans">
                              {ab.without_echo.roc_auc_mean < ab.full_features.roc_auc_mean ? 'Echo Lift' : 'Neutral'}
                            </span>
                          </td>
                          <td className="p-2.5 font-sans font-medium text-amber-300 text-[10px]">{primary}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-950/80 p-3.5 rounded-lg border border-slate-800 space-y-2 text-[11px] leading-relaxed">
                <div className="font-semibold text-slate-200">Clinical Takeaways from Ablations:</div>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li>
                    <strong className="text-slate-200">LAD Model:</strong> Dropping echocardiography causes ROC-AUC to fall from
                    0.8388 to 0.7946 (&Delta; -0.0442). Wall motion abnormalities (Region RWMA) in the anterior territory are vital.
                  </li>
                  <li>
                    <strong className="text-slate-200">LCX Model:</strong> Dropping laboratory biomarkers causes ROC-AUC to fall from
                    0.7574 to 0.7139 (&Delta; -0.0435). The circumflex territory relies more on systemic metabolic signals than localized echo changes.
                  </li>
                  <li>
                    <strong className="text-slate-200">CAD Overall:</strong> Dropping echo drops ROC-AUC to 0.8820, confirming multimodality imaging improves overall diagnostic certainty.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {!loading && selectedTab === 'protocol' && (
            <div className="space-y-3.5">
              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                <h3 className="font-bold text-white text-sm">Validation Protocol & Integrity Invariants</h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Enforced at every phase of development to prevent overoptimistic performance estimates.
                </p>
              </div>

              <div className="space-y-2.5 text-[11px]">
                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                  <div className="font-semibold text-slate-200">1. Demo Patient Isolation (Zero Contamination)</div>
                  <div className="text-slate-400 mt-1">
                    8 representative patients (2 Normal, 2 Single-Vessel, 2 Double-Vessel, 2 Triple-Vessel) were isolated
                    before model training. All cross-validation, hyperparameter searches, and Platt calibration runs
                    strictly on the N=295 development set.
                  </div>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                  <div className="font-semibold text-slate-200">2. Zero Target Leakage Invariant</div>
                  <div className="text-slate-400 mt-1">
                    LAD, LCX, RCA, and Cath are strictly banned from feature matrices for all targets. Enforced by 24
                    automated synthetic leakage mutation tests that fail if any target column variation appears in X.
                  </div>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                  <div className="font-semibold text-slate-200">3. Out-of-Fold Platt Scaling & TreeSHAP Conservation</div>
                  <div className="text-slate-400 mt-1">
                    Platt scaling (p = sigmoid(A &bull; margin + B)) is fitted exclusively on inner out-of-fold validation margins.
                    Scaling factor A maps native TreeSHAP log-odds directly into calibrated log-odds space, preserving exact
                    additive attribution parity.
                  </div>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                  <div className="font-semibold text-slate-200">4. Anatomical Hierarchy Constraint</div>
                  <div className="text-slate-400 mt-1">
                    In human coronary anatomy, significant stenosis in any branch implies coronary artery disease. The API
                    strictly enforces P(CAD) &ge; max(P(LAD), P(LCX), P(RCA)) on every prediction.
                  </div>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                  <div className="font-semibold text-slate-200">5. Lesion Location Non-Implication</div>
                  <div className="text-slate-400 mt-1">
                    The dataset contains vessel-level diagnosis without lesion coordinate maps. CardioVision colors whole
                    procedural vessels uniformly by predicted probability and explicitly refrains from drawing focal stenosis lesions.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 text-center text-[11px] text-slate-500">
          CardioVision &bull; Track A Multimodal Hackathon 2026 &bull; All reported metrics derived from out-of-fold test splits
        </div>
      </div>
    </div>
  );
};
