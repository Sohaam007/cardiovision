# 10 Report Outline (Max 6 Pages, PDF)

## Section 1: Problem Definition, Clinical Dataset & Safety Disclaimers (0.75 Page)
- Clinical motivation: Early, non-invasive risk stratification of Coronary Artery Disease (CAD) and individual vessel-level stenosis (LAD, LCX, RCA) using standard routine clinical and diagnostic features.
- Dataset provenance: UCI Z-Alizadeh Sani Extension Dataset (ID 411), single-center registry of 303 consecutive patients undergoing catheterization with 59 clinical variables.
- Target derivation: CAD derived strictly from Cath (216 CAD, 87 Normal). Vessel stenosis ground truths derived from LAD (157 stenotic), LCX (101 stenotic), and RCA (114 stenotic).
- Clinical discordance observation: Row index 93 (Cath=Normal, LAD=Stenotic) retained unaltered without ground truth manipulation to preserve epidemiological integrity.
- Mandatory Safety Disclaimer: Persistent decision support and research use only; not a diagnostic medical device; whole-vessel probability coloring without lesion localization.

## Section 2: Rigorous Preprocessing & Zero-Leakage Guardrails (0.75 Page)
- Feature matrix: Dropped zero-variance constant column `Exertional CP` (100% 'N'). Cleaned 54 clinical input features across demographic, vital, ECG, echocardiographic, and laboratory domains.
- Categorical encodings: Binary Y/N mapped to 1/0; Sex mapped to 1 (Male) / 0 (Female); ordinal mapping for `BBB` (0=N, 1=LBBB, 2=RBBB), `VHD` (0=N, 1=mild, 2=Moderate, 3=Severe), `Function Class` (0-3), and `Region RWMA` (0-4).
- Holdout partition: 8 stratified representative patients (2 normal, 2 single-vessel, 2 double-vessel, 2 triple-vessel) completely isolated prior to training (N=295 for development).
- Zero-leakage invariant: Pytest enforcement (`tests/test_no_leakage.py`) guarantees that Cath, CAD, LAD, LCX, RCA are strictly excluded from feature inputs across all targets.

## Section 3: Machine Learning Methodology, Nested CV & Calibration (1.0 Page)
- Validation protocol: RepeatedStratifiedKFold (5 splits x 3 repeats = 15 test folds, random seed 42) with inner 3-fold CV for hyperparameter selection on outer training folds.
- Hyperparameter grid: XGBoost tuned over max_depth in {2, 3}, n_estimators in {100, 200}, learning_rate in {0.05, 0.10}, subsample=0.8, colsample_bytree=0.8, min_child_weight=3, scale_pos_weight.
- Platt calibration: Nested cross-fitted LogisticRegression(C=1e6) on decision margins yields calibrated probabilities p = sigmoid(A * margin + B).
- Anatomical consistency constraint: Server-side enforcement of P(CAD) >= max(P(LAD), P(LCX), P(RCA)) with transparency flag `meta.cad_adjusted`.

## Section 4: Comprehensive Empirical Results & Baseline Comparison (1.25 Pages)
All figures derived strictly from `models/metrics.json` across 15 test folds:

