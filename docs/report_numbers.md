# CardioVision Verified Report Numbers

This document contains the single source of truth for all quantitative claims, metrics, and comparisons in CardioVision documentation, report, and presentations. Every number is extracted directly from `models/metrics.json`.

## 1. Dataset & Cross-Validation Metadata
- **Total dataset rows:** 303
- **Development cohort (N):** 295
- **Demo holdout isolated (N):** 8
- **Holdout patient indices:** [2, 3, 52, 142, 248, 250, 289, 294]
- **Validation protocol:** RepeatedStratifiedKFold(n_splits=5, n_repeats=3, random_state=42)
- **Total cross-validation folds:** 15
- **Evaluation principle:** Every reported number comes from cross-validation out-of-fold test folds

## 2. Multi-Target Prevalence in Development Cohort (N=295)
- **CAD:** 210 positive, 85 negative (prevalence rate: 71.19%)
- **LAD:** 171 positive, 124 negative (prevalence rate: 57.97%)
- **LCX:** 116 positive, 179 negative (prevalence rate: 39.32%)
- **RCA:** 111 positive, 184 negative (prevalence rate: 37.63%)

## 3. Production Model Performance (Calibrated XGBoost)

| Target | ROC-AUC (Mean +/- SD) | 95% CI | PR-AUC | Accuracy | Precision | Recall | F1-Score | Brier Score | ECE |
|---|---|---|---|---|---|---|---|---|---|
| CAD | 0.9026 +/- 0.0372 | [0.8838, 0.9215] | 0.9569 | 0.8497 | 0.8823 | 0.9111 | 0.8956 | 0.1109 | 0.0940 |
| LAD | 0.8376 +/- 0.0436 | [0.8155, 0.8597] | 0.8745 | 0.7853 | 0.7897 | 0.8634 | 0.8231 | 0.1621 | 0.1452 |
| LCX | 0.7584 +/- 0.0456 | [0.7353, 0.7814] | 0.6453 | 0.6983 | 0.6583 | 0.5169 | 0.5693 | 0.1976 | 0.1102 |
| RCA | 0.7011 +/- 0.0477 | [0.6769, 0.7252] | 0.6099 | 0.6757 | 0.6322 | 0.3733 | 0.4558 | 0.2082 | 0.1070 |

## 4. Operating Points: Default vs Screening (High-Recall)

| Target | Operating Point | Threshold | Recall | Precision | Accuracy |
|---|---|---|---|---|---|
| CAD | Default | 0.50 | 91.1% | 88.2% | 85.0% |
| CAD | Screening (High Recall) | 0.56 | 90.2% | 88.9% | 85.0% |
| LAD | Default | 0.50 | 86.3% | 79.0% | 78.5% |
| LAD | Screening (High Recall) | 0.43 | 90.2% | 77.0% | 78.5% |
| LCX | Default | 0.50 | 51.7% | 65.8% | 69.8% |
| LCX | Screening (High Recall) | 0.27 | 90.2% | 49.4% | 59.4% |
| RCA | Default | 0.50 | 37.3% | 63.2% | 67.6% |
| RCA | Screening (High Recall) | 0.25 | 90.7% | 44.7% | 53.8% |

## 5. Baseline Comparison (ROC-AUC Across Identical 15 Folds)

| Target | Prior / Dummy | Elastic-Net Logistic Reg | Random Forest (100 Trees) | Calibrated XGBoost |
|---|---|---|---|---|
| CAD | 0.5000 | 0.9087 +/- 0.0433 | 0.9149 +/- 0.0354 | 0.9026 +/- 0.0372 |
| LAD | 0.5000 | 0.8070 +/- 0.0410 | 0.8565 +/- 0.0379 | 0.8376 +/- 0.0436 |
| LCX | 0.5000 | 0.6824 +/- 0.0698 | 0.7549 +/- 0.0439 | 0.7584 +/- 0.0456 |
| RCA | 0.5000 | 0.7278 +/- 0.0517 | 0.7207 +/- 0.0377 | 0.7011 +/- 0.0477 |

## 6. Feature Set Ablation (Modality Lift Analysis)

| Target | Full Features (54) | Without Lab (40) | Without Echo (51) | Key Clinical Dependency |
|---|---|---|---|---|
| CAD | 0.9068 +/- 0.0367 | 0.9251 +/- 0.0321 | 0.8820 +/- 0.0464 | Echo Critical (RWMA, EF) |
| LAD | 0.8388 +/- 0.0409 | 0.8408 +/- 0.0424 | 0.7946 +/- 0.0494 | Echo Critical (RWMA, EF) |
| LCX | 0.7574 +/- 0.0526 | 0.7139 +/- 0.0607 | 0.7640 +/- 0.0522 | Lab Dependent (Lipids, CR) |
| RCA | 0.7057 +/- 0.0393 | 0.7072 +/- 0.0437 | 0.7178 +/- 0.0365 | Diffuse / Subtle Signal |

## 7. Anatomical Hierarchy Constraint: P(CAD) >= max(vessel probs)
- **Adjustments triggered across 15 folds:** 307 / 885
- **Percentage of predictions adjusted:** 34.69%
- **Raw CAD Brier score:** 0.1109
- **Constrained CAD Brier score:** 0.1682

## 8. Honest Vessel Notes
- **CAD:** Strong predictive discrimination (ROC-AUC 0.9026 +/- 0.0372, PR-AUC 0.9569). Calibrated decision margins align well with invasive catheterization ground truth.
- **LAD:** Robust predictive utility (ROC-AUC 0.8376 +/- 0.0436, PR-AUC 0.8745). Driven predominantly by Typical Chest Pain, Region RWMA, and EF-TTE.
- **LCX:** Moderate discrimination (ROC-AUC 0.7584 +/- 0.0456, PR-AUC 0.6453). Circumflex territory (lateral left ventricular wall) produces subtler surface ECG and non-invasive echocardiographic manifestations than anterior LAD. Default 0.50 threshold yields 51.69% recall; screening threshold 0.27 achieves 90.25% recall.
- **RCA:** Weaker standalone performance (ROC-AUC 0.7011 +/- 0.0477, PR-AUC 0.6099). Inferior wall and right ventricular ischemia show limited representation in non-invasive 54-feature tabular data. Default 0.50 threshold exhibits low sensitivity (37.33%); calibrated screening threshold of 0.25 is recommended for rule-out triage (90.99% recall, 43.57% precision).
