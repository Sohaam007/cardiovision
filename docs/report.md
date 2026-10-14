# CardioVision: Multimodal 3D Cardiovascular Risk Visualization & Prediction
**Track A Technical Report | Multimodal AI Hackathon 2026**  
**Authors:** Soham, Debdas, Soumyadeep, Adin  
**Live Application:** [https://cardiovision-sigma.vercel.app](https://cardiovision-sigma.vercel.app) | **Live API:** [https://cardiovision-vwkj.onrender.com](https://cardiovision-vwkj.onrender.com) | **Repository:** [https://github.com/Sohaam007/cardiovision](https://github.com/Sohaam007/cardiovision) | **Video Demo:** [https://youtu.be/placeholder-cardiovision-demo](https://youtu.be/placeholder-cardiovision-demo)

---

## Executive Summary & Clinical Safety Notice

> **MANDATORY CLINICAL SAFETY NOTICE**  
> **For decision support and educational research only. Not a medical device. Not a substitute for formal diagnostic imaging or clinical judgment.**  
> This tool estimates the likelihood of coronary artery disease and vessel-level stenosis from a small research dataset (303 consecutive patients, single center). Predictions can be wrong. The 3D colors show model-estimated probability for each whole vessel; they do not show where a blockage is. Do not use this tool for diagnosis or treatment decisions. Always rely on qualified clinicians and formal diagnostic imaging.

CardioVision addresses early, non-invasive risk stratification of Coronary Artery Disease (CAD) and vessel-specific stenosis in the Left Anterior Descending (LAD), Left Circumflex (LCX), and Right Coronary Artery (RCA). Utilizing 54 multimodal features across demographic, vital, symptom, 12-lead ECG, echocardiographic, and laboratory domains, the platform pairs calibrated gradient boosting with real-time 3D anatomical visualization, native C++ TreeSHAP explainability in calibrated log-odds space, and interactive sensitivity exploration.

---

## 1. Problem Definition & Clinical Dataset Provenance

### 1.1 Clinical Motivation
Coronary artery disease remains the leading cause of adult mortality globally. While invasive X-ray coronary angiography (catheterization) provides the definitive diagnostic gold standard, it carries procedural risks, procedural costs, and access barriers. Developing an accurate, explainable, and calibrated risk-scoring system from routine, non-invasive multimodal evaluations enables early clinical triage, assisting clinicians in prioritizing confirmatory catheterization while reducing unnecessary invasive procedures.

### 1.2 Dataset Provenance & Target Derivation
CardioVision is developed on the **Extension of Z-Alizadeh Sani Dataset** (UCI Machine Learning Repository, Dataset ID 411), comprising 303 consecutive patients presenting with suspected coronary disease at the Shahid Rajaei Cardiovascular Medical and Research Center. Unlike UCI Dataset ID 412 (the original 54-feature dataset with only overall CAD), Dataset ID 411 includes all 59 variables, detailing catheterization results for each major coronary artery branch:
- **CAD Target:** Derived strictly from `Cath` (216 CAD cases, 87 Normal cases; 71.19% prevalence in the N=295 development cohort).
- **LAD Target:** 171 stenotic cases (57.97% prevalence).
- **LCX Target:** 116 stenotic cases (39.32% prevalence).
- **RCA Target:** 111 stenotic cases (37.63% prevalence).

### 1.3 Epidemiological Integrity & Row 93 Preservation
During exploratory cross-tabulation, a unique clinical discordance was identified at row index 93: a 65-year-old male with atypical chest pain and EF-TTE 45% documented with catheterization summary `Normal`, yet annotated with stenotic `LAD` (LCX and RCA `Normal`). In clinical adjudication, intermediate segmental narrowing (~50%) may be categorized as non-obstructive by an angiographic panel, or represents a clerical recording discordance. Ground truth for all 303 patients was preserved unaltered without manual tampering, ensuring transparent epidemiological integrity.

---

## 2. Rigorous Preprocessing & Zero-Leakage Guardrails

### 2.1 Feature Hygiene & Cohort Partitioning
1. **Constant Feature Removal:** The column `Exertional CP` exhibited zero variance (100% 'N') across all 303 records and was dropped.
2. **Feature Matrix Formulation:** 54 clinical input variables were extracted, normalized, and categorized into 5 clinical groups: Demographic (5), History/Physical Exam (25), 12-lead ECG (7), Echocardiography (3), and Laboratory Biomarkers (14).
3. **Demo Holdout Isolation:** To guarantee completely unbiased end-to-end testing, 8 stratified representative patient personas (2 normal, 2 single-vessel LAD, 2 double-vessel, 2 triple-vessel; indices: [2, 3, 52, 142, 248, 250, 289, 294]) were completely isolated *prior* to all model training, hyperparameter search, and calibration. All model development was executed strictly on the remaining $N=295$ patients.

### 2.2 Automated Zero-Leakage Invariants
A core failure mode in medical machine learning is data leakage—specifically using downstream diagnostic targets or proxy vessel stenosis markers as inputs. CardioVision enforces zero-leakage programmatically via 24 automated mutation tests (`tests/test_no_leakage.py`). Any appearance of `Cath`, `CAD`, `LAD`, `LCX`, or `RCA` (case-insensitive, whitespace-padded, or mutated) in input feature schemas immediately causes test failure.

---

## 3. Machine Learning Methodology, Nested CV & Calibration

### 3.1 Repeated Stratified Cross-Validation
Model performance was evaluated using **RepeatedStratifiedKFold (5 splits x 3 repeats = 15 outer test folds, random seed 42)** on the $N=295$ development cohort. All reported metrics represent out-of-fold test set evaluations:
- **Inner Tuning:** For each outer fold, an inner 3-fold stratified cross-validation on the training partition selected optimal XGBoost tree depth ($d \in \{2, 3\}$), number of estimators ($n \in \{100, 200\}$), and learning rate ($\eta \in \{0.05, 0.10\}$) with zero peeking at the outer test fold.

### 3.2 Out-of-Fold Platt Scaling & Logit Preservation
Raw tree-boosting ensembles minimize log-loss but frequently yield uncalibrated margins near extreme decision boundaries. CardioVision incorporates cross-fitted Platt scaling ($p = \text{sigmoid}(A \cdot \text{margin} + B)$):
- Logistic regression ($C=10^6$) was fitted exclusively on out-of-fold decision margins generated across inner training folds.
- Calibrating margins via scalar parameter $A$ directly scales native TreeSHAP feature attributions into calibrated log-odds space, preserving additive game-theoretic explanations:
$$\text{Calibrated Logit} = A \cdot \left(\sum_{j=1}^{54} \phi_j + \text{bias}_{\text{raw}}\right) + B = \sum_{j=1}^{54} (A \cdot \phi_j) + (A \cdot \text{bias}_{\text{raw}} + B)$$

### 3.3 Server-Side Target Hierarchy Constraint
In coronary pathophysiology, hemodynamically significant stenosis of any major epicardial coronary artery anatomically implies coronary artery disease. Therefore:
$$P(\text{CAD}) \ge \max\left(P(\text{LAD}), P(\text{LCX}), P(\text{RCA})\right)$$
The FastAPI backend strictly enforces this hierarchical bound server-side. When enforced, the response metadata flags `cad_adjusted: true`. Across 15 test folds (885 test predictions), this constraint triggered on 34.69% of cases, adjusting borderline overall CAD probabilities upward when territory-specific vessel models exhibited high focal confidence.

---

## 4. Empirical Evaluation & Baseline Architecture Comparison

All quantitative metrics reported below are extracted directly from `models/metrics.json` and verified in `docs/report_numbers.md`:

### 4.1 Production Model Performance (Calibrated XGBoost across 15 Outer Folds)

| Target Artery | Prevalence | ROC-AUC (Mean &plusmn; SD) | 95% Confidence Interval | PR-AUC | Accuracy | Precision | Recall | F1-Score | Brier Score | ECE |
|---|---|---|---|---|---|---|---|---|---|---|
| **CAD (Overall)** | 71.19% | **0.9026 &plusmn; 0.0372** | [0.8838, 0.9215] | 0.9569 | 84.97% | 88.23% | 91.11% | 0.8956 | 0.1109 | 0.0940 |
| **LAD Artery** | 57.97% | **0.8376 &plusmn; 0.0436** | [0.8155, 0.8597] | 0.8745 | 78.53% | 78.97% | 86.34% | 0.8231 | 0.1621 | 0.1452 |
| **LCX Artery** | 39.32% | **0.7584 &plusmn; 0.0456** | [0.7353, 0.7814] | 0.6453 | 69.83% | 65.83% | 51.69% | 0.5693 | 0.1976 | 0.1102 |
| **RCA Artery** | 37.63% | **0.7011 &plusmn; 0.0477** | [0.6769, 0.7252] | 0.6099 | 67.57% | 63.22% | 37.33% | 0.4558 | 0.2082 | 0.1070 |

### 4.2 Baseline Comparison across Identical 15 Folds (ROC-AUC)

| Target Artery | Prior / Dummy | Elastic-Net Logistic Reg | Random Forest (100 Trees) | Calibrated XGBoost (Production) |
|---|---|---|---|---|
| **CAD** | 0.5000 | 0.9087 &plusmn; 0.0433 | 0.9149 &plusmn; 0.0354 | **0.9026 &plusmn; 0.0372** |
| **LAD** | 0.5000 | 0.8070 &plusmn; 0.0410 | 0.8565 &plusmn; 0.0379 | **0.8376 &plusmn; 0.0436** |
| **LCX** | 0.5000 | 0.6824 &plusmn; 0.0698 | 0.7549 &plusmn; 0.0439 | **0.7584 &plusmn; 0.0456** |
| **RCA** | 0.5000 | 0.7278 &plusmn; 0.0517 | 0.7207 &plusmn; 0.0377 | **0.7011 &plusmn; 0.0477** |

### 4.3 Honest Assessment of Weak Distal Vessels (LCX & RCA)
While CAD (ROC-AUC 0.9026) and LAD (ROC-AUC 0.8376) exhibit strong discriminative performance, LCX (0.7584) and RCA (0.7011) demonstrate weaker standalone predictive power. In clinical cardiology, circumflex and right coronary artery territories frequently produce subtle or electrically silent surface ECG manifestations on standard 12-lead testing compared to extensive anterior wall ischemia. CardioVision explicitly reports this limitation in the user interface Model Info drawer and incorporates calibrated screening thresholds:
- **CAD Screening:** Threshold 0.56 yields 90.16% recall, 88.89% precision.
- **LAD Screening:** Threshold 0.43 yields 90.20% recall, 77.01% precision.
- **LCX Screening:** Threshold 0.27 yields 90.25% recall, 49.35% precision.
- **RCA Screening:** Threshold 0.25 yields 90.72% recall, 44.71% precision.

### 4.4 Feature-Set Ablation (Modality Lift Analysis)
Ablation across the 15 folds confirms multimodal synergy:
- **Excluding Echocardiography (51 features):** Drops LAD ROC-AUC from 0.8388 to 0.7946 (&Delta; -0.0442) and CAD ROC-AUC from 0.9068 to 0.8820 (&Delta; -0.0248), verifying that apical/anterior wall motion abnormalities (`Region RWMA`) and ejection fraction (`EF-TTE`) are indispensable for anterior territory assessment.
- **Excluding Laboratory Biomarkers (40 features):** Drops LCX ROC-AUC from 0.7574 to 0.7139 (&Delta; -0.0435), demonstrating that the circumflex artery relies disproportionately on systemic metabolic and renal biomarkers (`CR`, `TG`, `LDL`).

---

## 5. Local & Global Explainability via Native TreeSHAP

### 5.1 Native TreeSHAP Implementation
In high-stakes cardiovascular care, opaque predictions are clinically unacceptable. CardioVision implements native C++ TreeSHAP via XGBoost's `pred_contribs=True`, entirely bypassing the heavy Python `shap` library in production. This architecture computes exact Shapley values in **under 25 ms** (measured mean 20.50 ms, median 19.99 ms across 100 runs).

### 5.2 Global Feature Rankings
Aggregated across all $N=295$ patients in `models/shap_global.json`:
1. **CAD Overall:** `Typical Chest Pain` (mean |SHAP| 0.8407), `EF-TTE` (0.4284), `Age` (0.3340), `Region RWMA` (0.1772), `Tinversion` (0.1402).
2. **LAD Artery:** `Typical Chest Pain` (0.4187), `Region RWMA` (0.2818), `EF-TTE` (0.2789), `Age` (0.2505), `Current Smoker` (0.1652).
3. **LCX Artery:** `Typical Chest Pain` (0.3298), `Age` (0.2831), `CR` (0.2458), `EF-TTE` (0.2078), `TG` (0.1764).
4. **RCA Artery:** `DM` (0.2762), `Typical Chest Pain` (0.2312), `Age` (0.2039), `EF-TTE` (0.1925), `HTN` (0.1658).

### 5.3 Calibrated Log-Odds Explanation Space
Local explanations in the frontend represent calibrated log-odds impact: positive bars (rose) indicate risk-elevating contributions; negative bars (teal) indicate protective contributions. Clinicians are explicitly alerted that feature contributions operate in log-odds space and sum linearly to the calibrated decision margin.

---

## 6. Interactive 3D Anatomy & Clinical Dashboard Architecture

### 6.1 Procedural 3D Coronary Anatomy & Invariants
The 3D heart viewer is constructed using React Three Fiber (R3F) and Three.js:
- **Procedural Vessels:** Catmull-Rom spline tubes represent the left main stem, LAD, LCX, and RCA along anatomical cardiac sulci.
- **Zero Lesion Location Invariant:** The dataset contains territory stenosis without intravascular spatial coordinates. CardioVision colors whole procedural vessel tubes uniformly by predicted probability ($p < 0.40$ emerald green, $0.40 \le p < 0.70$ amber/yellow, $p \ge 0.70$ crimson red) and strictly refrains from drawing focal stenosis markers.
- **Demand Frameloop Rendering:** The Three.js canvas renders exclusively on demand (interaction or state change), idling at 0 FPS to preserve mobile battery and laptop thermals.
- **Anatomical Presets:** Camera quick-selects smoothly tween to Anterior (LAD view), Left Lateral (LCX groove view), and Posterior (crux cordis RCA view).

### 6.2 2D High-Contrast WebGL Fallback Mode
For resource-constrained devices, legacy clinical workstations, or WebGL-disabled environments, CardioVision automatically switches to a high-contrast 2D anatomical schematic. The schematic renders identical risk colors and numeric badges without requiring GPU acceleration.

### 6.3 Clinical Dashboard Features
- **Holdout Persona Picker:** Allows instantaneous inspection of the 8 pre-isolated test personas.
- **What-If Sensitivity Exploration:** Interactive sliders for Blood Pressure, Fasting Blood Sugar, LDL, and Smoking Status with 300 ms debounce, directional delta badges, and instant 3D recoloring.
- **Clinical Measurement Cards:** Correlates patient values against authoritative guidelines (AHA, ADA, NKF, ASE).

---

## 7. Software Engineering, Limitations & Clinical Translation

### 7.1 Deployment & Continuous Integration
- **Frontend:** Hosted on Vercel (`web/`, Vite bundle, client-side rewrites via `vercel.json`).
- **Backend:** Hosted on Render (`Python 3.11`, `uvicorn api.main:app --host 0.0.0.0 --port $PORT`).
- **CI Pipeline:** GitHub Actions workflow executing `pytest` (53 tests), TypeScript strict check (`tsc --noEmit`), and Vite bundle build on every pull request.
- **Keep-Warm Monitor:** Scheduled ping (`.github/workflows/warmup.yml`) mitigates cold starts during evaluation.

### 7.2 Study Limitations
1. **Single-Center Cohort:** The Z-Alizadeh Sani dataset represents 303 consecutive patients from a single tertiary cardiovascular center in Tehran. Performance may vary across diverse demographic and genetic cohorts.
2. **Angiographic Visual Grading:** Catheterization labels reflect visual diameter stenosis (&ge;50%) rather than physiological fractional flow reserve (FFR) or intravascular ultrasound (IVUS).
3. **Tabular Feature Bounds:** Advanced imaging modalities (CT coronary angiography, myocardial perfusion scintigraphy) were not available in this tabular cohort.

### 7.3 Conclusion
CardioVision demonstrates that rigorous machine learning, strict zero-leakage protocols, out-of-fold calibration, and native TreeSHAP explainability can be seamlessly synthesized with interactive 3D coronary anatomy, delivering an actionable, transparent decision-support tool for cardiovascular triage.