| Target | Model | ROC-AUC (Mean +/- SD) | 95% Confidence Interval | PR-AUC | Accuracy | Recall | Precision | F1-Score | Brier Score | ECE |
|---|---|---|---|---|---|---|---|---|---|---|
| CAD | XGBoost (Calibrated) | 0.9026 +/- 0.0372 | [0.8838, 0.9215] | 0.9569 | 0.8497 | 0.9111 | 0.8823 | 0.8956 | 0.1109 | 0.0940 |
| CAD | Random Forest | 0.9149 +/- 0.0305 | [0.8995, 0.9304] | 0.9642 | 0.8384 | 0.8984 | 0.8784 | 0.8880 | 0.1189 | - |
| CAD | Elastic-Net LR | 0.9087 +/- 0.0337 | [0.8916, 0.9257] | 0.9620 | 0.8463 | 0.9095 | 0.8797 | 0.8943 | 0.1166 | - |
| CAD | Dummy (Prior) | 0.5000 +/- 0.0000 | [0.5000, 0.5000] | 0.7119 | 0.7119 | 1.0000 | 0.7119 | 0.8317 | 0.2052 | - |
| LAD | XGBoost (Calibrated) | 0.8376 +/- 0.0436 | [0.8155, 0.8597] | 0.8745 | 0.7718 | 0.7473 | 0.8033 | 0.7718 | 0.1582 | 0.1452 |
| LAD | Random Forest | 0.8565 +/- 0.0422 | [0.8352, 0.8779] | 0.8931 | 0.7819 | 0.7756 | 0.7989 | 0.7858 | 0.1528 | - |
| LAD | Elastic-Net LR | 0.8070 +/- 0.0465 | [0.7834, 0.8305] | 0.8550 | 0.7480 | 0.7626 | 0.7523 | 0.7554 | 0.1742 | - |
| LCX | XGBoost (Calibrated) | 0.7584 +/- 0.0456 | [0.7353, 0.7814] | 0.6453 | 0.6983 | 0.6769 | 0.5471 | 0.6015 | 0.1804 | 0.1102 |
| LCX | Random Forest | 0.7549 +/- 0.0489 | [0.7301, 0.7796] | 0.6475 | 0.7028 | 0.5238 | 0.5694 | 0.5369 | 0.1873 | - |
| LCX | Elastic-Net LR | 0.6824 +/- 0.0637 | [0.6501, 0.7147] | 0.5630 | 0.6542 | 0.5476 | 0.4795 | 0.5029 | 0.2084 | - |
| RCA | XGBoost (Calibrated) | 0.7011 +/- 0.0477 | [0.6769, 0.7252] | 0.6099 | 0.6791 | 0.5105 | 0.5824 | 0.5376 | 0.2081 | 0.1070 |
| RCA | Random Forest | 0.7207 +/- 0.0463 | [0.6973, 0.7441] | 0.6030 | 0.6949 | 0.4444 | 0.6469 | 0.5173 | 0.1979 | - |
| RCA | Elastic-Net LR | 0.7278 +/- 0.0452 | [0.7049, 0.7507] | 0.6133 | 0.6768 | 0.5646 | 0.5843 | 0.5670 | 0.2036 | - |

- Honest evaluation of weak targets: While CAD (ROC-AUC 0.9026) and LAD (ROC-AUC 0.8376) exhibit strong discriminative performance, LCX (0.7584) and RCA (0.7011) reflect clinical difficulty in non-invasive stenosis detection, reported transparently without cherry-picked splits.
- High-recall screening thresholds: CAD (0.56, recall 0.9111), LAD (0.35, recall 0.9085), LCX (0.23, recall 0.9082), RCA (0.25, recall 0.9099).

## Section 5: Local & Global Explainability (0.75 Page)
- Native TreeSHAP via XGBoost `pred_contribs=True` scaled by Platt parameter A.
- Global feature rankings from `models/shap_global.json`:
  * CAD Top Drivers: Typical Chest Pain (0.8407), EF-TTE (0.4284), Age (0.3340), Region RWMA (0.1772), Tinversion (0.1402).
  * LAD Top Drivers: Typical Chest Pain (0.4187), Region RWMA (0.2818), EF-TTE (0.2789), Age (0.2505), Current Smoker (0.1652).
  * LCX Top Drivers: Typical Chest Pain (0.3298), Age (0.2831), CR (0.2458), EF-TTE (0.2078), TG (0.1764).
  * RCA Top Drivers: DM (0.2762), Typical Chest Pain (0.2312), Age (0.2039), EF-TTE (0.1925), HTN (0.1658).
- Logit conservation: Sum of feature contributions plus calibrated bias matches decision margin within 1e-4.

## Section 6: Interactive 3D Anatomy & Clinical Dashboard Architecture (1.0 Page)
- 3D Scene: React Three Fiber + Drei procedural coronary vessel tubes mapped to anatomically accurate trajectories.
- Risk-based color shading: Green (< 40%), Yellow/Amber (40-70%), Red (>= 70%) with Okabe-Ito colorblind alternative.
- Whole-vessel invariant: Shading applies uniformly across vessel segments; no deceptive lesion localization.
- Performance optimization: Demand frameloop (renders only on user interaction or state change), DPR capped at 1.5, sub-15ms live inference latency.

## Section 7: Software Engineering, Limitations & Clinical Translation (0.75 Page)
- Deployment: Vercel frontend + Render backend with automated fallback to precomputed holdout personas.
- Key limitations: Single-center Iranian patient cohort (303 patients); lack of external geographic validation; absence of intravascular ultrasound (IVUS) or fractional flow reserve (FFR) ground truth.
- Future work: External multi-ethnic cohort validation, federated learning, and prospective validation.
