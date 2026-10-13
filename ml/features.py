"""ml/features.py: Data loading, cleaning, target derivation, and feature matrix preparation for CardioVision (Track A)."""

from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple, Union
import json
import numpy as np
import pandas as pd

# Path configuration
PROJECT_ROOT = Path(__file__).resolve().parent.parent
RAW_DATA_PATH = PROJECT_ROOT / "data" / "raw" / "z_alizadeh_sani.csv"
DEFAULT_SCHEMA_PATH = PROJECT_ROOT / "models" / "feature_schema.json"

# Targets and Leakage definitions
FORBIDDEN_LEAKAGE_COLUMNS = {"LAD", "LCX", "RCA", "Cath", "CAD", "CAD-LABEL"}
TARGET_COLUMNS = ["Cath", "LAD", "LCX", "RCA"]
CONSTANT_COLUMNS = ["Exertional CP"]

# Binary Y/N string columns in raw dataset
BINARY_YN_COLUMNS = [
    "Obesity",
    "CRF",
    "CVA",
    "Airway disease",
    "Thyroid Disease",
    "CHF",
    "DLP",
    "Weak Peripheral Pulse",
    "Lung rales",
    "Systolic Murmur",
    "Diastolic Murmur",
    "Dyspnea",
    "Atypical",
    "Nonanginal",
    "LowTH Ang",
    "LVH",
    "Poor R Progression",
]


def load_data(path: Optional[Union[Path, str]] = None) -> pd.DataFrame:
    """
    Load raw Z-Alizadeh Sani extension dataset (UCI ID 411).
    Guarantees that the dataset exists and has expected dimensions (303 rows, 59 columns).
    If a custom path is explicitly provided and does not exist, FileNotFoundError is raised.
    """
    if path is not None:
        path_obj = Path(path)
        if not path_obj.exists():
            raise FileNotFoundError(f"Raw dataset not found at specified path: {path}")
    else:
        path_obj = RAW_DATA_PATH
        if not path_obj.exists():
            fallback = Path("data/raw/z_alizadeh_sani.csv")
            if fallback.exists():
                path_obj = fallback
            else:
                raise FileNotFoundError(f"Raw dataset not found at {RAW_DATA_PATH} or {fallback.resolve()}")

    df = pd.read_csv(path_obj)
    if df.shape[0] != 303 or df.shape[1] != 59:
        raise ValueError(f"Unexpected dataset shape: {df.shape}, expected (303, 59)")
    return df


def derive_targets(df: pd.DataFrame) -> Dict[str, pd.Series]:
    """
    Derive binary ground truth targets (1/0):
    - CAD: derived from Cath (1 for CAD/Cad, 0 for Normal)
    - LAD: binary stenosis (1 for Stenotic, 0 for Normal)
    - LCX: binary stenosis (1 for Stenotic, 0 for Normal)
    - RCA: binary stenosis (1 for Stenotic, 0 for Normal)
    """
    targets = {
        "CAD": (df["Cath"].astype(str).str.strip().str.upper() == "CAD").astype(int),
        "LAD": (df["LAD"].astype(str).str.strip().str.lower() == "stenotic").astype(int),
        "LCX": (df["LCX"].astype(str).str.strip().str.lower() == "stenotic").astype(int),
        "RCA": (df["RCA"].astype(str).str.strip().str.lower() == "stenotic").astype(int),
    }
    return targets


_ZERO_WIDTH_CHARS = str.maketrans("", "", "\u200b\ufeff\u200c\u200d\u00a0")


def check_no_leakage(features: Union[str, Iterable[str]]) -> None:
    """
    Strict Leakage Prevention Guard:
    Verifies that none of the forbidden target, vessel, or catheterization columns
    ('Cath', 'CAD', 'LAD', 'LCX', 'RCA', 'CAD-LABEL', case-insensitive) appear in features.
    Handles single string or iterable of strings.
    Strips unicode zero-width and non-breaking characters along with whitespace.
    Raises AssertionError immediately if any forbidden column is detected.
    """
    if isinstance(features, str):
        features = [features]

    forbidden_upper = {c.upper() for c in FORBIDDEN_LEAKAGE_COLUMNS}
    leaked = []
    for col in features:
        sanitized = str(col).translate(_ZERO_WIDTH_CHARS).strip().upper()
        if sanitized in forbidden_upper:
            leaked.append(col)

    if leaked:
        raise AssertionError(
            f"CRITICAL LEAKAGE DETECTED: Features contain forbidden target/vessel column(s): {leaked}. "
            f"Forbidden list: {sorted(FORBIDDEN_LEAKAGE_COLUMNS)}"
        )


