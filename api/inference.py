"""
api/inference.py: Production inference engine for CardioVision (Track A).
Loads serialized XGBoost models, applies Platt calibration, computes native TreeSHAP
contributions in calibrated log-odds space, and enforces anatomical risk constraints.
Zero shap package dependencies.
"""

from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import json
import math
import numpy as np
import xgboost as xgb

# Project root and asset paths
API_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = API_DIR.parent
MODELS_DIR = PROJECT_ROOT / "models"

FEATURE_NAMES_PATH = MODELS_DIR / "feature_names.json"
FEATURE_SCHEMA_PATH = MODELS_DIR / "feature_schema.json"
CALIBRATION_PATH = MODELS_DIR / "calibration.json"

TARGETS = ["cad", "lad", "lcx", "rca"]

# Categorical mappings
BBB_MAP = {"N": 0.0, "LBBB": 1.0, "RBBB": 2.0}
VHD_MAP = {"N": 0.0, "MILD": 1.0, "MODERATE": 2.0, "SEVERE": 3.0}

# In-memory assets cache
_assets_loaded = False
_feature_names: List[str] = []
_defaults: Dict[str, Any] = {}
_calibration: Dict[str, Dict[str, float]] = {}
_boosters: Dict[str, xgb.Booster] = {}


def sigmoid(z: float) -> float:
    z_clip = max(-35.0, min(35.0, z))
    return 1.0 / (1.0 + math.exp(-z_clip))


def load_inference_assets() -> None:
    """Load serialized models, feature names, schema defaults, and Platt calibrators into memory."""
    global _assets_loaded, _feature_names, _defaults, _calibration, _boosters

    if _assets_loaded:
        return

    if not FEATURE_NAMES_PATH.exists():
        raise FileNotFoundError(f"Missing feature names asset at: {FEATURE_NAMES_PATH}")
    with open(FEATURE_NAMES_PATH, "r", encoding="utf-8") as f:
        _feature_names = json.load(f)

    if not FEATURE_SCHEMA_PATH.exists():
        raise FileNotFoundError(f"Missing feature schema asset at: {FEATURE_SCHEMA_PATH}")
    with open(FEATURE_SCHEMA_PATH, "r", encoding="utf-8") as f:
        schema = json.load(f)
    _defaults = {item["name"]: item.get("default", 0) for item in schema}

    if not CALIBRATION_PATH.exists():
        raise FileNotFoundError(f"Missing calibration parameters at: {CALIBRATION_PATH}")
    with open(CALIBRATION_PATH, "r", encoding="utf-8") as f:
        _calibration = json.load(f)

    _boosters = {}
    for target in TARGETS:
        model_path = MODELS_DIR / f"booster_{target}.json"
        if not model_path.exists():
            raise FileNotFoundError(f"Missing booster model file at: {model_path}")
        bst = xgb.Booster()
        bst.load_model(str(model_path))
        _boosters[target] = bst

    _assets_loaded = True


def encode_single_patient(features: Dict[str, Any]) -> Tuple[np.ndarray, xgb.DMatrix]:
    """
    Encode an incoming patient feature dictionary into an ordered 1x54 float32 array
    and return both the array and an xgb.DMatrix.
    """
    if not _assets_loaded:
        load_inference_assets()

    values = []
    for col in _feature_names:
        raw_val = features.get(col, _defaults.get(col, 0))
        if col == "BBB":
            val = BBB_MAP.get(str(raw_val).strip(), 0.0)
        elif col == "VHD":
            val = VHD_MAP.get(str(raw_val).strip().upper(), 0.0)
        elif col == "Sex":
            val = 1.0 if str(raw_val).strip().lower() == "male" or raw_val == 1 else 0.0
        else:
            try:
                val = float(raw_val)
            except (ValueError, TypeError):
                val = 0.0
        values.append(val)

    X_arr = np.array([values], dtype=np.float32)
    dmatrix = xgb.DMatrix(X_arr, feature_names=_feature_names)
    return X_arr, dmatrix


def predict_real(features: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute real model inference using calibrated XGBoost models and TreeSHAP.
    Enforces P(CAD) >= max(P(LAD), P(LCX), P(RCA)) and sets cad_adjusted flag.
    Returns response dictionary strictly conforming to PredictResponse schema.
    """
    if not _assets_loaded:
        load_inference_assets()

    X_arr, dmatrix = encode_single_patient(features)

    # 1. Compute margins and calibrated probabilities
    margins: Dict[str, float] = {}
    raw_probs: Dict[str, float] = {}
    cal_probs: Dict[str, float] = {}
    raw_contribs: Dict[str, np.ndarray] = {}

    for target in TARGETS:
        bst = _boosters[target]
        m = float(bst.predict(dmatrix, output_margin=True)[0])
        margins[target] = m

        A = _calibration[target]["A"]
        B = _calibration[target]["B"]
        p_cal = sigmoid(A * m + B)
        cal_probs[target] = p_cal

        # Native TreeSHAP contributions: shape (1, 55) where last is base value
        contrib = bst.predict(dmatrix, pred_contribs=True)[0]
        raw_contribs[target] = contrib

    p_cad_raw = cal_probs["cad"]
    p_lad = cal_probs["lad"]
    p_lcx = cal_probs["lcx"]
    p_rca = cal_probs["rca"]

    # 2. Enforce target hierarchy constraint: P(CAD) >= max(P(LAD), P(LCX), P(RCA))
    max_vessel = max(p_lad, p_lcx, p_rca)
    cad_adjusted = False
    if max_vessel > p_cad_raw:
        p_cad = max_vessel
        cad_adjusted = True
    else:
        p_cad = p_cad_raw

    # 3. Explanations in calibrated log-odds space
    explanations: Dict[str, List[Dict[str, Any]]] = {}
    for target in TARGETS:
        A = _calibration[target]["A"]
        contrib_arr = raw_contribs[target]
        feat_contribs = contrib_arr[:-1] * A

        items = []
        for idx, val in enumerate(feat_contribs):
            col_name = _feature_names[idx]
            raw_val = features.get(col_name, _defaults.get(col_name, 0))
            try:
                clean_val = round(float(raw_val), 4)
            except (ValueError, TypeError):
                clean_val = str(raw_val)
            items.append({
                "feature": col_name,
                "value": clean_val,
                "shap": round(float(val), 4),
            })

        items.sort(key=lambda x: abs(x["shap"]), reverse=True)
        top_15 = items[:15]
        other_sum = sum(x["shap"] for x in items[15:])
        top_15.append({"feature": "(other)", "value": 0, "shap": round(float(other_sum), 4)})
        explanations[target.upper()] = top_15

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
        "explanations": explanations,
        "meta": {
            "model_version": "v1",
            "disclaimer_id": "d1",
            "thresholds": {"CAD": 0.5},
            "explanation_space": "calibrated_logit",
            "cad_adjusted": cad_adjusted,
        },
    }
