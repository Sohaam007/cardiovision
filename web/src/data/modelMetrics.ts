export interface TargetMetricSummary {
  target: 'CAD' | 'LAD' | 'LCX' | 'RCA';
  name: string;
  prevalenceRate: number;
  rocAuc: { mean: number; std: number };
  prAuc: { mean: number; std: number };
  accuracy: { mean: number; std: number };
  precision: { mean: number; std: number };
  recall: { mean: number; std: number };
  f1: { mean: number; std: number };
  brierScore: { mean: number; std: number };
  notes?: string;
}

export const MODEL_METRICS_DATA: TargetMetricSummary[] = [
  {
    target: 'CAD',
    name: 'Coronary Artery Disease (Overall)',
    prevalenceRate: 0.7119,
    rocAuc: { mean: 0.9026, std: 0.0372 },
    prAuc: { mean: 0.9569, std: 0.0185 },
    accuracy: { mean: 0.8497, std: 0.0434 },
    precision: { mean: 0.8823, std: 0.0278 },
    recall: { mean: 0.9111, std: 0.0543 },
    f1: { mean: 0.8956, std: 0.0324 },
    brierScore: { mean: 0.1109, std: 0.0275 },
    notes: 'Primary diagnostic benchmark target; calibrated XGBoost booster demonstrates high discrimination (ROC-AUC 0.903).',
  },
  {
    target: 'LAD',
    name: 'Left Anterior Descending Artery',
    prevalenceRate: 0.5356,
    rocAuc: { mean: 0.8376, std: 0.0436 },
    prAuc: { mean: 0.8745, std: 0.0345 },
    accuracy: { mean: 0.7853, std: 0.0491 },
    precision: { mean: 0.7897, std: 0.0493 },
    recall: { mean: 0.8634, std: 0.0655 },
    f1: { mean: 0.8231, std: 0.0404 },
    brierScore: { mean: 0.1621, std: 0.0195 },
    notes: 'Well-separated by clinical predictors, ECG anterior changes, and regional wall motion abnormalities.',
  },
  {
    target: 'LCX',
    name: 'Left Circumflex Artery',
    prevalenceRate: 0.2881,
    rocAuc: { mean: 0.7584, std: 0.0456 },
    prAuc: { mean: 0.6453, std: 0.0760 },
    accuracy: { mean: 0.6983, std: 0.0241 },
    precision: { mean: 0.6583, std: 0.0703 },
    recall: { mean: 0.5169, std: 0.1050 },
    f1: { mean: 0.5693, std: 0.0532 },
    brierScore: { mean: 0.1976, std: 0.0142 },
    notes: 'Moderate discrimination; lower prevalence (28.8%) and ECG silence of the lateral wall yields reduced recall.',
  },
  {
    target: 'RCA',
    name: 'Right Coronary Artery',
    prevalenceRate: 0.3525,
    rocAuc: { mean: 0.7011, std: 0.0477 },
    prAuc: { mean: 0.6099, std: 0.0486 },
    accuracy: { mean: 0.6757, std: 0.0389 },
    precision: { mean: 0.6322, std: 0.1110 },
    recall: { mean: 0.3733, std: 0.1167 },
    f1: { mean: 0.4558, std: 0.0907 },
    brierScore: { mean: 0.2082, std: 0.0098 },
    notes: 'Challenging vessel target; inferior wall lead changes can be subtle. Interpreted with clinical caution.',
  },
];
