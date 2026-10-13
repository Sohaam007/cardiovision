# 01 Architecture

```
repo/
  data/raw/            Z-Alizadeh Sani CSV + license note
  ml/                  train.py, features.py, evaluate.py, export.py
  models/              *.json models, metrics.json, shap_global.json,
                       reference_ranges.json, demo_patients.json
  api/                 FastAPI app (main.py), loads models/ at startup
  web/                 Vite + React + TS app
     public/           heart.glb (optional), demo_patients.json (fallback copy)
     src/api/          client + types (generated from 04_API_CONTRACT)
     src/scene/        R3F heart, vessels, camera presets
     src/ui/           cards, SHAP chart, what-if, patient picker
     src/store/        zustand: patient, prediction, selectedVessel
  tests/               test_no_leakage.py, test_api_parity.py
  docs/                this folder
```

## Data flow
Patient inputs (UI) -> `POST /predict` -> probabilities + SHAP -> zustand store -> (a) vessel colors in 3D, (b) cards, (c) SHAP chart. Clicking a vessel sets `selectedVessel`, which switches the SHAP target.

## Extensibility rules
- Features come from `models/feature_schema.json`; the UI form renders from it.
- Vessels come from a config list (`name`, `curve points`, `target key`); adding one means one config entry.
- Models are loaded by target key; adding a target means a new key in the contract.

## Consistency rule
Post-process so `P(CAD) >= max(P(LAD), P(LCX), P(RCA))`. Log in DECISIONS.md.