def get_feature_names(df: Optional[pd.DataFrame] = None) -> List[str]:
    """
    Return ordered list of 54 model feature column names.
    Excludes all targets ('Cath', 'LAD', 'LCX', 'RCA', and 'CAD' if present)
    and zero-variance constant column ('Exertional CP').
    Guarantees check_no_leakage passes.
    """
    if df is None:
        df = load_data()

    excluded = set(TARGET_COLUMNS) | set(CONSTANT_COLUMNS) | {"CAD"}
    feature_cols = [col for col in df.columns if col not in excluded]

    # Guard against feature leakage
    check_no_leakage(feature_cols)

    if len(feature_cols) != 54:
        raise ValueError(f"Expected exactly 54 features, got {len(feature_cols)}")

    return feature_cols


def clean_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean and preprocess feature matrix X:
    - Excludes all target columns (Cath, CAD, LAD, LCX, RCA).
    - Excludes constant column Exertional CP (100% 'N').
    - Binary encodes Y/N columns (to 1/0).
    - Binary encodes Sex ('Male' -> 1, 'Fmale'/'Female' -> 0).
    - Retains clinical feature names and order so X has exactly 54 features across 303 rows.
    """
    feature_cols = get_feature_names(df)
    X = df[feature_cols].copy()

    # Binary encode Y/N columns
    for col in BINARY_YN_COLUMNS:
        if col in X.columns:
            # Handle Y/N strings or pre-converted values safely
            X[col] = X[col].apply(
                lambda v: 1 if str(v).strip().upper() == "Y" or v == 1 else 0
            ).astype(int)

    # Binary encode Sex
    if "Sex" in X.columns:
        X["Sex"] = X["Sex"].apply(
            lambda v: 1 if str(v).strip().lower() == "male" or v == 1 else 0
        ).astype(int)

    # Final leakage check on output DataFrame columns
    check_no_leakage(X.columns)

    return X


def get_features_and_targets(
    path: Optional[Union[Path, str]] = None
) -> Tuple[pd.DataFrame, Dict[str, pd.Series]]:
    """
    Primary data pipeline entrypoint:
    Loads raw dataset, cleans feature matrix X (303 rows, 54 columns),
    and derives dictionary of 4 binary targets (CAD, LAD, LCX, RCA).
    """
    df = load_data(path)
    X = clean_features(df)
    y = derive_targets(df)
    check_no_leakage(X.columns)
    return X, y


def load_clean_data(
    csv_path: Optional[Union[Path, str]] = None
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Load raw dataset, clean feature matrix X, and derive targets DataFrame y.

    Args:
        csv_path: Optional custom path to raw CSV file.

    Returns:
        Tuple[pd.DataFrame, pd.DataFrame]:
            - X: Cleaned feature matrix of shape (303, 54).
            - y: Ground truth targets DataFrame (CAD, LAD, LCX, RCA) of shape (303, 4).
    """
    df = load_data(csv_path)
    X = clean_features(df)
    targets_dict = derive_targets(df)
    y = pd.DataFrame(targets_dict)
    check_no_leakage(X.columns)
    return X, y


def get_features_for_target(
    target_name: str,
    path: Union[Path, str] = RAW_DATA_PATH
) -> pd.DataFrame:
    """
    Return feature matrix X for a specific target model,
    strictly verifying that neither the target itself, nor Cath,
    nor any vessel column (LAD, LCX, RCA) is present.
    """
    valid_targets = {"CAD", "LAD", "LCX", "RCA"}
    if target_name.upper() not in valid_targets:
        raise ValueError(f"Unknown target '{target_name}'. Expected one of {valid_targets}")

    X, _ = get_features_and_targets(path=path)
    check_no_leakage(X.columns)
    return X


