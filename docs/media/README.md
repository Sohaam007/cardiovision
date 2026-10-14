# CardioVision Media, Video & Thumbnail Assets
**Team:** Lv. 9  
**Track:** Multimodal AI Hackathon 2026 — Track A (Cardiovascular Risk Visualization & Prediction)

This directory contains production-ready media assets, thumbnails, and video collateral created for Devpost submission, YouTube demo video, and project presentations.

---

## 🎨 Thumbnail Assets Overview

| Asset Name | Format | Dimensions | Purpose & Description |
|---|---|---|---|
| [`thumbnail.png`](thumbnail.png) | PNG (Lossless) | 1920 &times; 1080 (16:9) | **Primary YouTube & Devpost Thumbnail.** Composite image featuring real clinical dashboard screenshots, 3D Blender heart render, TreeSHAP beeswarm chart, dynamic emerald ECG telemetry line, and **Team: Lv. 9** branding. |
| [`thumbnail.svg`](thumbnail.svg) | SVG (Vector) | 1920 &times; 1080 (Scalable) | **Infinite-Resolution Vector Thumbnail.** Editable vector composition with glowing neon coronary arteries (LAD/LCX/RCA), isometric medical grid, golden **Team Lv. 9** pill, and **Nano-Banana Core** badge. |
| [`thumbnail.jpg`](thumbnail.jpg) | JPEG (95% Q) | 1920 &times; 1080 (16:9) | High-quality compressed version optimized for YouTube upload under the 2MB thumbnail limit. |
| [`thumbnail_cinematic_ai.jpg`](thumbnail_cinematic_ai.jpg) | JPEG | 1920 &times; 1080 (16:9) | High-impact cinematic visual concept featuring a glowing 3D anatomical heart, holographic HUD diagnostics, and neon circuitry. |

---

## 📐 Design Specifications & Brand Standards
- **Aspect Ratio:** Standard 16:9 widescreen (1920 &times; 1080 px).
- **Team Attribution:** `★ TEAM: Lv. 9 ★` prominently displayed in warm golden neon (`#f59e0b` to `#d97706`).
- **Core Technology Badge:** `⚡ NANO-BANANA CORE` in electric violet (`#a855f7` to `#7c3aed`).
- **Clinical Palette:** Modern Darkroom (`#070b14`), Medical Cyan (`#38bdf8`), Crimson Risk (`#ef4444`), Amber Warning (`#f59e0b`), and Emerald ECG (`#10b981`).
- **Model Invariants Highlighted:**
  - `0.9026 ROC-AUC` CAD Discrimination
  - `LAD / LCX / RCA` Territory Stenosis
  - `Sub-25ms Native TreeSHAP` (Zero `shap` production overhead)
  - `Zero-Leakage Automated Guard` (41+ mutation tests)

---

## 🛠️ Re-generating Thumbnail Assets
To re-generate the composite `thumbnail.png` and `thumbnail.jpg` from source screenshots:
```bash
python scripts/create_thumbnail.py
```
Outputs are written directly to `docs/media/thumbnail.png` and `docs/media/thumbnail.jpg`.
