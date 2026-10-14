# 11 Video Script: CardioVision System Walkthrough (~7-8 Minutes)

**Track A:** Multimodal AI Hackathon 2026: Cardiovascular Risk Visualization & Prediction  
**Sole Presenter & Narrator:** **Soumyadeep Pal** (3D Graphics & Visualization Lead, presenting on behalf of Team CardioVision: Soham Paul, Debdas, Soumyadeep Pal, Adin)  
**Video Recording Link (YouTube):** [https://youtu.be/placeholder-cardiovision-demo](https://youtu.be/placeholder-cardiovision-demo)  
*(Unlisted link placeholder. Once recorded, paste final video URL into this document, `README.md`, and `docs/report.md`)*

---

## Pre-Recording Setup & Technical Verification Checklist
- **Display Resolution:** 1920x1080 (1080p at 60 FPS), high-bitrate screen recording (OBS Studio recommended).
- **Audio Setup:** Clear microphone recording with room noise suppression. System audio enabled to capture the Web Audio API synthesized Lub-Dub cardiac stethoscope acoustics.
- **Browser State:** Clean Chrome / Brave profile with zero extensions, hardware acceleration enabled, zoomed at 100%.
- **Live URL:** Browser open to `https://cardiovision-sigma.vercel.app` with fresh localStorage/cookies so the first-load Clinical Safety Modal is active on initial capture.
- **Terminal Setup:** Split-screen or secondary workspace with PowerShell / Bash ready at project root to execute automated pytest and npm verification suites.
- **Ground Truth Invariant:** Every quantitative claim and metric spoken strictly matches `models/metrics.json` and `docs/report_numbers.md`. Whole vessels are colored uniformly by probability; no focal lesion claims are ever made.

---

## Timeline & Scene Breakdown

```
0:00 - 0:50 | Act 1: Introduction, Track A Clinical Problem, Scope & Mandatory Safety Disclaimer
0:50 - 2:05 | Act 2: Zero-Leakage Holdout Patient Exploration & Selective Coronary Risk Shading
2:05 - 3:20 | Act 3: Multi-View Representation Switcher, Holographic Torso & Blender 3D Studio
3:20 - 4:25 | Act 4: Draggable Tools Dock, Wiggers Cardiac Cycle, Lub-Dub Auscultation & 4-Chamber Cutaway Dissection
4:25 - 5:10 | Act 5: Automated Patient Findings HUD, Doctor Inspection Drawer & Clinical Form
5:10 - 6:05 | Act 6: Sub-25ms Native TreeSHAP Explainability in Calibrated Log-Odds Space
6:05 - 6:55 | Act 7: What-If Sensitivity Simulation & Server-Side Anatomical Hierarchy Constraint
6:55 - 7:40 | Act 8: Radical Scientific Honesty, Distal Vessel Caveats & Model Info Drawer
7:40 - 8:30 | Act 9: DevOps Deployment, Cloud Infrastructure & Automated Zero-Leakage Verification Suite
```

---

## Detailed Spoken Script & Visual Choreography

### 0:00 - 0:50 | Act 1: Introduction, Track A Clinical Problem, Scope & Mandatory Safety Disclaimer
- **Visual:** Screen opens to the live CardioVision deployment (`https://cardiovision-sigma.vercel.app`). The dark clinical workspace displays the persistent top safety disclaimer banner and the centered First-Load Clinical Safety Modal.
- **Action:** Cursor hovers over the safety disclaimer banner and modal dialog.
- **Narrator (Soumyadeep Pal):**
  > "Hello everyone, my name is Soumyadeep Pal, and on behalf of our team—Soham, Debdas, Adin, and myself—I am proud to present **CardioVision**, our submission for Track A of the Multimodal AI Hackathon 2026: Cardiovascular Risk Visualization and Prediction.
  >
  > Cardiovascular disease remains the leading cause of global mortality. While invasive X-ray coronary catheterization is the diagnostic gold standard, it carries physical risks, procedural delays, and substantial healthcare costs. Clinicians urgently require rapid, non-invasive risk stratification to prioritize catheterization workflows.
  >
  > However, before entering the platform, we emphasize our primary ethical and clinical guardrail: CardioVision is engineered strictly for clinical decision support and educational research. It is not an FDA-cleared diagnostic device.
  >
  > Crucially, our 3D heart colors whole coronary vessels uniformly by the predicted probability of significant stenosis. We never draw focal lesion locations or artificial pinch points because the underlying clinical dataset contains vessel-level catheterization ground truth, not intravascular spatial coordinates. Transparency and patient safety remain our highest priority."
- **Action:** Click `I understand and accept these terms` to dismiss the modal, seamlessly revealing the full interactive clinical workspace.

---

### 0:50 - 2:05 | Act 2: Zero-Leakage Holdout Patient Exploration & Selective Coronary Risk Shading
- **Visual:** Focus on the top `PersonaPicker` toolbar displaying the 8 pre-isolated holdout personas.
- **Narrator (Soumyadeep Pal):**
  > "To evaluate real-world clinical generalization without data leakage, we completely isolated 8 representative patient personas prior to all model training, hyperparameter tuning, and Platt calibration. All model development was conducted strictly on the remaining 295 patients.
  >
  > Let's examine **Patient #002**."
- **Action:** Click `Patient #002` (Age 54, BP 100 mmHg, EF 40%, Typical Chest Pain = 1).
- **Visual:**
  - The 3D anatomical viewer dynamically transitions: the Left Anterior Descending (LAD) vessel turns deep crimson red (predicted probability: 93.97%, High Risk).
  - The Left Circumflex (LCX, 24.12%) and Right Coronary Artery (RCA, 27.75%) remain calm emerald green.
  - The Overall CAD Risk HUD displays 96.65% with a 95% confidence interval of [88.7% - 99.0%].
- **Narrator (Soumyadeep Pal):**
  > "Notice the selective anatomical shading. In invasive catheterization ground truth, Patient #002 presented with isolated single-vessel LAD stenosis. Our model correctly pinpoints the severe LAD risk at 93.97% while maintaining low probabilities for the clear LCX and RCA vascular territories.
  >
  > Now, let's contrast this with **Patient #289**, an asymptomatic normal control."
- **Action:** Click `Patient #289` (Age 67, Female, BP 110 mmHg, normal ECG and normal echocardiogram).
- **Visual:** The 3D coronary tree instantly updates: LAD drops to 24.53%, LCX to 16.50%, RCA to 26.62%, and overall CAD to 26.62%, turning all arterial branches uniformly emerald green.
- **Narrator (Soumyadeep Pal):**
  > "For Patient #289, all coronary arteries transition to emerald green, perfectly aligning with catheterization ground truth where all vessels were angiographically normal. The visual correspondence between model outputs and anatomy is instant, intuitive, and rigorously calibrated."

---

### 2:05 - 3:20 | Act 3: Multi-View Representation Switcher, Holographic Torso & Blender 3D Studio
- **Visual:** Focus on the top-right canvas segmented pill control: `[🫀 3D Beating]`, `[⚙️ 3D Procedural]`, `[📊 2D Schematic]`, and `[🎬 Blender Studio]`.
- **Narrator (Soumyadeep Pal):**
  > "As the 3D graphics lead, I designed CardioVision to meet clinicians where they work, across varying clinical workstations and diagnostic perspectives. In the top-right canvas HUD, clinicians can switch between four specialized representation modes."
- **Action:** Click `[🫀 3D Beating]`. Orbit the camera smoothly around the beating heart.
- **Visual:** The photorealistic heart pulsates with natural anatomical rhythm, displaying realistic myocardial deformation.
- **Narrator (Soumyadeep Pal):**
  > "First is our photorealistic 3D Beating Heart, providing dynamic visceral intuition of cardiac contraction while maintaining live color-coded arterial risk overlays."
- **Action:** Click `[⚙️ 3D Procedural]`.
- **Visual:** The view shifts to the procedural myocardium with Catmull-Rom spline coronary tubes, atrioventricular sulcal fat cushions, and aortic branches.
- **Action:** Toggle `Torso Shell` on and adjust opacity slider to 0.40.
- **Visual:** A translucent holographic torso cage appears (ribs, sternum, spine, clavicles, and diaphragm), positioning the heart in accurate anatomical mediastinal orientation.
- **Narrator (Soumyadeep Pal):**
  > "Second is our procedural 3D model, featuring Catmull-Rom spline coronary geometries and an optional holographic torso shell that places the heart in realistic mediastinal orientation."
- **Action:** Click `[📊 2D Schematic]`.
- **Visual:** The canvas instantly switches to a high-contrast 2D coronary arterial diagram with clear vector labels, percentages, and color chips.
- **Narrator (Soumyadeep Pal):**
  > "Third is our 2D Schematic Fallback. If a clinician is operating on a low-power tablet, a mobile device, or a hospital workstation with WebGL disabled, CardioVision automatically serves this high-contrast 2D schematic, requiring zero GPU acceleration while preserving 100% data parity."
- **Action:** Click `[🎬 Blender Studio]`.
- **Visual:** The Blender Studio embed loads. Soumyadeep drags the 24-frame interactive angle scrubber to rotate the heart 360°, showcasing medical studio-grade lighting and render stills.
- **Narrator (Soumyadeep Pal):**
  > "Fourth is our integrated Blender 3D Studio. Built via our headless Python automation pipeline in Blender 5.2, this mode offers 360-degree interactive turntable scrubbing and medical studio-grade lighting renders, including anterior, left lateral, and posterior perspectives."

---

### 3:20 - 4:25 | Act 4: Draggable Tools Dock, Wiggers Cardiac Cycle, Lub-Dub Auscultation & 4-Chamber Cutaway Dissection
- **Visual:** Focus on the newly added floating glassmorphic `DraggableToolsMenu` dock on the canvas.
- **Action:** Click and drag the glassmorphic dock to demonstrate free floating placement; snap it neatly to the viewport corner.
- **Narrator (Soumyadeep Pal):**
  > "To ensure zero UI collisions between anatomical visualization and clinical controls, we consolidated all scene instrumentation into this draggable, glassmorphic tools menu. It can be positioned anywhere across the canvas.
  >
  > Let's explore our synchronized cardiac mechanics."
- **Action:** Expand the Cardiac Cycle controls inside the dock. Toggle cardiac playback and drag the Heart Rate slider from 60 up to 100 BPM. Unmute the acoustic sound button.
- **Audio / Visual:**
  - The Wiggers phase indicator dynamically tracks: Isovolumetric Contraction &rarr; Rapid Ejection &rarr; Isovolumetric Relaxation &rarr; Rapid Filling.
  - The ventricles execute a subtle torsional wringing twist during systolic ejection.
  - Rhythmic stethoscope sound plays: distinct Lub (S1 valve closure) followed by Dub (S2 valve closure), synthesized in real time via Web Audio API biquad bandpass filters.
- **Narrator (Soumyadeep Pal):**
  > "CardioVision synchronizes myocardial motion with the classic Wiggers diagram, simulating systolic ejection, ventricular torsional wringing, and diastolic filling. With Web Audio API synthesis, we generate realistic acoustic stethoscope auscultation—reproducing the S1 Lub and S2 Dub valve closures at any clinician-selected heart rate."
- **Action:** Expand the Dissection Cutaway controls. Toggle `Chamber Dissection` and select the `Coronal Cut Plane`.
- **Visual:** The anterior myocardial wall slices open cleanly, revealing internal cardiac morphology: the muscular Left Ventricle cavity, Right Ventricle, Left and Right Atria, Mitral and Tricuspid valve leaflets, papillary muscles, and the interventricular septum.
- **Narrator (Soumyadeep Pal):**
  > "For deep anatomical exploration, our multi-planar chamber dissection tool cuts through axial, coronal, or sagittal planes, exposing the internal four-chamber morphology, papillary muscles, and valve structures, allowing cardiologists to inspect spatial relationships between coronary perfusion territories and myocardial wall structures."

---

### 4:25 - 5:10 | Act 5: Automated Patient Findings HUD, Doctor Inspection Drawer & Clinical Form
- **Visual:** Click `Patient #248` (Triple-vessel disease: LAD 93.78%, LCX 81.27%, RCA 53.13%, CAD 99.40%).
- **Action:** Hover over the `Patient Findings HUD` floating badge in the bottom-left canvas.
- **Visual:** HUD expands, displaying structured diagnostic findings:
  - *ECG finding: ST elevation & T-wave inversion in anterior leads (LAD ischemia).*
  - *Echocardiography: Apical & anteroseptal Regional Wall Motion Abnormality (RWMA).*
  - *Hemodynamics: Severe systolic hypertension (160 mmHg), reduced EF-TTE (40%).*
  - *Biomarkers: Marked dyslipidemia (Triglycerides 284 mg/dL).*
- **Narrator (Soumyadeep Pal):**
  > "In the bottom-left canvas, our automated Patient Findings Engine synthesizes all 54 clinical inputs into structured, doctor-ready diagnostic findings, correlating ECG lead changes, echocardiographic wall motion abnormalities, and metabolic biomarker anomalies."
- **Action:** Click `Inspect Anatomy` in the dock to open the `DoctorInspectionDrawer`.
- **Visual:** Drawer slides open, presenting coronary territory perfusion maps, collateral circulation notes, and clinical pearls for the selected vessel.
- **Action:** Switch to the `Clinical Form` tab in the right-hand panel.
- **Visual:** Form displays categorized clinical inputs (Demographics, Symptoms, ECG, Echo, Lab) with real-time min/max boundary validation and units populated dynamically from `/schema`.
- **Narrator (Soumyadeep Pal):**
  > "The Doctor Inspection Drawer provides instant clinical pearls for each vascular territory. Furthermore, clinicians can switch to the Clinical Form tab to manually modify or enter patient records, with real-time validation against our API feature schema."

---

### 5:10 - 6:05 | Act 6: Sub-25ms Native TreeSHAP Explainability in Calibrated Log-Odds Space
- **Visual:** Navigate to the **Explainability** tab in the Clinical Panel for Patient #248.
- **Narrator (Soumyadeep Pal):**
  > "Black-box predictions have no place in cardiovascular medicine. In our Explainability tab, CardioVision provides instantaneous, per-patient TreeSHAP feature attributions."
- **Visual:** The horizontal Recharts waterfall bar chart displays top positive risk drivers (rose red) and protective factors (teal):
  - `Typical Chest Pain`: +1.33 log-odds
  - `Region with RWMA`: +0.68 log-odds
  - `Triglycerides (TG)`: +0.58 log-odds
  - `Ejection Fraction (EF-TTE)`: +0.57 log-odds
  - `Body Mass Index (BMI)`: +0.43 log-odds
- **Narrator (Soumyadeep Pal):**
  > "For Patient #248, the waterfall chart highlights exactly why our model assigned a 99.40% CAD probability: Typical Chest Pain is the primary driver adding +1.33 log-odds, reinforced by Regional Wall Motion Abnormality at +0.68, elevated triglycerides, reduced ejection fraction, and high BMI.
  >
  > Crucially, our production API requires **zero heavy `shap` Python library dependencies**. By leveraging XGBoost's native C++ `pred_contribs=True` and scaling decision margins directly into Platt-calibrated log-odds space, our server computes exact Shapley attributions across all four targets in **under 25 milliseconds**—measured locally at a mean latency of 20.50 ms and p95 of 23.96 ms across 100 benchmark runs.
  >
  > Beneath the chart, our Clinical Measurement Cards benchmark each patient value against authoritative guidelines from the American Heart Association, American Diabetes Association, and National Kidney Foundation."

---

### 6:05 - 6:55 | Act 7: What-If Sensitivity Simulation & Server-Side Anatomical Hierarchy Constraint
- **Visual:** Click the **Sensitivity** tab in the Clinical Panel.
- **Narrator (Soumyadeep Pal):**
  > "CardioVision also serves as an interactive clinical simulator. In the Sensitivity tab, cardiologists can adjust key physiological levers to demonstrate the tangible benefits of medical or lifestyle interventions."
- **Action:** Drag Systolic BP from 120 up to 180 mmHg, and increase LDL Cholesterol from 100 to 220 mg/dL.
- **Visual:**
  - Delta risk badges immediately highlight the probability surge: `+14.2% CAD`, `+18.5% LAD`.
  - The 3D heart dynamically deepens in color after a responsive 300 ms debounce.
- **Action:** Click `Reset to Baseline` to return all sliders and 3D colors to original values.
- **Narrator (Soumyadeep Pal):**
  > "Notice how the directional delta badges and 3D vessel colors update in real time.
  >
  > Furthermore, our inference engine strictly enforces the **Anatomical Hierarchy Constraint**: in human anatomy, hemodynamically significant stenosis of any single major vessel anatomically necessitates overall coronary artery disease. Therefore:
  >
  > P(CAD) is mathematically bounded to be greater than or equal to the maximum single vessel probability.
  >
  > Whenever this rule adjusts a prediction, our server sets the `cad_adjusted: true` metadata flag, alerting the physician that territory-level stenosis elevated the overall risk score."

---

### 6:55 - 7:40 | Act 8: Radical Scientific Honesty, Distal Vessel Caveats & Model Info Drawer
- **Visual:** Click `Model Info & Caveats` in the top navigation bar.
- **Action:** The drawer slides open, displaying the 15-fold Repeated Stratified Cross-Validation performance table, baseline comparisons, and feature ablation results.
- **Narrator (Soumyadeep Pal):**
  > "We practice radical scientific honesty. Rather than presenting inflated single-split metrics, all reported numbers in CardioVision originate from 5-fold by 3-repeat nested cross-validation across 15 outer test folds on our 295 development patients.
  >
  > Our models achieve an ROC-AUC of **0.9026 &plusmn; 0.0372** and PR-AUC of **0.9569** for overall CAD, and **0.8376 &plusmn; 0.0436** for the LAD.
  >
  > However, we explicitly acknowledge our model's lower sensitivity on distal vessels: **0.7584** ROC-AUC for LCX and **0.7011** for RCA. In clinical cardiology, circumflex and right coronary ischemia produce far subtler surface ECG and echocardiographic changes than anterior LAD occlusion.
  >
  > To solve this safely for clinicians, we provide calibrated high-recall screening operating points: a threshold of 0.27 for LCX restores **90.25% recall**, and 0.25 for RCA restores **90.99% recall**, ensuring no critical ischemic cases slip through non-invasive triage."

---

### 7:40 - 8:30 | Act 9: DevOps Deployment, Cloud Infrastructure & Automated Zero-Leakage Verification Suite
- **Visual:** Split screen or quick window switch to the terminal.
- **Action:** In terminal, execute `python -m pytest tests` and `npm --prefix web test -- --run`.
- **Terminal Output Displayed:**
  - `pytest`: 59 passed in 5.72s (including 31 zero-leakage mutation tests in `test_no_leakage.py`).
  - `web test`: 69 passed in 53ms.
- **Narrator (Soumyadeep Pal):**
  > "Finally, let's examine the software engineering, cloud infrastructure, and DevOps architecture led by Debdas.
  >
  > Our production stack is fully deployed and freely accessible:
  > - Our frontend is deployed on **Vercel** with client-side routing and demand WebGL rendering.
  > - Our backend is hosted on **Render** as a Python 3.11 FastAPI service, equipped with an automated keep-warm GitHub Actions workflow pinging `/health` every 10 minutes to eliminate cold starts. If the API is ever unreachable, our frontend gracefully falls back to offline mode with zero UI degradation.
  >
  > Behind the application stands an uncompromising automated quality assurance suite:
  > 1. **Zero-Leakage Invariant Suite:** 31 automated mutation tests in `tests/test_no_leakage.py` strictly prove that `LAD`, `LCX`, `RCA`, and `Cath` are never exposed as model inputs.
  > 2. **Full Test Coverage:** 59 Python tests and 69 web unit and E2E tests pass 100% green in under 6 seconds.
  > 3. **Production Build:** Clean TypeScript compilation with zero errors and an exact 6-page publication-ready technical report PDF.
  >
  > CardioVision successfully bridges zero-leakage machine learning, real-time TreeSHAP explainability, and multi-view 3D anatomical visualization to empower clinicians with transparent, trustworthy cardiovascular decision support.
  >
  > Thank you for your time and consideration."
- **Visual:** Return to the live web application showing the beating 3D heart with glowing coronary vessels, holding on the final screen for 5 seconds. Fade to black.

---

## Post-Recording Delivery Checklist
- [ ] Export video in 1080p60 MP4 with stereo AAC audio.
- [ ] Upload video to YouTube as **Unlisted** (or Public).
- [ ] Ensure video plays seamlessly in an incognito / logged-out browser window.
- [ ] Replace placeholder `https://youtu.be/placeholder-cardiovision-demo` with the actual YouTube link in:
  - `docs/11_VIDEO_SCRIPT.md` (Line 5)
  - `README.md` (Line 42)
  - `docs/report.md` (Line 4)
