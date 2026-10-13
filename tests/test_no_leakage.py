"""tests/test_no_leakage.py: Strict zero-leakage test suite for CardioVision (Track A)."""

import json
from pathlib import Path
import sys
import pytest
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ml.features import (
    FORBIDDEN_LEAKAGE_COLUMNS,
    check_no_leakage,
    clean_features,
    derive_targets,
    get_feature_names,
    get_features_and_targets,
    get_features_for_target,
    load_clean_data,
    load_data,
)


def test_feature_matrix_no_leakage():
    """Verify that feature matrix X contains exactly 54 features and zero forbidden columns."""
    X, y = get_features_and_targets()

    # Dimension checks
    assert X.shape[0] == 303, f"Expected 303 rows in X, got {X.shape[0]}"
    assert X.shape[1] == 54, f"Expected exactly 54 features in X, got {X.shape[1]}"

    # Direct validation function check
    check_no_leakage(X.columns)

    # Exhaustive case-insensitive check
    forbidden_upper = {c.upper() for c in FORBIDDEN_LEAKAGE_COLUMNS}
    for col in X.columns:
        assert (
            col.strip().upper() not in forbidden_upper
        ), f"CRITICAL LEAKAGE DETECTED: Column '{col}' in feature matrix X!"


def test_per_target_feature_matrices_no_leakage():
    """Verify zero leakage across all 4 independent model targets (CAD, LAD, LCX, RCA)."""
    target_names = ["CAD", "LAD", "LCX", "RCA"]
    forbidden_upper = {c.upper() for c in FORBIDDEN_LEAKAGE_COLUMNS}

    for target in target_names:
        X_target = get_features_for_target(target)
        assert X_target.shape[0] == 303
        assert X_target.shape[1] == 54

        # Verify no forbidden column exists for this target
        for col in X_target.columns:
            assert (
                col.strip().upper() not in forbidden_upper
            ), f"Target '{target}' contains leaked column '{col}'"

        # Explicit cross-target leakage checks:
        # 1. No vessel stenosis column is an input to CAD or any vessel target
        for vessel in ["LAD", "LCX", "RCA"]:
            assert vessel not in X_target.columns
            assert vessel.lower() not in [c.lower() for c in X_target.columns]

        # 2. Neither Cath nor CAD is an input to any target
        assert "Cath" not in X_target.columns
        assert "CAD" not in X_target.columns
        assert "cath" not in [c.lower() for c in X_target.columns]
        assert "cad" not in [c.lower() for c in X_target.columns]


@pytest.mark.parametrize(
    "leaked_col",
    [
        "LAD",
        "LCX",
        "RCA",
        "Cath",
        "CAD",
        "lad",
        "lcx",
        "rca",
        "cath",
        "cad",
        "Cad",
        "cAtH",
        "lAd",
        "rCa",
        "Lcx",
        " LAD ",
        "Cath ",
    ],
)
def test_synthetic_leakage_detected(leaked_col: str):
    """
    Synthetic adversarial check:
    Verify that check_no_leakage systematically raises AssertionError
    when any forbidden column or case variant is injected into candidate features.
    """
    candidate_features = ["Age", "Sex", "BMI", "BP", "LDL", leaked_col]

    with pytest.raises(AssertionError, match="CRITICAL LEAKAGE DETECTED"):
        check_no_leakage(candidate_features)


def test_synthetic_multiple_leakage_detected():
    """Verify that multiple simultaneous leaked columns are caught."""
    multi_leaked = ["Age", "Sex", "LAD", "Cath", "RCA"]
    with pytest.raises(AssertionError, match="CRITICAL LEAKAGE DETECTED"):
        check_no_leakage(multi_leaked)


def test_synthetic_clean_features_pass():
    """Verify that a clean candidate feature set passes without raising exceptions."""
    clean_features_list = [
        "Age",
        "Weight",
        "Length",
        "Sex",
        "BMI",
        "DM",
        "HTN",
        "BP",
        "PR",
        "FBS",
        "LDL",
        "HDL",
        "EF-TTE",
    ]
    # Must execute cleanly without error
    check_no_leakage(clean_features_list)


def test_target_shapes_and_values():
    """Verify that all 4 derived targets maintain genuine ground truth and correct distributions."""
    raw_df = load_data()
    y = derive_targets(raw_df)

    assert set(y.keys()) == {"CAD", "LAD", "LCX", "RCA"}

    # Class balance ground truth verification
    expected_counts = {
        "CAD": {"pos": 216, "neg": 87},
        "LAD": {"pos": 177, "neg": 126},
        "LCX": {"pos": 119, "neg": 184},
        "RCA": {"pos": 114, "neg": 189},
    }

    for target_name, counts in expected_counts.items():
        s = y[target_name]
        assert len(s) == 303, f"{target_name} must have 303 samples"
        assert set(s.unique()).issubset({0, 1}), f"{target_name} must be binary (0 or 1)"
        assert (s == 1).sum() == counts["pos"], f"{target_name} positive count mismatch"
        assert (s == 0).sum() == counts["neg"], f"{target_name} negative count mismatch"


