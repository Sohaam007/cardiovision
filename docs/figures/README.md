# Figures and Visual Assets

This directory contains verified figures, diagnostic curves, explainability summaries, and 3D application screenshots generated from CardioVision's cross-validated machine learning pipeline and interactive 3D web platform.

## Summary Table

| Figure | Artifact Name | Description & Interpretation |
|---|---|---|
| ROC Curves across Targets | `roc_curves.png` | Out-of-fold Receiver Operating Characteristic curves across all 4 targets (CAD, LAD, LCX, RCA). Shows strong overall CAD discrimination (AUC 0.9026) and LAD discrimination (AUC 0.8376), with moderate signal for LCX (AUC 0.7584) and RCA (AUC 0.7011). |
| Precision-Recall Curves | `pr_curves.png` | PR curves accounting for class prevalence (CAD: 71.2%, LAD: 58.0%, LCX: 39.3%, RCA: 37.6%). CAD achieves PR-AUC 0.9569; LAD achieves PR-AUC 0.8745; LCX achieves PR-AUC 0.6453; RCA achieves PR-AUC 0.6099. |
| Platt Calibration (CAD) | `calibration_cad.png` | Reliability diagram comparing uncalibrated XGBoost probabilities vs. Platt-calibrated probabilities. Platt scaling reduces Expected Calibration Error (ECE) to 0.0940 and Brier score to 0.1109. |
| Platt Calibration (LAD) | `calibration_lad.png` | Calibration diagram for LAD showing alignment of predicted margins to observed empirical stenosis rates. ECE is 0.1452; Brier score is 0.1621. |
| Platt Calibration (LCX) | `calibration_lcx.png` | Calibration curve for LCX. Platt scaling aligns decision margins along the sigmoid slope, maintaining ECE at 0.1102. |
| Platt Calibration (RCA) | `calibration_rca.png` | Calibration curve for RCA. Corrects extreme probability overconfidence, reducing ECE to 0.1070. |
| Global TreeSHAP Bar (CAD) | `shap_summary_cad.png` | Top 15 features ranked by mean absolute calibrated log-odds contribution for CAD. Typical Chest Pain, EF-TTE, and Age represent the top 3 global drivers. |
| TreeSHAP Beeswarm (CAD) | `shap_beeswarm_cad.png` | Beeswarm scatter plot across all N=295 development patients. Points are colored by feature value (red = high, blue = low). Shows that high Typical Chest Pain and low EF-TTE sharply increase log-odds of CAD. |
| Multi-Target TreeSHAP Comparison | `shap_summary_all_targets.png` | 4-panel comparison of top 10 features across CAD, LAD, LCX, and RCA. Highlights that LAD is driven by regional wall motion (Region RWMA) and EF-TTE, whereas LCX is driven by metabolic markers (lipids, creatinine). |
| 3D Frontal Perspective | `3d_anterior.png` | Frontal anatomical view displaying the anterior interventricular groove, left anterior descending artery (LAD), and OrbitControls HUD overlays. |
| 3D Posterior Perspective | `3d_posterior_lcx.png` | Left lateral / posterior view highlighting the left circumflex artery (LCX) coursing around the coronary sulcus to the posterior crux. |
| 3D Vessel Selection | `3d_vessel_selected.png` | Camera focus tween on selected vessel with synchronized TreeSHAP local explainability bar chart and measurement cards. |
| 3D Sensitivity Exploration | `3d_sensitivity_changed.png` | Interactive parameter perturbation (e.g. blood pressure slider) showing recolored vessel tubes and probability change badges. |

---

## Dashboard UI Screenshots (Task UI-02)

| File | Description | Components Captured |
| --- | --- | --- |
| `dashboard_overview.png` | Full clinical dashboard overview | PersonaPicker (8 holdout patients), Overall CAD card with CI, 3 vessel cards, 3D viewport with FloatingRiskLegend, and Recharts horizontal bar chart |
| `dashboard_whatif_sensitivity.png` | Model sensitivity exploration panel | Dynamic parameter sliders (BP, FBS, LDL, TG, smoker), baseline delta badges with directional arrows, and non-treatment disclaimer |
| `dashboard_model_info.png` | Model Info drawer slide-over | Cross-validation metrics table (mean +/- SD), Platt calibration methodology, clinical limitations, dataset citations, and mesh licenses |

---

## Detailed Visual Interpretation

### 1. Multi-Target Discrimination: `roc_curves.png` and `pr_curves.png`
- **What it shows:** 5-fold x 3-repeat (15 outer test folds) out-of-fold predictions evaluated strictly against ground truth catheterization data.
- **Interpretation:**
  - **Overall CAD (AUC 0.9026):** Clinical, ECG, echo, and lab features combine synergistically to reliably identify patients with significant coronary stenosis.
  - **LAD Territory (AUC 0.8376):** Anterior territory disease exhibits robust non-invasive manifestation due to frequent anterior lead ECG abnormalities and apical/anterior wall motion reduction on echocardiography.
  - **LCX (AUC 0.7584) and RCA (AUC 0.7011):** Circumflex and right coronary artery disease produce subtler surface ECG changes and less prominent regional dysfunction in non-invasive 12-lead testing. Operating at default 0.50 threshold yields lower sensitivity, justifying calibrated screening thresholds (0.27 for LCX, 0.25 for RCA) for clinical triage.

### 2. Calibration & Reliability Diagrams: `calibration_*.png`
- **What it shows:** Empirical frequency of true positive stenosis plotted against 10 predicted probability bins for both raw and Platt-calibrated models.
- **Interpretation:**
  - Raw tree boosting outputs often exhibit compressed probabilities near extremes or overconfidence due to gradient boosting loss minimization.
  - Cross-fitted Platt scaling ($p = \text{sigmoid}(A \cdot \text{margin} + B)$) strictly fitted on inner out-of-fold validation margins corrects this distortion without peeking at outer test folds.
  - Calibrated curves hug the 45-degree diagonal ("perfect calibration"), ensuring output probabilities represent reliable empirical event rates suitable for clinical risk communication.

### 3. TreeSHAP Feature Attributions: `shap_summary_cad.png` and `shap_beeswarm_cad.png`
- **What it shows:** Exact game-theoretic feature attributions calculated natively by XGBoost (`pred_contribs=True`) in calibrated log-odds space.
- **Interpretation:**
  - **Typical Chest Pain:** Positive typical chest pain exerts the largest single risk-increasing push on log-odds ($+0.65$ to $+1.10$).
  - **Ejection Fraction (EF-TTE):** Preserved ejection fraction ($>55\%$) is protective; depressed EF ($<45\%$) sharply elevates risk.
  - **Age & Biomarkers:** Increasing age, hypertension, diabetes mellitus, and elevated LDL systematically push patients toward higher CAD likelihood.
  - **Log-Odds Additivity:** $\sum \text{SHAP}_i + \text{bias} = \text{calibrated logit}$, guaranteeing exact local and global interpretability without ungrounded approximations.

### 4. Modality Lift & Multi-Target Specificity: `shap_summary_all_targets.png`
- **What it shows:** Differential importance ranking across the three coronary branches.
- **Interpretation:**
  - LAD is distinctively driven by `Region RWMA` (regional wall motion abnormalities) and `EF-TTE`, reflecting the substantial left ventricular myocardial mass supplied by the anterior descending artery.
  - LCX disease exhibits higher reliance on systemic metabolic risk factors (`CR`, `Age`, `LDL`) due to less distinct anatomical lead coverage on standard 12-lead resting ECG.
