# 03 ML Spec

Targets: CAD, LAD, LCX, RCA (4 independent binary models).

## Models
1. Trivial baseline (majority / prior)
2. Elastic-net logistic regression (baseline)
3. Random forest
4. XGBoost (or LightGBM): likely serving model
Optional: clinical-features-only baseline (no lab/echo).

## Validation (24h-scoped)
- Repeated stratified 5-fold x3, fixed seed. Pipeline contains imputation/scaling/encoding.
- Small fixed hyperparameter grid, tuned inside the training folds only (no tuning on outer-test data).
- Report mean ± SD for: accuracy, precision, recall, F1, ROC-AUC, PR-AUC, Brier.
- Calibration: sigmoid calibration (not isotonic at n=303); calibration plot per target.
- Threshold: choose from CV; report both 0.5 and a high-recall operating point.
- Ablation (if time): with vs without lab, with vs without echo.

## Explainability
- Serving: XGBoost `pred_contribs=True` gives per-patient TreeSHAP; no `shap` import in the API.
- Offline: `shap` for global bar + beeswarm per target. Save top-N global importances in `shap_global.json`.
- Optional: bootstrap rank stability.

## Outputs (all in `models/`)
`cad.json lad.json lcx.json rca.json` (serialized models), `metrics.json`, `shap_global.json`, `reference_ranges.json` (source cited per range), `feature_schema.json`, `demo_patients.json` (8-10 patients incl. one low-risk, one high-risk, one mixed).

## Honesty rules
Report weak targets as weak. No cherry-picked splits. Every number in the report comes from `metrics.json`.