def test_feature_schema_no_leakage():
    """Verify that models/feature_schema.json exists, contains 54 features, and has 0 leakage."""
    schema_path = PROJECT_ROOT / "models" / "feature_schema.json"
    assert schema_path.exists(), "models/feature_schema.json does not exist"

    with open(schema_path, "r", encoding="utf-8") as f:
        schema = json.load(f)

    # Support list or dict schema
    if isinstance(schema, list):
        schema_names = [item["name"] for item in schema]
    else:
        schema_names = list(schema.keys())

    assert len(schema_names) == 54, f"Expected 54 features in schema, found {len(schema_names)}"

    # Check zero leakage in schema feature names
    check_no_leakage(schema_names)

    # Required fields in each schema entry
    if isinstance(schema, list):
        for entry in schema:
            assert "name" in entry
            assert "type" in entry
            assert "default" in entry
            assert "group" in entry


def test_feature_names_no_leakage():
    """Verify that models/feature_names.json exists, has 54 features, and zero leakage."""
    names_path = PROJECT_ROOT / "models" / "feature_names.json"
    assert names_path.exists(), "models/feature_names.json does not exist"

    with open(names_path, "r", encoding="utf-8") as f:
        names = json.load(f)

    assert isinstance(names, list), "models/feature_names.json must be a list"
    assert len(names) == 54, f"Expected 54 features in feature_names.json, got {len(names)}"

    # Check zero leakage in feature_names.json
    check_no_leakage(names)

    # Cross check against X.columns exactly
    X, _ = get_features_and_targets()
    assert names == list(X.columns), "feature_names.json must match X.columns in order and name"


def test_constant_column_dropped():
    """Verify that zero-variance constant column 'Exertional CP' is dropped from X."""
    X, _ = get_features_and_targets()
    assert "Exertional CP" not in X.columns
    assert "exertional cp" not in [c.lower() for c in X.columns]


def test_no_production_shap_import():
    """Verify that shap is never imported in ml/features.py or production requirements."""
    ml_features_path = PROJECT_ROOT / "ml" / "features.py"
    req_path = PROJECT_ROOT / "requirements.txt"

    content = ml_features_path.read_text(encoding="utf-8")
    assert "import shap" not in content, "Forbidden 'import shap' detected in ml/features.py"
    assert "from shap" not in content, "Forbidden 'from shap' detected in ml/features.py"

    req_content = req_path.read_text(encoding="utf-8")
    for line in req_content.splitlines():
        pkg = line.strip().split("==")[0].strip().lower()
        assert pkg != "shap", "Forbidden shap dependency found in production requirements.txt"


def test_load_clean_data():
    """Verify load_clean_data returns (X, y) with shapes (303, 54) and (303, 4)."""
    X, y = load_clean_data()

    assert isinstance(X, pd.DataFrame), "X must be a pandas DataFrame"
    assert isinstance(y, pd.DataFrame), "y must be a pandas DataFrame"
    assert X.shape == (303, 54), f"Expected X shape (303, 54), got {X.shape}"
    assert y.shape == (303, 4), f"Expected y shape (303, 4), got {y.shape}"
    assert list(y.columns) == ["CAD", "LAD", "LCX", "RCA"], f"Unexpected y columns: {list(y.columns)}"
    assert X.isna().sum().sum() == 0, "X contains null values"
    assert y.isna().sum().sum() == 0, "y contains null values"

    # Zero leakage check on X
    check_no_leakage(X.columns)


def test_cad_label_rejection():
    """Verify check_no_leakage rejects CAD-label and case variations."""
    for variant in ["CAD-label", "cad-label", "CAD-LABEL", "Cad-Label"]:
        with pytest.raises(AssertionError, match="CRITICAL LEAKAGE DETECTED"):
            check_no_leakage([variant])
        with pytest.raises(AssertionError, match="CRITICAL LEAKAGE DETECTED"):
            check_no_leakage(["Age", "Sex", variant])


def test_zero_width_space_evasion_rejection():
    """Verify check_no_leakage strips zero-width and invisible characters before matching."""
    evasions = [
        "\u200bLAD",
        "\ufeffLAD",
        "\u200cLCX",
        "\u200dRCA",
        "\u00a0Cath",
        "\u200bCAD-label\ufeff",
        "  \u200bCAD\u200c  ",
    ]
    for evasion in evasions:
        with pytest.raises(AssertionError, match="CRITICAL LEAKAGE DETECTED"):
            check_no_leakage([evasion])


def test_single_string_iteration_rejection():
    """Verify check_no_leakage handles single string input without breaking into character iterations."""
    for forbidden in ["LAD", "Cath", "CAD-label", "rca", "LCX"]:
        with pytest.raises(AssertionError, match="CRITICAL LEAKAGE DETECTED"):
            check_no_leakage(forbidden)

    # Clean single feature string must pass cleanly
    check_no_leakage("Age")
    check_no_leakage("BMI")


def test_load_data_file_not_found():
    """Verify load_data and load_clean_data raise FileNotFoundError on missing custom path."""
    with pytest.raises(FileNotFoundError):
        load_data("non_existent_file.csv")

    with pytest.raises(FileNotFoundError):
        load_clean_data("non_existent_file.csv")
