"""api/main.py: FastAPI backend serving CardioVision risk predictions and clinical explanations."""

import json
import math
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

PROJECT_ROOT = Path(__file__).resolve().parent.parent
MODELS_DIR = PROJECT_ROOT / "models"
SCHEMA_PATH = MODELS_DIR / "feature_schema.json"
NAMES_PATH = MODELS_DIR / "feature_names.json"
DEMO_PATH = PROJECT_ROOT / "api" / "demo_patients.json"

app = FastAPI(title="CardioVision CAD Prediction API", version="v1")

# Configure CORS
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
env_cors = os.environ.get("CORS_ORIGINS")
if env_cors:
    allowed_origins.extend([o.strip() for o in env_cors.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load schemas and feature names at startup
feature_names_cache: List[str] = []
feature_schema_cache: List[Dict[str, Any]] = []
defaults_cache: Dict[str, Any] = {}

# Boosters and calibration cache for real models (Phase 5)
boosters_cache: Dict[str, Any] = {}
calibration_cache: Dict[str, Any] = {}


def load_assets():
    global feature_names_cache, feature_schema_cache, defaults_cache
    if NAMES_PATH.exists():
        with open(NAMES_PATH, "r", encoding="utf-8") as f:
            feature_names_cache = json.load(f)
    if SCHEMA_PATH.exists():
        with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
            feature_schema_cache = json.load(f)
            defaults_cache = {entry["name"]: entry.get("default") for entry in feature_schema_cache}


load_assets()


class PredictRequest(BaseModel):
    features: Dict[str, Any] = Field(
        ...,
        description="Patient clinical feature dictionary (key-value pairs matching schema)",
    )


class TargetPrediction(BaseModel):
    prob: float
    label: int
    ci: Optional[List[float]] = None


class VesselPrediction(BaseModel):
    prob: float
    label: int


class ExplanationItem(BaseModel):
    feature: str
    value: Any
    shap: float


class PredictResponse(BaseModel):
    cad: TargetPrediction
    vessels: Dict[str, VesselPrediction]
    explanations: Dict[str, List[ExplanationItem]]
    meta: Dict[str, Any]


def is_mock_mode() -> bool:
    env_mock = os.environ.get("MOCK_MODE")
    if env_mock is not None:
        return env_mock.strip() == "1"
    # Default to mock mode if model weights don't exist yet
    cad_model_path = MODELS_DIR / "booster_cad.json"
    return not cad_model_path.exists()


def compute_mock_prediction(features: Dict[str, Any]) -> Dict[str, Any]:
    """
    Deterministic smooth mock prediction function.
    Sliders for Age, BP, LDL, EF-TTE, smoking status directly and visibly affect probabilities.
    """
    age = float(features.get("Age", defaults_cache.get("Age", 58)))
    bp = float(features.get("BP", defaults_cache.get("BP", 130)))
    ldl = float(features.get("LDL", defaults_cache.get("LDL", 100)))
    ef = float(features.get("EF-TTE", defaults_cache.get("EF-TTE", 50)))
    htn = float(features.get("HTN", defaults_cache.get("HTN", 0)))
    smoker = float(features.get("Current Smoker", defaults_cache.get("Current Smoker", 0)))
    dm = float(features.get("DM", defaults_cache.get("DM", 0)))
    typical_cp = float(features.get("Typical Chest Pain", defaults_cache.get("Typical Chest Pain", 0)))

    # Smooth deterministic logit
    z = (
        -1.4
        + 0.045 * (age - 55)
        + 0.015 * (ldl - 100)
        + 0.018 * (bp - 120)
        - 0.045 * (ef - 50)
        + 0.70 * htn
        + 0.55 * smoker
        + 0.50 * dm
        + 0.65 * typical_cp
    )
    p_cad_raw = 1.0 / (1.0 + math.exp(-z))
    p_lad = 1.0 / (1.0 + math.exp(-(z - 0.20)))
    p_lcx = 1.0 / (1.0 + math.exp(-(z - 0.70)))
    p_rca = 1.0 / (1.0 + math.exp(-(z - 0.60)))

    max_vessel = max(p_lad, p_lcx, p_rca)
    cad_adjusted = False
    if max_vessel > p_cad_raw:
        p_cad = max_vessel
        cad_adjusted = True
    else:
        p_cad = p_cad_raw

    # Explanations in calibrated logit space
    contribs = [
        {"feature": "Age", "value": age, "shap": round(0.045 * (age - 55), 4)},
        {"feature": "Typical Chest Pain", "value": typical_cp, "shap": round(0.65 * typical_cp, 4)},
        {"feature": "HTN", "value": htn, "shap": round(0.70 * htn, 4)},
        {"feature": "EF-TTE", "value": ef, "shap": round(-0.045 * (ef - 50), 4)},
        {"feature": "LDL", "value": ldl, "shap": round(0.015 * (ldl - 100), 4)},
        {"feature": "BP", "value": bp, "shap": round(0.018 * (bp - 120), 4)},
        {"feature": "Current Smoker", "value": smoker, "shap": round(0.55 * smoker, 4)},
        {"feature": "DM", "value": dm, "shap": round(0.50 * dm, 4)},
    ]
    # Add other top features from the request
    for k in ["BMI", "FBS", "TG", "HDL", "CR"]:
        val = float(features.get(k, defaults_cache.get(k, 1.0)))
        diff = val - float(defaults_cache.get(k, 1.0))
        contribs.append({"feature": k, "value": val, "shap": round(0.01 * diff, 4)})

    contribs = sorted(contribs, key=lambda x: abs(x["shap"]), reverse=True)
    top_15 = contribs[:15]
    other_sum = sum(c["shap"] for c in contribs[15:])
    top_15.append({"feature": "(other)", "value": 0, "shap": round(other_sum, 4)})

    p_cad_round = round(p_cad, 4)
    ci_low = round(max(0.01, p_cad_round - 0.08), 4)
    ci_high = round(min(0.99, p_cad_round + 0.08), 4)

    return {
        "cad": {
            "prob": p_cad_round,
            "label": 1 if p_cad >= 0.5 else 0,
            "ci": [ci_low, ci_high],
        },
        "vessels": {
            "LAD": {"prob": round(p_lad, 4), "label": 1 if p_lad >= 0.5 else 0},
            "LCX": {"prob": round(p_lcx, 4), "label": 1 if p_lcx >= 0.5 else 0},
            "RCA": {"prob": round(p_rca, 4), "label": 1 if p_rca >= 0.5 else 0},
        },
        "explanations": {
            "CAD": top_15,
            "LAD": top_15[:10] + [{"feature": "(other)", "value": 0, "shap": 0.005}],
            "LCX": top_15[:10] + [{"feature": "(other)", "value": 0, "shap": 0.004}],
            "RCA": top_15[:10] + [{"feature": "(other)", "value": 0, "shap": 0.006}],
        },
        "meta": {
            "model_version": "v1",
            "disclaimer_id": "d1",
            "thresholds": {"CAD": 0.5},
            "explanation_space": "calibrated_logit",
            "cad_adjusted": cad_adjusted,
        },
    }


@app.get("/health")
def health():
    return {"status": "ok", "model_version": "v1"}


@app.get("/schema")
def get_schema():
    if not feature_schema_cache:
        load_assets()
    if not feature_schema_cache and SCHEMA_PATH.exists():
        with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return feature_schema_cache


@app.get("/demo")
def get_demo():
    if not DEMO_PATH.exists():
        raise HTTPException(status_code=404, detail="Demo patients not found")
    with open(DEMO_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


@app.post("/predict", response_model=PredictResponse)
def predict(payload: PredictRequest):
    if not feature_names_cache:
        load_assets()

    incoming_features = payload.features

    # Strict key check: reject any unknown keys with 422
    unknown_keys = [k for k in incoming_features.keys() if k not in feature_names_cache]
    if unknown_keys:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown feature key(s) detected: {unknown_keys}. Only schema features allowed.",
        )

    # Impute missing features from defaults
    full_features = {}
    for col in feature_names_cache:
        if col in incoming_features:
            full_features[col] = incoming_features[col]
        else:
            full_features[col] = defaults_cache.get(col, 0)

    # Mock mode branch
    if is_mock_mode():
        return compute_mock_prediction(full_features)

    # Real model inference branch (Phase 5 will populate boosters_cache)
    from api.inference import predict_real
    return predict_real(full_features)
