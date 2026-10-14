# 11 Video Script: CardioVision System Walkthrough (~5-6 Minutes)

**Video Recording Link (YouTube):** [https://youtu.be/placeholder-cardiovision-demo](https://youtu.be/placeholder-cardiovision-demo)  
*(Unlisted link placeholder. Once recorded, paste final video URL into this document, `README.md`, and `docs/report.md`)*

---

## 0:00 - 0:45 | Introduction, Clinical Scope & Mandatory Safety Disclaimer
- **Visual:** Browser opens to the live CardioVision deployment (`https://cardiovision-sigma.vercel.app`). The interface opens with the persistent clinical disclaimer banner and the First-Load Clinical Safety Modal centered.
- **Narrator:**
  "Welcome to CardioVision, our submission for Track A: Multimodal Cardiovascular Risk Visualization and Prediction.
  Coronary artery disease is the leading cause of global mortality. While invasive catheterization remains the definitive diagnostic gold standard, clinicians urgently need reliable, non-invasive risk stratification to prioritize diagnostic and procedural workflows.
  Before interacting with the platform, we emphasize our core safety guardrail: CardioVision is designed strictly for clinical decision support and educational research. It is not an FDA-cleared diagnostic device. Crucially, the 3D heart colors whole coronary vessels uniformly by the predicted probability of significant stenosis; we never imply localized lesion sites or focal plaque geometry because the underlying clinical dataset contains only vessel-level ground truth."
- **Action:** Click 'I understand and accept these terms' to dismiss the modal and enter the clinical workspace.

## 0:45 - 2:20 | Pre-Isolated Holdout Persona Exploration & Interactive 3D Anatomy
- **Visual:** Focus on the top `PersonaPicker` toolbar displaying the 8 pre-isolated holdout personas.
- **Narrator:**
  "To demonstrate clinical validity without data leakage, we completely isolated 8 representative patients prior to model development, hyperparameter selection, and calibration. Let's select Patient #002."
- **Action:** Click `Patient #002` (Age 54, BP 100 mmHg, EF 40%, Typical Chest Pain=1).
- **Visual:**
  - The interactive 3D coronary tree instantly updates: the Left Anterior Descending (LAD) vessel turns deep crimson red (predicted probability of significant stenosis: 93.97%, high risk), while the LCX (24.12%) and RCA (27.75%) remain calm emerald green.
  - The CAD Risk HUD displays an overall probability of 96.65% [95% CI: 88.7% - 99.0%].
- **Narrator:**
  "Notice how the 3D heart dynamically reflects vessel-level risk. Invasive catheterization ground truth confirms Patient #002 has isolated single-vessel LAD stenosis. Our model identifies the severe LAD risk while preserving low probabilities for the unaffected LCX and RCA branches.
  Now let's switch to Patient #289, an asymptomatic normal control."
- **Action:** Click `Patient #289` (Age 67, Female, BP 110 mmHg, Normal Echo, Normal ECG).
- **Visual:** The 3D heart transitions entirely to emerald green across all three vascular territories (LAD 24.53%, LCX 16.50%, RCA 26.62%, CAD 26.62%).
- **Narrator:**
  "The 3D model shows uniform normal perfusion probabilities across all branches, agreeing with catheterization ground truth where all arteries were clear."

## 2:20 - 3:35 | Explainability via Native TreeSHAP in Calibrated Log-Odds Space
- **Visual:** Click `Patient #248` (Triple-vessel disease: LAD 93.78%, LCX 81.27%, RCA 53.13%, CAD 99.40%). Navigate to the **Explainability** tab in the right-hand Clinical Panel.
- **Narrator:**
  "Black-box predictions are unacceptable in cardiovascular medicine. In our Explainability tab, CardioVision generates instantaneous, per-patient TreeSHAP contributions computed directly in calibrated log-odds space.
  For Patient #248, the horizontal waterfall chart highlights the primary positive risk drivers: Typical Chest Pain (+1.33 log-odds), Regional Wall Motion Abnormality (+0.68), Elevated Triglycerides (+0.58), reduced Ejection Fraction (+0.57), and elevated BMI (+0.43).
  Crucially, our production API requires zero heavy `shap` Python library dependencies, executing native C++ TreeSHAP algorithms via XGBoost `pred_contribs=True` in under 10 milliseconds, delivering total multi-vessel inference with calibration in ~20 milliseconds (empirically measured locally: mean 20.50 ms, p95 23.96 ms across 100 benchmark iterations)."

## 3:35 - 4:20 | Sensitivity Exploration, Levers & Anatomical Hierarchy Constraint
- **Visual:** Click the **Sensitivity** tab in the Clinical Panel.
- **Narrator:**
  "In the Sensitivity tab, clinicians can run what-if simulations by modulating key physiological levers to assess how hypothetical lifestyle or clinical interventions alter risk trajectories."
- **Action:** Drag Systolic BP from 120 up to 180 mmHg, and increase LDL Cholesterol from 100 to 220 mg/dL.
- **Visual:** Delta risk badges indicate relative probability changes (+14% CAD, +18% LAD); the 3D model re-shades seamlessly following a 300ms debounce. Click 'Reset to Baseline' to restore original values.
- **Narrator:**
  "Notice that our inference engine strictly enforces the anatomical hierarchy constraint: P(CAD) is mathematically bounded to be greater than or equal to the maximum single vessel probability (P(CAD) >= max(P(LAD), P(LCX), P(RCA))). The `cad_adjusted` metadata flag alerts the clinician whenever this hierarchy is actively enforced."

## 4:20 - 5:10 | 3D Viewport Controls & Model Info Caveats
- **Visual:** In the 3D viewport, click the anatomical camera presets: 'Anterior', 'Left Lateral (LCX)', and 'Posterior (RCA/Circumflex)'. Adjust heart muscle opacity slider down to 0.35 to emphasize the coronary vessel tree. Toggle the Okabe-Ito colorblind palette.
- **Narrator:**
  "The 3D canvas includes anatomical camera presets, including a dedicated posterior view to inspect the circumflex artery and posterior descending branch, as well as an Okabe-Ito colorblind-accessible color palette.
  Next, let's open the Model Info & Caveats drawer in the top navigation bar."
- **Action:** Click 'Model Info & Caveats' in the header.
- **Visual:** Drawer slides open showing cross-validated ROC-AUC and PR-AUC metrics, feature ablation table, and the honest clinical notes for each vascular territory.
- **Narrator:**
  "We practice radical scientific honesty: our models achieve 0.9026 ROC-AUC and 0.9569 PR-AUC on CAD, and 0.8376 ROC-AUC on LAD. However, we explicitly highlight our model's lower sensitivity on distal vessels: LCX at 0.7584 and RCA at 0.7011 ROC-AUC, explaining that non-invasive surface ECG and echocardiography capture anterior wall ischemia far more reliably than inferior or circumflex ischemia. We provide calibrated screening thresholds (0.27 for LCX, 0.25 for RCA) that restore 90% recall for clinical rule-out workflows."

## 5:10 - 6:00 | Automated Verification Suite & Conclusion
- **Visual:** Split screen showing the terminal running `pytest -v` with 53 tests passing, including zero-leakage tests in `tests/test_no_leakage.py`.
- **Narrator:**
  "Underneath the application is a rigorous engineering framework:
  1. Automated zero-leakage pytest suite guarding against target column leakage.
  2. Nested 5-fold by 3-repeat cross-validation across 15 outer test folds.
  3. Production web bundle built with strict TypeScript and WebGL demand-rendering.
  CardioVision bridges rigorous zero-leakage machine learning, real-time TreeSHAP explainability, and interactive 3D coronary visualization to provide actionable, trustworthy cardiovascular decision support. Thank you."
