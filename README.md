# CardioVision: Multimodal 3D Cardiovascular Risk Visualization & Prediction

CardioVision is an interactive decision-support prototype built for Track A of the Multimodal AI Hackathon 2026. The system predicts overall Coronary Artery Disease (CAD) status as well as vessel-specific stenosis in the Left Anterior Descending (LAD), Left Circumflex (LCX), and Right Coronary Artery (RCA) using clinical, demographic, ECG, laboratory, and echocardiographic features from the Z-Alizadeh Sani Extension dataset (303 patients). Predictions are visually mapped in real-time onto an interactive 3D human heart and coronary vessel viewer, accompanied by clinical explainability via TreeSHAP feature attributions and reference range comparisons.

## Clinical Safety Disclaimer

> **IMPORTANT CLINICAL NOTICE**
> 
> **For decision support and educational purposes only. Not a medical device. Not a substitute for formal diagnostic imaging or clinical judgment.**
> 
> This tool estimates the likelihood of coronary artery disease and vessel-level stenosis from a small research dataset (303 patients, single center). Predictions can be wrong. The 3D colors show model-estimated probability for each whole vessel; they do not show where a blockage is. Do not use this tool for diagnosis or treatment decisions. Always rely on qualified clinicians and formal diagnostic imaging.

## Quickstart

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm

### Setup
```bash
# Install Python dependencies and Node dependencies
make setup
```

### Run Backend API
```bash
make api
# API will start at http://localhost:8000 (Health check: http://localhost:8000/health)
```

### Run Frontend Web App
```bash
make web
# Web app will start at http://localhost:5173
```

### Run Tests
```bash
make test
```

## Repository Structure
- `data/raw/`: Raw Z-Alizadeh Sani dataset (UCI ID 411) and licensing information.
- `ml/`: Model training, feature pipelines, repeated stratified CV, and artifact export.
- `models/`: Trained model binaries, metrics, global SHAP values, and reference ranges.
- `api/`: Lightweight FastAPI backend serving predictions and explainability.
- `web/`: React Three Fiber + Vite + TypeScript 3D viewer and clinical dashboard.
- `tests/`: Automated test suite including strict feature leakage prevention guards.
- `docs/`: Architecture specifications, task cards, API contracts, and decision logs.

## Citation & License
Dataset: Alizadehsani, R., Roshanzamir, M., & Sani, Z. (2013). "Extension of Z-Alizadeh Sani Dataset". UCI Machine Learning Repository. (CC BY 4.0)
Code licensed under MIT.
