# 10 Blender 3D Procedural Cardiac Turntable & Motion Pipeline

## Overview
CardioVision incorporates a procedural 3D anatomical cardiac pipeline in Blender (`scripts/blender_cardiac_turntable.py`) to generate medical studio-grade visualizations, canonical multi-angle clinical stills, and web-ready glTF 2.0 binary (`.glb`) assets.

---

## 1. Clinical Invariants & Guardrails
- **Uniform Vessel Coloration:** Entire arterial branches are colored uniformly based strictly on the model-predicted probability:
  - Low Risk ($p < 0.30$): Emerald Green (`#10b981`)
  - Moderate Risk ($0.30 \le p < 0.70$): Clinical Amber (`#f59e0b`)
  - High Risk ($p \ge 0.70$): Crimson Red (`#ef4444`)
  - Colorblind-safe palette support: Royal Blue $\to$ Vivid Orange $\to$ Magenta Pink
- **Zero Focal Lesion Claims:** The dataset contains vessel-level labels, not lesion coordinates. No focal stenosis pinch points, occlusions, or localized markers are rendered.
- **Zero Target Leakage:** No LAD, LCX, RCA, or Cath features are ever used as model inputs.

---

## 2. Anatomical Geometry Architecture
1. **Compound Ventricular Myocardium:**
   - UV sphere modified with anatomical tapering towards the cardiac apex along the vertical axis ($Z$).
   - Left ventricle muscular lateral bulge ($X > 0$).
   - Posterior diaphragmatic surface flattening ($Y > 0$).
   - Anterior interventricular groove sulcus indentation ($Y < 0, 0.12 < X < 0.42$) where the LAD tracks.
2. **Atria & Great Vessels:**
   - Right Atrium & Left Atrium anatomical base domes.
   - Ascending Aorta Root (arterial coral Principled BSDF).
   - Pulmonary Trunk (pulmonary arterial blue Principled BSDF).
   - Superior Vena Cava (SVC).
3. **Coronary Arterial Tree:**
   - **Left Main (LM):** Originates from the aortic sinotubular junction, terminating at the bifurcation.
   - **Left Anterior Descending (LAD):** Traverses the anterior interventricular groove to the apex.
   - **Left Circumflex (LCX):** Traverses the left atrioventricular groove to the posterior cardiac wall.
   - **Right Coronary Artery (RCA):** Traverses the right atrioventricular sulcus to the posterior crux cordis.

---

## 3. Lighting & Turntable Rig
- **3-Point Medical Cinematic Studio Lighting:**
  - Key Light: Area light at $(2.5, -3.5, 3.0)$ with warm 300W illumination.
  - Fill Light: Area light at $(-3.5, -2.0, 1.5)$ with cool 160W illumination.
  - Rim Light: Spot light at $(0, 4.0, 2.5)$ with 350W cyan contour edge separation.
- **Camera Turntable Rig:**
  - Center empty at origin animated through 360-degree rotation across 120 frames.
  - Smooth Bezier interpolation compatible with both Blender 5.2 layered animation channels (`action.layers[...].strips[...].channelbags[...].fcurves`) and legacy Blender 4.x (`action.fcurves`).
  - Canonical view markers:
    - Frame 1: Anterior view (LAD foreground)
    - Frame 35: Left Lateral view (LCX profile)
    - Frame 70: Posterior view (Crux cordis & distal vessels)

---

## 4. Headless Execution Commands
Run headlessly via Blender 5.2 CLI:
```bash
# Export web-ready GLB model (< 5 MB budget):
blender -b -P scripts/blender_cardiac_turntable.py -- --export-glb docs/figures/cardiac_model.glb

# Render canonical 3-angle clinical images:
blender -b -P scripts/blender_cardiac_turntable.py -- --render-views docs/figures

# Render custom patient risk profile:
blender -b -P scripts/blender_cardiac_turntable.py -- --lad-prob 0.94 --lcx-prob 0.24 --rca-prob 0.28 --render-still docs/figures/blender_render_anterior.png
```

---

## 5. Artifacts Produced
- `docs/figures/cardiac_model.glb` (0.30 MB $\ll$ 5.0 MB budget, glTF 2.0 binary).
- `docs/figures/blender_render_anterior.png` (High-resolution anterior view).
- `docs/figures/blender_render_lateral.png` (High-resolution left lateral LCX view).
- `docs/figures/blender_render_posterior.png` (High-resolution posterior crux cordis view).
- `tests/test_blender_assets.py` (5 automated tests verifying invariants, geometry, and glTF binary headers).
