# 03 ML Spec

Targets: CAD, LAD, LCX, RCA (4 independent binary models).

## Models & Architectures
1. Baseline 1: Dummy (prior-only)
2. Baseline 2: Elastic-net logistic regression (StandardScaler + saga solver, L1 ratio 0.5)
3. Baseline 3: Random Forest (100 trees, max_depth 4)
4. Production Serving Model: Calibrated XGBoost with Platt Scaling and native TreeSHAP

## Validation Protocol (Repeated Stratified CV)
- Protocol: RepeatedStratifiedKFold (5 splits x 3 repeats = 15 test folds, random_state=42).
- Development sample: N=295 rows (8 holdout patients isolated prior to all training and CV).
- Features: 54 clinical, ECG, echocardiographic, and laboratory features strictly matching `models/feature_names.json`.
- Zero-leakage rule: Cath, CAD, LAD, LCX, and RCA are strictly excluded from model features for all targets.
- Hyperparameter tuning: Inner 3-fold CV on outer-training folds only (zero test fold peeking).
- Calibration: Nested cross-fitted Platt scaling LogisticRegression(C=1e6) on out-of-fold decision margins:
  Formula: p = sigmoid(A * margin + B).

## Empirical Cross-Validation Results (models/metrics.json)

### CAD Model
- Prevalence: 71.19% (210 positive, 85 negative)
- Best Hyperparameters: max_depth=3, n_estimators=100, learning_rate=0.10, scale_pos_weight=0.4048
- Platt Calibration: A=0.9696, B=0.5646
- ROC-AUC: 0.9026 +/- 0.0372 (95% CI: [0.8838, 0.9215])
- PR-AUC: 0.9569 +/- 0.0185 (95% CI: [0.9476, 0.9663])
- Accuracy: 0.8497 +/- 0.0434 (95% CI: [0.8278, 0.8717])
- Precision: 0.8823 +/- 0.0278 (95% CI: [0.8683, 0.8964])
- Recall: 0.9111 +/- 0.0543 (95% CI: [0.8836, 0.9386])
- F1-Score: 0.8956 +/- 0.0324 (95% CI: [0.8793, 0.9120])
- Brier Score: 0.1109 +/- 0.0275 (95% CI: [0.0970, 0.1248])
- Expected Calibration Error (ECE): 0.0940 +/- 0.0360 (95% CI: [0.0758, 0.1122])
- Operating Points:
  * Default Threshold (0.50): Recall 0.9111, Precision 0.8823, Accuracy 0.8497
  * Screening High-Recall Threshold (0.56): Recall 0.9111, Precision 0.8823

### LAD Model
- Prevalence: 51.86% (153 positive, 142 negative)
- Best Hyperparameters: max_depth=2, n_estimators=100, learning_rate=0.05, scale_pos_weight=0.9281
- Platt Calibration: A=1.1366, B=0.2350
- ROC-AUC: 0.8376 +/- 0.0436 (95% CI: [0.8155, 0.8597])
- PR-AUC: 0.8745 +/- 0.0355 (95% CI: [0.8566, 0.8924])
- Accuracy: 0.7718 +/- 0.0487 (95% CI: [0.7471, 0.7964])
- Precision: 0.8033 +/- 0.0504 (95% CI: [0.7778, 0.8288])
- Recall: 0.7473 +/- 0.0772 (95% CI: [0.7082, 0.7864])
- F1-Score: 0.7718 +/- 0.0543 (95% CI: [0.7443, 0.7993])
- Brier Score: 0.1582 +/- 0.0264 (95% CI: [0.1449, 0.1716])
- Expected Calibration Error (ECE): 0.1452 +/- 0.0390 (95% CI: [0.1255, 0.1650])
- Screening Threshold (0.35): Recall 0.9085, Precision 0.6975

### LCX Model
- Prevalence: 33.22% (98 positive, 197 negative)
- Best Hyperparameters: max_depth=2, n_estimators=100, learning_rate=0.05, scale_pos_weight=2.0102
- Platt Calibration: A=1.0358, B=-0.3246
- ROC-AUC: 0.7584 +/- 0.0456 (95% CI: [0.7353, 0.7814])
- PR-AUC: 0.6453 +/- 0.0631 (95% CI: [0.6134, 0.6772])
- Accuracy: 0.6983 +/- 0.0478 (95% CI: [0.6741, 0.7225])
- Precision: 0.5471 +/- 0.0617 (95% CI: [0.5159, 0.5783])
- Recall: 0.6769 +/- 0.0963 (95% CI: [0.6282, 0.7256])
- F1-Score: 0.6015 +/- 0.0620 (95% CI: [0.5701, 0.6329])
- Brier Score: 0.1804 +/- 0.0210 (95% CI: [0.1698, 0.1910])
- Expected Calibration Error (ECE): 0.1102 +/- 0.0343 (95% CI: [0.0929, 0.1276])
- Screening Threshold (0.23): Recall 0.9082, Precision 0.4429

### RCA Model
- Prevalence: 37.63% (111 positive, 184 negative)
- Best Hyperparameters: max_depth=3, n_estimators=200, learning_rate=0.05, scale_pos_weight=1.6577
- Platt Calibration: A=0.5742, B=-0.3497
- ROC-AUC: 0.7011 +/- 0.0477 (95% CI: [0.6769, 0.7252])
- PR-AUC: 0.6099 +/- 0.0566 (95% CI: [0.5813, 0.6385])
- Accuracy: 0.6791 +/- 0.0449 (95% CI: [0.6564, 0.7018])
- Precision: 0.5824 +/- 0.0645 (95% CI: [0.5498, 0.6150])
- Recall: 0.5105 +/- 0.0970 (95% CI: [0.4614, 0.5596])
- F1-Score: 0.5376 +/- 0.0673 (95% CI: [0.5035, 0.5717])
- Brier Score: 0.2081 +/- 0.0162 (95% CI: [0.1999, 0.2163])
- Expected Calibration Error (ECE): 0.1070 +/- 0.0298 (95% CI: [0.0919, 0.1221])
- Screening Threshold (0.25): Recall 0.9099, Precision 0.4357

### Baseline Comparisons (ROC-AUC on Same Splits)
| Target | Prior / Dummy | Elastic-Net LR | Random Forest | XGBoost (Calibrated) |
|---|---|---|---|---|
| CAD | 0.5000 | 0.9087 +/- 0.0337 | 0.9149 +/- 0.0305 | 0.9026 +/- 0.0372 |
| LAD | 0.5000 | 0.8070 +/- 0.0465 | 0.8565 +/- 0.0422 | 0.8376 +/- 0.0436 |
| LCX | 0.5000 | 0.6824 +/- 0.0637 | 0.7549 +/- 0.0489 | 0.7584 +/- 0.0456 |
| RCA | 0.5000 | 0.7278 +/- 0.0452 | 0.7207 +/- 0.0463 | 0.7011 +/- 0.0477 |

## Target Hierarchy Constraint
In clinical anatomy, stenosis of any major coronary vessel implies coronary artery disease. Therefore:
P(CAD) >= max(P(LAD), P(LCX), P(RCA))
Enforced server-side during live inference and indicated via `meta.cad_adjusted = true`.

## Explainability (TreeSHAP in Production)
- XGBoost `pred_contribs=True` computes exact TreeSHAP values natively in C++.
- Zero production dependency on the heavy `shap` library (sub-15ms live latency).
- Calibrated log-odds space: feature contributions scaled by Platt parameter A sum exactly with calibrated base bias to the calibrated decision margin.
