# 11 Video Script (Duration ~6 Minutes)

## 0:00 - 0:45 | Introduction, Problem Statement & Mandatory Safety Disclaimer
- **Visual:** Screen opens on CardioVision live deployment URL with the persistent safety disclaimer banner and the First-Load Clinical Safety Modal centered.
- **Narrator:**
  "Welcome to CardioVision, our submission for Track A: Multimodal Cardiac Risk Stratification and 3D Visualization.
  Coronary artery disease is a leading cause of global mortality. While invasive catheterization remains the diagnostic gold standard, clinicians urgently need reliable, non-invasive risk stratification to prioritize interventions.
  Before exploring the interface, we acknowledge our mandatory clinical guardrail: CardioVision is designed strictly for clinical decision support and educational research. It is not an FDA-cleared diagnostic device. Whole vessels are colored uniformly by estimated stenosis probability; we never imply localized lesion sites."
- **Action:** Click 'I understand' on the safety modal to enter the clinical workspace.

## 0:45 - 2:30 | Live Holdout Persona Exploration & Interactive 3D Anatomy
- **Visual:** Focus on the top PersonaPicker bar displaying the 8 pre-isolated holdout patients.
- **Narrator:**
  "To demonstrate model validity without data leakage, we completely isolated 8 representative patients prior to training. Let's click Patient #002."
- **Action:** Click `Patient #002 (Age 54, BP 100 mmHg, EF 40%, Typical Chest Pain=1)`.
- **Visual:**
  - 3D Heart immediately recolors: LAD turns deep crimson red (estimated probability: 93.97%, high risk), while LCX (24.12%) and RCA (27.75%) remain calm emerald green.
  - Overall CAD risk displays 96.65% [CI: 88.7% - 99.0%].
- **Narrator:**
  "Notice how the procedural 3D heart dynamically updates. Catheterization ground truth confirms Patient #002 has isolated single-vessel LAD disease. Our model accurately identifies the severe LAD risk while preserving low probabilities for LCX and RCA.
  Now let's click Patient #289, an asymptomatic normal control."
- **Action:** Click `Patient #289 (Age 45, Normal ECG, Normal Echo)`.
- **Visual:** 3D heart transforms to 100% emerald green across all three vessels (LAD 24.53%, LCX 16.50%, RCA 26.62%, CAD 26.62%).
- **Narrator:**
  "The 3D model shows complete normal vascular perfusion, agreeing perfectly with catheterization ground truth."

## 2:30 - 3:45 | Explainability via Native TreeSHAP in Calibrated Log-Odds Space
- **Visual:** Switch to Patient #248 (Triple-Vessel Severe Stenosis: LAD 93.78%, LCX 81.27%, RCA 53.13%, CAD 99.40%). Navigate to the Explainability tab in the Clinical Panel.
- **Narrator:**
  "A black-box prediction is unacceptable in high-stakes cardiology. In our Explainability tab, CardioVision provides instant, per-patient TreeSHAP contributions computed directly in calibrated log-odds space.
  For Patient #248, we see that Typical Chest Pain (+0.84), severely reduced Ejection Fraction (+0.43), Regional Wall Motion Abnormality (+0.18), and Age (+0.33) are the primary positive drivers pushing overall CAD risk to 99.4%.
  Crucially, our serving engine requires zero heavy `shap` library dependencies in production, executing native C++ TreeSHAP in under 11 milliseconds."

## 3:45 - 4:30 | Exploratory Sensitivity Levers & Anatomical Constraint
- **Visual:** Click the 'Sensitivity' tab.
- **Narrator:**
  "In the Sensitivity tab, clinicians can explore what-if scenarios by modulating key physiological levers."
- **Action:** Drag Systolic BP from 120 up to 180 mmHg, and increase LDL Cholesterol from 100 to 220 mg/dL.
- **Visual:** Calibrated risk dials adjust in real time; vessel probabilities elevate smoothly.
- **Narrator:**
  "Notice that our server enforces anatomical consistency: P(CAD) is constrained to never fall below the maximum single vessel probability, with the `cad_adjusted` indicator flagged whenever this hierarchy is actively enforced."

## 4:30 - 5:30 | Rigorous ML Methodology, Zero-Leakage & Baseline Benchmarking
- **Visual:** Display terminal running `pytest -v` and present the baseline comparison table from `docs/10_REPORT_OUTLINE.md`.
- **Narrator:**
  "Behind the user interface is a rigorous data science pipeline:
  1. Automated zero-leakage pytest suite: verifies that LAD, LCX, RCA, and Cath are strictly barred from input features across all models.
  2. Nested 5-fold by 3-repeat cross-validation (15 test folds) evaluated on N=295 patients.
  3. Calibrated XGBoost achieves 0.9026 ROC-AUC and 0.9569 PR-AUC on CAD, and 0.8376 ROC-AUC on LAD.
  4. In the spirit of scientific transparency, we honestly report weaker performance on difficult distal vessels: LCX at 0.7584 and RCA at 0.7011."

## 5:30 - 6:00 | 3D Viewport Controls, Limitations & Summary
- **Visual:** Show camera presets ('Anterior', 'Lateral', 'Posterior'), toggle Okabe-Ito colorblind palette, adjust heart muscle opacity slider.
- **Narrator:**
  "The 3D canvas includes anatomical camera presets, including a posterior view to inspect the circumflex artery, and an Okabe-Ito colorblind mode for clinical accessibility.
  CardioVision combines rigorous zero-leakage machine learning, exact TreeSHAP interpretability, and interactive 3D coronary anatomy to deliver actionable cardiovascular decision support. Thank you."