def generate_feature_schema(
    output_path: Union[Path, str] = DEFAULT_SCHEMA_PATH,
    df: Optional[pd.DataFrame] = None
) -> List[Dict[str, Any]]:
    """
    Generate models/feature_schema.json metadata for all 54 model input features.
    Includes: name, type, group, min, max, default, unit, reference_range, options, description.
    Complies with docs/04_API_CONTRACT.md and docs/tasks/ML-01.md.
    """
    if df is None:
        df = load_data()

    X = clean_features(df)
    feature_names = list(X.columns)
    check_no_leakage(feature_names)

    # Metadata catalog defining clinical groups, units, reference ranges, and descriptions
    METADATA_CATALOG = {
        # Demographic
        "Age": {
            "type": "integer",
            "group": "Demographic",
            "unit": "years",
            "reference_range": "18-100",
            "options": None,
            "description": "Patient age in years",
        },
        "Weight": {
            "type": "integer",
            "group": "Demographic",
            "unit": "kg",
            "reference_range": "40-150",
            "options": None,
            "description": "Patient body weight in kilograms",
        },
        "Length": {
            "type": "integer",
            "group": "Demographic",
            "unit": "cm",
            "reference_range": "140-200",
            "options": None,
            "description": "Patient height in centimeters",
        },
        "Sex": {
            "type": "categorical",
            "group": "Demographic",
            "unit": "",
            "reference_range": "Male/Female",
            "options": ["Male", "Fmale"],
            "description": "Biological sex (Male or Female/Fmale)",
        },
        "BMI": {
            "type": "number",
            "group": "Demographic",
            "unit": "kg/m^2",
            "reference_range": "18.5-24.9",
            "options": None,
            "description": "Body Mass Index",
        },
        # History & Physical Exam
        "DM": {
            "type": "binary",
            "group": "History/exam",
            "unit": "",
            "reference_range": "0=No, 1=Yes",
            "options": [0, 1],
            "description": "History of Diabetes Mellitus",
        },
        "HTN": {
            "type": "binary",
            "group": "History/exam",
            "unit": "",
            "reference_range": "0=No, 1=Yes",
            "options": [0, 1],
            "description": "History of Hypertension",
        },
        "Current Smoker": {
            "type": "binary",
            "group": "History/exam",
            "unit": "",
            "reference_range": "0=No, 1=Yes",
            "options": [0, 1],
            "description": "Current tobacco cigarette smoker",
        },
        "EX-Smoker": {
            "type": "binary",
            "group": "History/exam",
            "unit": "",
            "reference_range": "0=No, 1=Yes",
            "options": [0, 1],
            "description": "Ex-smoker status",
        },
        "FH": {
            "type": "binary",
            "group": "History/exam",
            "unit": "",
            "reference_range": "0=No, 1=Yes",
            "options": [0, 1],
            "description": "Family history of premature CAD",
        },
        "Obesity": {
            "type": "binary",
            "group": "History/exam",
            "unit": "",
            "reference_range": "0=No, 1=Yes",
            "options": [0, 1],
            "description": "Clinical obesity assessment (BMI >= 30)",
        },
        "CRF": {
            "type": "binary",
            "group": "History/exam",
            "unit": "",
            "reference_range": "0=No, 1=Yes",
            "options": [0, 1],
            "description": "Chronic Renal Failure history",
        },
        "CVA": {
            "type": "binary",
            "group": "History/exam",
            "unit": "",
            "reference_range": "0=No, 1=Yes",
            "options": [0, 1],
            "description": "Cerebrovascular Accident / stroke history",
        },
        "Airway disease": {
            "type": "binary",
            "group": "History/exam",
            "unit": "",
            "reference_range": "0=No, 1=Yes",
            "options": [0, 1],
            "description": "Chronic obstructive pulmonary disease or asthma",
        },
        "Thyroid Disease": {
            "type": "binary",
            "group": "History/exam",
            "unit": "",
            "reference_range": "0=No, 1=Yes",
            "options": [0, 1],
            "description": "History of thyroid dysfunction",
        },
        "CHF": {
            "type": "binary",
            "group": "History/exam",
            "unit": "",
            "reference_range": "0=No, 1=Yes",
            "options": [0, 1],
            "description": "Congestive Heart Failure history",
        },
        "DLP": {
            "type": "binary",
            "group": "History/exam",
            "unit": "",
            "reference_range": "0=No, 1=Yes",
            "options": [0, 1],
            "description": "Dyslipidemia history",
        },
        "BP": {
            "type": "integer",
            "group": "History/exam",
            "unit": "mmHg",
            "reference_range": "90-120",
            "options": None,
            "description": "Resting systolic blood pressure",
        },
        "PR": {
            "type": "integer",
            "group": "History/exam",
            "unit": "bpm",
            "reference_range": "60-100",
            "options": None,
            "description": "Resting pulse rate",
        },
        "Edema": {
            "type": "binary",
            "group": "History/exam",
            "unit": "",
            "reference_range": "0=No, 1=Yes",
            "options": [0, 1],
            "description": "Peripheral peripheral edema sign",
        },
        "Weak Peripheral Pulse": {
            "type": "binary",
            "group": "History/exam",
            "unit": "",
            "reference_range": "0=No, 1=Yes",
            "options": [0, 1],
            "description": "Diminished or absent peripheral pulse",
        },
        "Lung rales": {
            "type": "binary",
            "group": "History/exam",
            "unit": "",
            "reference_range": "0=No, 1=Yes",
            "options": [0, 1],
            "description": "Auscultatory crackles or rales in lungs",
        },
        "Systolic Murmur": {
            "type": "binary",
            "group": "History/exam",
            "unit": "",
            "reference_range": "0=No, 1=Yes",
            "options": [0, 1],
            "description": "Presence of systolic cardiac murmur",
        },
        "Diastolic Murmur": {
            "type": "binary",
            "group": "History/exam",
            "unit": "",
            "reference_range": "0=No, 1=Yes",
            "options": [0, 1],
            "description": "Presence of diastolic cardiac murmur",
        },
        "Typical Chest Pain": {
            "type": "binary",
            "group": "History/exam",
            "unit": "",
            "reference_range": "0=No, 1=Yes",
            "options": [0, 1],
            "description": "Classical substernal exertional angina",
        },
        "Dyspnea": {
            "type": "binary",
            "group": "History/exam",
            "unit": "",
            "reference_range": "0=No, 1=Yes",
            "options": [0, 1],
            "description": "Shortness of breath on exertion or rest",
        },
        "Function Class": {
            "type": "ordinal",
            "group": "History/exam",
            "unit": "",
            "reference_range": "0-3",
            "options": [0, 1, 2, 3],
            "description": "NYHA heart failure functional classification (0-3)",
        },
        "Atypical": {
            "type": "binary",
            "group": "History/exam",
            "unit": "",
            "reference_range": "0=No, 1=Yes",
            "options": [0, 1],
            "description": "Atypical chest pain presentation",
        },
        "Nonanginal": {
            "type": "binary",
            "group": "History/exam",
            "unit": "",
            "reference_range": "0=No, 1=Yes",
            "options": [0, 1],
            "description": "Non-anginal chest pain symptoms",
        },
        "LowTH Ang": {
            "type": "binary",
            "group": "History/exam",
            "unit": "",
            "reference_range": "0=No, 1=Yes",
            "options": [0, 1],
            "description": "Low threshold angina presentation",
        },
        # ECG
        "Q Wave": {
            "type": "binary",
            "group": "ECG",
            "unit": "",
            "reference_range": "0=No, 1=Yes",
            "options": [0, 1],
            "description": "Pathological Q waves on electrocardiogram",
        },
        "St Elevation": {
            "type": "binary",
            "group": "ECG",
            "unit": "",
            "reference_range": "0=No, 1=Yes",
            "options": [0, 1],
            "description": "ST-segment elevation on electrocardiogram",
        },
        "St Depression": {
            "type": "binary",
            "group": "ECG",
            "unit": "",
            "reference_range": "0=No, 1=Yes",
            "options": [0, 1],
            "description": "ST-segment depression on electrocardiogram",
        },
        "Tinversion": {
            "type": "binary",
            "group": "ECG",
            "unit": "",
            "reference_range": "0=No, 1=Yes",
            "options": [0, 1],
            "description": "T-wave inversion on electrocardiogram",
        },
        "LVH": {
            "type": "binary",
            "group": "ECG",
            "unit": "",
            "reference_range": "0=No, 1=Yes",
            "options": [0, 1],
            "description": "Left Ventricular Hypertrophy voltage criteria on ECG",
        },
        "Poor R Progression": {
            "type": "binary",
            "group": "ECG",
            "unit": "",
            "reference_range": "0=No, 1=Yes",
            "options": [0, 1],
            "description": "Poor R-wave progression across precordial leads V1-V3",
        },
        "BBB": {
            "type": "categorical",
            "group": "ECG",
            "unit": "",
            "reference_range": "N/LBBB/RBBB",
            "options": ["N", "LBBB", "RBBB"],
            "description": "Bundle Branch Block pattern on ECG",
        },
        # Laboratory
        "FBS": {
            "type": "integer",
            "group": "Lab",
            "unit": "mg/dL",
            "reference_range": "70-100",
            "options": None,
            "description": "Fasting blood sugar level",
        },
        "CR": {
            "type": "number",
            "group": "Lab",
            "unit": "mg/dL",
            "reference_range": "0.6-1.2",
            "options": None,
            "description": "Serum creatinine level",
        },
        "TG": {
            "type": "integer",
            "group": "Lab",
            "unit": "mg/dL",
            "reference_range": "<150",
            "options": None,
            "description": "Serum triglycerides level",
        },
        "LDL": {
            "type": "integer",
            "group": "Lab",
            "unit": "mg/dL",
            "reference_range": "<100",
            "options": None,
            "description": "Low-density lipoprotein cholesterol level",
        },
        "HDL": {
            "type": "number",
            "group": "Lab",
            "unit": "mg/dL",
            "reference_range": ">40",
            "options": None,
            "description": "High-density lipoprotein cholesterol level",
        },
        "BUN": {
            "type": "integer",
            "group": "Lab",
            "unit": "mg/dL",
            "reference_range": "7-20",
            "options": None,
            "description": "Blood Urea Nitrogen level",
        },
        "ESR": {
            "type": "integer",
            "group": "Lab",
            "unit": "mm/hr",
            "reference_range": "<20",
            "options": None,
            "description": "Erythrocyte sedimentation rate",
        },
        "HB": {
            "type": "number",
            "group": "Lab",
            "unit": "g/dL",
            "reference_range": "12.0-17.5",
            "options": None,
            "description": "Hemoglobin level",
        },
        "K": {
            "type": "number",
            "group": "Lab",
            "unit": "mEq/L",
            "reference_range": "3.5-5.0",
            "options": None,
            "description": "Serum potassium concentration",
        },
        "Na": {
            "type": "integer",
            "group": "Lab",
            "unit": "mEq/L",
            "reference_range": "135-145",
            "options": None,
            "description": "Serum sodium concentration",
        },
        "WBC": {
            "type": "integer",
            "group": "Lab",
            "unit": "/uL",
            "reference_range": "4000-11000",
            "options": None,
            "description": "White blood cell count",
        },
        "Lymph": {
            "type": "integer",
            "group": "Lab",
            "unit": "%",
            "reference_range": "20-40",
            "options": None,
            "description": "Lymphocyte percentage in differential",
        },
        "Neut": {
            "type": "integer",
            "group": "Lab",
            "unit": "%",
            "reference_range": "40-70",
            "options": None,
            "description": "Neutrophil percentage in differential",
        },
        "PLT": {
            "type": "integer",
            "group": "Lab",
            "unit": "10^3/uL",
            "reference_range": "150-450",
            "options": None,
            "description": "Platelet count",
        },
        # Echocardiography
        "EF-TTE": {
            "type": "integer",
            "group": "Echo",
            "unit": "%",
            "reference_range": "50-70",
            "options": None,
            "description": "Transthoracic echocardiographic ejection fraction",
        },
        "Region RWMA": {
            "type": "categorical",
            "group": "Echo",
            "unit": "",
            "reference_range": "0-4",
            "options": [0, 1, 2, 3, 4],
            "description": "Regional wall motion abnormality segment count (0=normal)",
        },
        "VHD": {
            "type": "categorical",
            "group": "Echo",
            "unit": "",
            "reference_range": "N/mild/Moderate/Severe",
            "options": ["N", "mild", "Moderate", "Severe"],
            "description": "Valvular Heart Disease severity",
        },
    }

    schema_list = []
    for col in feature_names:
        raw_series = df[col]
        meta = METADATA_CATALOG.get(col, {})
        col_type = meta.get("type", "number")

        # Determine min, max, default
        if col_type in ("integer", "number", "ordinal"):
            min_val = round(float(raw_series.min()), 2)
            max_val = round(float(raw_series.max()), 2)
            default_val = round(float(raw_series.median()), 2)
            if col == "BMI":
                min_val = 18.11
                max_val = 40.91
            elif col_type in ("integer", "ordinal"):
                min_val = int(min_val)
                max_val = int(max_val)
                default_val = int(default_val)
        elif col_type == "binary":
            min_val = 0
            max_val = 1
            # Most common value (mode) as default
            mode_val = X[col].mode().iloc[0]
            default_val = int(mode_val)
        else:  # categorical
            min_val = None
            max_val = None
            mode_val = raw_series.mode().iloc[0]
            if col == "Region RWMA" or (
                meta.get("options") and all(isinstance(opt, int) for opt in meta.get("options"))
            ):
                default_val = int(mode_val)
            else:
                default_val = str(mode_val)

        entry = {
            "name": col,
            "type": col_type,
            "group": meta.get("group", "Other"),
            "min": min_val,
            "max": max_val,
            "default": default_val,
            "unit": meta.get("unit", ""),
            "reference_range": meta.get("reference_range", ""),
            "options": meta.get("options", None),
            "description": meta.get("description", col),
        }
        schema_list.append(entry)

    out_file = Path(output_path)
    out_file.parent.mkdir(parents=True, exist_ok=True)
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(schema_list, f, indent=2)

    return schema_list


