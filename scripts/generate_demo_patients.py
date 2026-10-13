import json
import math
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent


def mock_predict(features: dict) -> dict:
    age = float(features.get("Age", 58))
    bp = float(features.get("BP", 130))
    ldl = float(features.get("LDL", 100))
    ef = float(features.get("EF-TTE", 50))
    htn = float(features.get("HTN", 0))
    smoker = float(features.get("Current Smoker", 0))
    dm = float(features.get("DM", 0))

    # Smooth deterministic logit
    z = (
        -1.5
        + 0.045 * (age - 55)
        + 0.015 * (ldl - 100)
        + 0.018 * (bp - 120)
        - 0.045 * (ef - 50)
        + 0.75 * htn
        + 0.60 * smoker
        + 0.50 * dm
    )
    p_cad_raw = 1.0 / (1.0 + math.exp(-z))
    p_lad = 1.0 / (1.0 + math.exp(-(z - 0.25)))
    p_lcx = 1.0 / (1.0 + math.exp(-(z - 0.75)))
    p_rca = 1.0 / (1.0 + math.exp(-(z - 0.65)))

    max_vessel = max(p_lad, p_lcx, p_rca)
    cad_adjusted = False
    if max_vessel > p_cad_raw:
        p_cad = max_vessel
        cad_adjusted = True
    else:
        p_cad = p_cad_raw

    # Explanations
    contribs = [
        {"feature": "Age", "value": age, "shap": round(0.045 * (age - 55), 4)},
        {"feature": "LDL", "value": ldl, "shap": round(0.015 * (ldl - 100), 4)},
        {"feature": "BP", "value": bp, "shap": round(0.018 * (bp - 120), 4)},
        {"feature": "EF-TTE", "value": ef, "shap": round(-0.045 * (ef - 50), 4)},
        {"feature": "HTN", "value": htn, "shap": round(0.75 * htn, 4)},
        {"feature": "Current Smoker", "value": smoker, "shap": round(0.60 * smoker, 4)},
        {"feature": "DM", "value": dm, "shap": round(0.50 * dm, 4)},
    ]
    # sort by absolute shap
    contribs = sorted(contribs, key=lambda x: abs(x["shap"]), reverse=True)
    contribs.append({"feature": "(other)", "value": 0, "shap": 0.012})

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
            "CAD": contribs,
            "LAD": contribs[:5] + [{"feature": "(other)", "value": 0, "shap": 0.005}],
            "LCX": contribs[:5] + [{"feature": "(other)", "value": 0, "shap": 0.004}],
            "RCA": contribs[:5] + [{"feature": "(other)", "value": 0, "shap": 0.006}],
        },
        "meta": {
            "model_version": "v1",
            "disclaimer_id": "d1",
            "thresholds": {"CAD": 0.5},
            "explanation_space": "calibrated_logit",
            "cad_adjusted": cad_adjusted,
        },
    }


def main():
    raw_path = PROJECT_ROOT / "models" / "demo_holdout_raw.json"
    if not raw_path.exists():
        from scripts.create_holdout import create_demo_holdout
        create_demo_holdout()

    with open(raw_path, "r", encoding="utf-8") as f:
        holdout = json.load(f)

    demo_patients = []
    for p in holdout:
        pred = mock_predict(p["features"])
        entry = {
            "id": p["id"],
            "name": f"Patient #{p['index']:03d}",
            "summary": p["summary"],
            "truth": p["truth"],
            "features": p["features"],
            "prediction": pred,
        }
        demo_patients.append(entry)

    api_demo_path = PROJECT_ROOT / "api" / "demo_patients.json"
    api_demo_path.parent.mkdir(parents=True, exist_ok=True)
    with open(api_demo_path, "w", encoding="utf-8") as f:
        json.dump(demo_patients, f, indent=2)

    web_public_path = PROJECT_ROOT / "web" / "public" / "demo_patients.json"
    web_public_path.parent.mkdir(parents=True, exist_ok=True)
    with open(web_public_path, "w", encoding="utf-8") as f:
        json.dump(demo_patients, f, indent=2)

    print(f"Generated {len(demo_patients)} demo patients in api/ and web/public/")


if __name__ == "__main__":
    main()
