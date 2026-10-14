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

### 2:05 - 3:20 | Act 3: Dual Photorealistic Heart, Multi-View Switcher & Anatomical Ribcage
- **Visual:** Focus on the top-center glassmorphic segmented pill: `[🫀 Blender Photorealistic]`, `[⚙️ Procedural Anatomy]`, `[🔬 2D Angiogram]`, `[🎬 Blender Studio]`, and `[⚡ 3D Sensitivity]`.
- **Narrator (Soumyadeep Pal):**
  > "As the 3D graphics lead, I designed CardioVision to meet clinicians where they work, across varying clinical workstations and diagnostic perspectives. In the top-center canvas HUD, clinicians can seamlessly switch between representations with zero-latency 250ms cross-fading."
- **Action:** Click `[🫀 Blender Photorealistic]`. Orbit the camera smoothly around the complete anatomical heart.
- **Visual:** The whole heart model (`realistic_human_heart.glb`) pulsates with rich ruby-crimson myocardial tones, sulcal adipose cushions, and dark systemic venous anatomy, surrounded by the three major coronary branches glowing with calibrated risk colors.
- **Narrator (Soumyadeep Pal):**
  > "First is our photorealistic complete heart, presenting intact epicardial anatomy, physiological wringing motion, and selective coronary risk shading.
  >
  > When a clinician needs to inspect internal chambers, clicking 'Cut Open Heart' smoothly reveals the interior cutaway section (`beating_heart.glb`) with an identical ruby-crimson myocardial color palette, exposing the ventricular cavities, interventricular septum, and atrioventricular valves."
- **Action:** Toggle `Torso Shell` in the dock.
- **Visual:** The dark smokey obsidian thoracic silhouette appears with an anatomical rib cage encasing the mediastinum and heart, tracing realistic intercostal vascular branches without intrusive slicing discs.
- **Narrator (Soumyadeep Pal):**
  > "Our anatomical torso mode encases the mediastinal heart within an accurate human rib cage, giving clinicians true spatial orientation within the thoracic cavity."
- **Action:** Click `[🔬 2D Angiogram]`.
- **Visual:** The canvas instantly switches to a high-contrast 2D coronary arterial diagram with clear vector labels, percentages, and color chips.
- **Narrator (Soumyadeep Pal):**
  > "For low-power hospital terminals or mobile tablets where WebGL is restricted, our 2D Angiogram mode provides an instantaneous SVG schematic with complete clinical data parity."
- **Action:** Click `[🎬 Blender Studio]`.
- **Visual:** The Blender Studio embed loads with 360-degree interactive turntable scrubbing and medical studio-grade lighting renders.
- **Narrator (Soumyadeep Pal):**
  > "Finally, our integrated Blender 3D Studio, generated via headless Python automation in Blender 5.2, offers 360-degree studio turntable inspection."

---

### 3:20 - 4:25 | Act 4: Surgical Dissection HUD, Dynamic Real-Life ECG Telemetry & Auscultation
- **Visual:** Focus on the `Surgical Dissection HUD` in the top right and the real-time `ECG Telemetry` oscilloscope in the bottom right.
- **Action:** Click `Cut Open Heart`. Select `Coronal`, then `Short-Axis`, then `Sagittal` dissection planes. Toggle the `⇄ Invert` normal button.
- **Visual:**
  - The multi-planar cutting tool exposes the internal 4-chamber anatomy in coronal view, transverse ventricular cross-sections in short-axis, and outflow tracts in sagittal view.
  - Toggling Invert flips the surgical clipping normal cleanly without tearing geometry.
- **Narrator (Soumyadeep Pal):**
  > "Our Surgical Dissection HUD gives surgeons interactive multi-planar control. Clinicians can cut through Coronal 4-chamber, Short-Axis ventricular, or Sagittal outflow views, modulate cut depth continuously from anterior to posterior, and invert the clipping normal with a single click.
  >
  > Crucially, our system features dynamic, patient-specific ECG telemetry."
- **Action:** Focus on the real-time ECG oscilloscope. Click between `Patient #002` (ischemic ST changes) and `Patient #289` (normal sinus rhythm). Switch leads between `Lead II`, `V1`, `V5`, and `aVR`.
- **Visual:**
  - The continuous oscilloscope sweep updates dynamically: heart rate scales to the patient's exact resting pulse (100 BPM vs 70 BPM), the PR interval adjusts, and ischemic ST-segment depression / T-wave inversions morph in real time according to the patient's individual clinical inputs.
  - The S1/S2 Lub-Dub stethoscope sound synchronizes perfectly with each sweep cycle.
- **Narrator (Soumyadeep Pal):**
  > "Rather than a static looping graphic, our ECG oscilloscope computes real-time physiological P-QRS-T waveforms parameterized by each patient's exact pulse rate, PR interval, QRS duration, and ischemic ST-T abnormalities. Stethoscope auscultation reproduces acoustic S1 and S2 valve snaps synthesized via the Web Audio API."

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
  - `pytest`: 59 passed in 6.29s (including 31 zero-leakage mutation tests in `test_no_leakage.py`).
  - `web test`: 117 passed in 238ms across 11 comprehensive suites.
- **Narrator (Soumyadeep Pal):**
  > "Finally, let's examine the software engineering, cloud infrastructure, and DevOps architecture led by Debdas.
  >
  > Our production stack is fully deployed and freely accessible:
  > - Our frontend is deployed on **Vercel** with client-side routing and demand WebGL rendering.
  > - Our backend is hosted on **Render** as a Python 3.11 FastAPI service, equipped with an automated keep-warm GitHub Actions workflow pinging `/health` every 10 minutes to eliminate cold starts. If the API is ever unreachable, our frontend gracefully falls back to offline mode with zero UI degradation.
  >
  > Behind the application stands an uncompromising automated quality assurance suite:
  > 1. **Zero-Leakage Invariant Suite:** 31 automated mutation tests in `tests/test_no_leakage.py` strictly prove that `LAD`, `LCX`, `RCA`, and `Cath` are never exposed as model inputs.
  > 2. **Full Test Coverage:** 59 Python tests and 117 web unit, layout, and clinical scenario tests pass 100% green in under 7 seconds.
  > 3. **Production Build:** Clean TypeScript strict compilation with zero errors and an exact 6-page publication-ready technical report PDF.
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