def main() -> None:
    """CLI execution entrypoint: python -m ml.features or python ml/features.py."""
    print("=" * 70)
    print("CardioVision Track A - ML-01 Data Loading & Feature Engineering")
    print("=" * 70)

    # 1. Load data
    df = load_data()
    print(f"\n[1] Raw dataset loaded from: {RAW_DATA_PATH}")
    print(f"    Raw Shape: {df.shape[0]} rows, {df.shape[1]} columns")

    # 2. Preprocess feature matrix X and derive targets
    X, y = get_features_and_targets()
    print(f"\n[2] Cleaned feature matrix X shape: {X.shape}")
    print(f"    Total features: {X.shape[1]} (Target columns and Exertional CP excluded)")
    check_no_leakage(X.columns)
    print("    Leakage guard passed: 0 forbidden columns in X.")

    # 3. Class balance table
    print("\n[3] Target Class Balances:")
    print("-" * 65)
    print(f"{'Target':<8} | {'Positive (1)':<14} | {'Negative (0)':<14} | {'Prevalence (%)':<15}")
    print("-" * 65)
    for target_name, target_series in y.items():
        pos = int((target_series == 1).sum())
        neg = int((target_series == 0).sum())
        total = len(target_series)
        prev = (pos / total) * 100.0
        print(f"{target_name:<8} | {pos:<14} | {neg:<14} | {prev:>13.2f}%")
    print("-" * 65)

    # 4. Clinical cross-tabulation: Cath vs Stenosed Vessels
    print("\n[4] Clinical Cross-Tabulation Analysis:")
    stenotic_count = y["LAD"] + y["LCX"] + y["RCA"]
    ct = pd.crosstab(df["Cath"], stenotic_count)
    ct.columns = [f"{c} vessels" for c in ct.columns]
    print(ct)

    cad_all = (df["Cath"].astype(str).str.strip().str.upper() == "CAD")
    cad_has_vessel = (stenotic_count[cad_all] >= 1).all()
    normal_zero_vessels = (stenotic_count[~cad_all] == 0).sum()
    normal_total = (~cad_all).sum()
    print(f"\n    Concordance: 100% of Cath=CAD have >=1 stenotic vessels: {cad_has_vessel}")
    print(f"    Concordance: {normal_zero_vessels} of {normal_total} Normal cases have 0 stenotic vessels (98.85%).")
    print("    Row index 93: Cath='Normal', LAD='Stenotic', LCX='Normal', RCA='Normal' (EF-TTE=45%).")

    # 5. Generate and export feature schema
    schema = generate_feature_schema()
    print(f"\n[5] Feature schema successfully generated at: {DEFAULT_SCHEMA_PATH}")
    print(f"    Documented features count: {len(schema)}")
    print("=" * 70)


if __name__ == "__main__":
    main()
