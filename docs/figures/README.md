# Figures and Visual Assets

This directory contains verified figures and visual exports from CardioVision's ML training pipeline and interactive 3D frontend.

## 3D Anatomical & UI Screenshots (Task 3D-02)

| File | Description | Invariant & Perspective |
| --- | --- | --- |
| `3d_anterior.png` | Frontal perspective view | Anterior interventricular groove and LAD course; OrbitControls HUD |
| `3d_posterior_lcx.png` | Posterior perspective view | Left circumflex (LCX) winding along left atrioventricular groove to posterior crux |
| `3d_vessel_selected.png` | Vessel selected focus view | Selected vessel details card active; smooth camera tween to LAD; synchronized TreeSHAP chart |
| `3d_sensitivity_changed.png` | Model sensitivity exploration | Live parameter perturbation (BP adjusted); calibrated log-odds recalculated; disclaimer note visible |

## ML Diagnostic Plots

| File | Metric / Curve | Target |
| --- | --- | --- |
| `roc_curves.png` | Receiver Operating Characteristic (ROC) | CAD, LAD, LCX, RCA (outer folds) |
| `pr_curves.png` | Precision-Recall (PR) Curves | CAD, LAD, LCX, RCA (outer folds) |
| `calibration_cad.png` | Platt Calibration Curve | CAD (out-of-fold calibration) |
| `calibration_lad.png` | Platt Calibration Curve | LAD (out-of-fold calibration) |
| `calibration_lcx.png` | Platt Calibration Curve | LCX (out-of-fold calibration) |
| `calibration_rca.png` | Platt Calibration Curve | RCA (out-of-fold calibration) |
| `shap_summary_cad.png` | TreeSHAP Global Feature Importance | CAD decision margins |

## Dashboard UI Screenshots (Task UI-02)

| File | Description | Components Captured |
| --- | --- | --- |
| `dashboard_overview.png` | Full clinical dashboard overview | PersonaPicker (8 holdout patients), Overall CAD card with CI, 3 vessel cards, 3D viewport with FloatingRiskLegend, and Recharts horizontal bar chart |
| `dashboard_whatif_sensitivity.png` | Model sensitivity exploration panel | Dynamic parameter sliders (BP, FBS, LDL, TG, smoker), baseline delta badges with directional arrows, and non-treatment disclaimer |
| `dashboard_model_info.png` | Model Info drawer slide-over | Cross-validation metrics table (mean +/- SD), Platt calibration methodology, clinical limitations, dataset citations, and mesh licenses |

