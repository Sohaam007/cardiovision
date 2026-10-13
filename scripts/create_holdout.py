import json
from pathlib import Path
import sys
import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ml.features import clean_features, derive_targets, load_data


def create_demo_holdout():
    df = load_data()
    y = pd.DataFrame(derive_targets(df))
    X = clean_features(df)

    vessel_count = y["LAD"] + y["LCX"] + y["RCA"]

    # Stratified selection with fixed seed 42
    norm_idx = df[(y["CAD"] == 0) & (vessel_count == 0)].sample(n=2, random_state=42).index.tolist()
    v1_idx = df[(y["CAD"] == 1) & (vessel_count == 1)].sample(n=2, random_state=42).index.tolist()
    v2_idx = df[(y["CAD"] == 1) & (vessel_count == 2)].sample(n=2, random_state=42).index.tolist()
    v3_idx = df[(y["CAD"] == 1) & (vessel_count == 3)].sample(n=2, random_state=42).index.tolist()

    holdout_indices = sorted(norm_idx + v1_idx + v2_idx + v3_idx)
    assert len(holdout_indices) == 8, f"Expected 8 holdout patients, got {len(holdout_indices)}"

    holdout_patients = []
    for idx in holdout_indices:
        patient_features = X.loc[idx].to_dict()
        clean_feats = {}
        for k, v in patient_features.items():
            if isinstance(v, (np.integer, int)):
                clean_feats[k] = int(v)
            elif isinstance(v, (np.floating, float)):
                clean_feats[k] = float(round(v, 4))
            else:
                clean_feats[k] = v

        sex_str = "Male" if clean_feats["Sex"] == 1 else "Female"
        truth = {
            "CAD": int(y["CAD"].loc[idx]),
            "LAD": int(y["LAD"].loc[idx]),
            "LCX": int(y["LCX"].loc[idx]),
            "RCA": int(y["RCA"].loc[idx]),
        }
        holdout_patients.append({
            "id": f"patient_{idx:03d}",
            "index": int(idx),
            "summary": f"Age {clean_feats['Age']}, {sex_str}, BP {clean_feats['BP']} mmHg, LDL {clean_feats['LDL']} mg/dL, EF {clean_feats['EF-TTE']}%",
            "truth": truth,
            "features": clean_feats,
        })

    out_path = PROJECT_ROOT / "models" / "demo_holdout_raw.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(holdout_patients, f, indent=2)

    print(f"Exported {len(holdout_patients)} holdout rows to {out_path}")
    for p in holdout_patients:
        print(f"  {p['id']} (idx={p['index']}): truth={p['truth']} | {p['summary']}")


if __name__ == "__main__":
    create_demo_holdout()
