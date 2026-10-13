# 00 Context (read first)

**Project:** Track A, Multimodal AI Hackathon 2026: Cardiovascular Risk Visualization & Prediction.
**Goal:** Web app that predicts overall CAD and LAD / LCX / RCA stenosis from clinical data (Z-Alizadeh Sani Extension, 303 patients), colors an interactive 3D heart by vessel probability, and explains predictions with SHAP.
**Deadline:** 14 Oct 2026, 12:00 a.m.

## Required deliverables
1. Working web prototype (3D viewer + ML backend, live link)
2. Trained pipeline: clean code + model weights
3. Clinical explanation dashboard (metrics, SHAP, measurement breakdown)
4. Documentation PDF, **max 6 pages**
5. YouTube demo video, **3-10 minutes**

## Scoring
Predictive performance 30 | 3D visualization 25 | Clinical interpretability 20 | System integration 15 | Technical implementation 10.

## Hard constraints
- Exclude LAD, LCX, RCA, Cath from inputs for every target.
- Metrics: accuracy, precision, recall, F1, ROC-AUC (we also add PR-AUC, Brier).
- 3D must run smoothly without a dedicated GPU. Rotate, zoom, select vessel.
- Visible clinical disclaimer in the UI (see `09_SAFETY_DISCLAIMER.md`).
- Architecture must allow adding features/models/structures without redesign.
- Vessel colors must always match model outputs.
- Dataset has no lesion location. RWMA is a feature, not a map. Never draw "stenosis at mid-LAD".
- Free hosting only.

## Principle
Honest, calibrated reporting beats inflated AUC. State: 303 patients, single center, weak vessel-level signal for LCX/RCA if that is what the data shows.

## Stack
Backend: Python 3.11, scikit-learn, XGBoost (or LightGBM), FastAPI. Frontend: React + Vite + TypeScript, React Three Fiber + drei, zustand, Tailwind, Recharts. Hosting: Vercel (frontend) + Render free (API).
