"""tests/test_empirical_challenger2.py: Challenger 2 empirical test suite for Task ML-01."""

import concurrent.futures
import json
from pathlib import Path
import sys
import time
import numpy as np
import pandas as pd
import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ml.features import (
    BINARY_YN_COLUMNS,
    FORBIDDEN_LEAKAGE_COLUMNS,
    clean_features,
    derive_targets,
    get_feature_names,
    get_features_and_targets,
    get_features_for_target,
    load_data,
)


def test_load_data_integrity():
    """Verify raw dataset dimensions, row count, column count, and zero null values."""
    raw_df = load_data()
    assert isinstance(raw_df, pd.DataFrame)
    assert raw_df.shape == (303, 59), f"Expected (303, 59), got {raw_df.shape}"
    assert raw_df.isna().sum().sum() == 0, "Raw dataset contains unexpected NaN/null values"
    assert raw_df.isnull().sum().sum() == 0, "Raw dataset contains null values"


def test_load_data_error_handling(tmp_path):
    """
    Empirically test load_data error handling and fallback behavior.
    Finding: When an arbitrary non-existent file is passed from the project root,
    load_data falls back silently to data/raw/z_alizadeh_sani.csv because fallback.exists() is True.
    When fallback does NOT exist, FileNotFoundError is raised.
    """
    # 1. Verify FileNotFoundError is raised when non-existent path is passed
    with pytest.raises(FileNotFoundError):
        load_data("non_existent_arbitrary_file.csv")

    # 2. Corrupt shape check: ValueError is raised when shape != (303, 59)
    corrupt_file = tmp_path / "corrupt.csv"
    pd.DataFrame({"A": [1, 2], "B": [3, 4]}).to_csv(corrupt_file, index=False)
    with pytest.raises(ValueError, match="Unexpected dataset shape"):
        load_data(corrupt_file)



def test_cleaned_feature_matrix_integrity():
    """Verify feature matrix dimensions, nulls, dtypes, memory footprint, and encoding."""
    X, y = get_features_and_targets()

    # Exact shape
    assert X.shape == (303, 54), f"Expected shape (303, 54), got {X.shape}"

    # Zero nulls
    null_count = int(X.isna().sum().sum())
    assert null_count == 0, f"Cleaned feature matrix contains {null_count} nulls"

    # Memory footprint check (ensure matrix is lightweight, under 250 KB)
    deep_memory_bytes = X.memory_usage(deep=True).sum()
    assert deep_memory_bytes < 250000, f"Memory footprint excessive: {deep_memory_bytes} bytes"

    # Dropped columns
    assert "Exertional CP" not in X.columns
    for forbidden in FORBIDDEN_LEAKAGE_COLUMNS:
        assert forbidden not in X.columns
        assert forbidden.lower() not in [c.lower() for c in X.columns]

    # Binary Y/N encoding check (all 17 columns must be strictly 0 or 1 integers)
    for col in BINARY_YN_COLUMNS:
        assert col in X.columns, f"Expected binary column {col} missing from X"
        unique_vals = set(X[col].unique())
        assert unique_vals.issubset({0, 1}), f"Column {col} has non-binary values: {unique_vals}"
        assert pd.api.types.is_integer_dtype(X[col]), f"Column {col} must be integer dtype"

    # Sex encoding check (Male -> 1, Fmale -> 0)
    assert "Sex" in X.columns
    assert set(X["Sex"].unique()).issubset({0, 1})
    assert pd.api.types.is_integer_dtype(X["Sex"])

    # Categorical preserved columns
    assert "BBB" in X.columns
    assert set(X["BBB"].unique()).issubset({"N", "LBBB", "RBBB"})

    assert "VHD" in X.columns
    assert set(X["VHD"].unique()).issubset({"N", "mild", "Moderate", "Severe"})

    assert "Region RWMA" in X.columns
    assert set(X["Region RWMA"].unique()).issubset({0, 1, 2, 3, 4})

    assert "Function Class" in X.columns
    assert set(X["Function Class"].unique()).issubset({0, 1, 2, 3})


def test_row_93_discordance_and_integrity():
    """Verify row index 93 ground truth behavior, clinical observations, and cross-tabulation."""
    raw_df = load_data()
    X, y = get_features_and_targets()

    # Raw row 93 values
    row_93_raw = raw_df.iloc[93]
    assert int(row_93_raw["Age"]) == 65
    assert str(row_93_raw["Sex"]).strip() == "Male"
    assert str(row_93_raw["Cath"]).strip() == "Normal"
    assert str(row_93_raw["LAD"]).strip() == "Stenotic"
    assert str(row_93_raw["LCX"]).strip() == "Normal"
    assert str(row_93_raw["RCA"]).strip() == "Normal"
    assert int(row_93_raw["EF-TTE"]) == 45

    # Processed row 93 targets
    assert y["CAD"].iloc[93] == 0, "Row 93 CAD target must be 0 (Normal Cath)"
    assert y["LAD"].iloc[93] == 1, "Row 93 LAD target must be 1 (Stenotic LAD)"
    assert y["LCX"].iloc[93] == 0, "Row 93 LCX target must be 0 (Normal LCX)"
    assert y["RCA"].iloc[93] == 0, "Row 93 RCA target must be 0 (Normal RCA)"

    # Total stenosed vessels for row 93
    vessel_sum = y["LAD"] + y["LCX"] + y["RCA"]
    assert vessel_sum.iloc[93] == 1, "Row 93 must have exactly 1 stenosed vessel (LAD)"

    # Concordance across the entire cohort
    # 1. 100% of Cath=CAD have at least 1 stenosed vessel
    cad_mask = (y["CAD"] == 1)
    assert (vessel_sum[cad_mask] >= 1).all(), "All CAD patients must have >=1 stenosed vessel"
    assert (vessel_sum[cad_mask] == 0).sum() == 0

    # 2. In Cath=Normal (87 patients), exactly 86 have 0 vessels, and exactly 1 (row 93) has 1 vessel
    normal_mask = (y["CAD"] == 0)
    assert normal_mask.sum() == 87
    assert (vessel_sum[normal_mask] == 0).sum() == 86
    assert (vessel_sum[normal_mask] == 1).sum() == 1
    assert vessel_sum[normal_mask].idxmax() == 93, "The single discordant Normal case must be row 93"


def test_four_targets_distributions():
    """Verify sample counts, unique binary values, and exact class balance distributions."""
    raw_df = load_data()
    y = derive_targets(raw_df)

    assert set(y.keys()) == {"CAD", "LAD", "LCX", "RCA"}

    expected_distributions = {
        "CAD": {"pos": 216, "neg": 87, "prev": 71.29},
        "LAD": {"pos": 177, "neg": 126, "prev": 58.42},
        "LCX": {"pos": 119, "neg": 184, "prev": 39.27},
        "RCA": {"pos": 114, "neg": 189, "prev": 37.62},
    }

    for target_name, stats in expected_distributions.items():
        s = y[target_name]
        assert len(s) == 303, f"{target_name} length mismatch"
        assert set(s.unique()) == {0, 1}, f"{target_name} must contain both 0 and 1"
        assert s.isna().sum() == 0, f"{target_name} has nulls"

        pos_count = int((s == 1).sum())
        neg_count = int((s == 0).sum())
        assert pos_count == stats["pos"], f"{target_name} pos count mismatch: {pos_count} != {stats['pos']}"
        assert neg_count == stats["neg"], f"{target_name} neg count mismatch: {neg_count} != {stats['neg']}"

        prevalence = round((pos_count / len(s)) * 100.0, 2)
        assert abs(prevalence - stats["prev"]) < 0.05, f"{target_name} prevalence mismatch"


def test_feature_schema_exact_match():
    """Verify that models/feature_schema.json strictly matches the cleaned feature matrix."""
    schema_path = PROJECT_ROOT / "models" / "feature_schema.json"
    assert schema_path.exists(), "Schema file models/feature_schema.json is missing"

    with open(schema_path, "r", encoding="utf-8") as f:
        schema = json.load(f)

    assert isinstance(schema, list), "Schema root should be a list"
    assert len(schema) == 54, f"Schema must document exactly 54 features, got {len(schema)}"

    X, _ = get_features_and_targets()
    raw_df = load_data()
    feature_cols = list(X.columns)

    schema_names = [entry["name"] for entry in schema]
    assert schema_names == feature_cols, "Schema feature names and order must match X.columns exactly"

    required_keys = {
        "name", "type", "group", "min", "max", "default",
        "unit", "reference_range", "options", "description"
    }

    allowed_types = {"binary", "numeric", "categorical", "integer", "number", "ordinal"}
    allowed_groups = {"vitals_history", "ecg", "echo_lab", "Demographic", "History/exam", "ECG", "Lab", "Echo"}

    for entry in schema:
        assert required_keys.issubset(set(entry.keys())), f"Missing keys in entry: {entry['name']}"
        assert entry["type"] in allowed_types, f"Invalid type '{entry['type']}' in {entry['name']}"
        assert entry["group"] in allowed_groups, f"Invalid group '{entry['group']}' in {entry['name']}"

        col_name = entry["name"]
        col_type = entry["type"]
        series_clean = X[col_name]
        series_raw = raw_df[col_name]

        if col_type in ("integer", "number", "ordinal", "numeric"):
            actual_min = float(series_clean.min())
            actual_max = float(series_clean.max())
            schema_min = float(entry["min"])
            schema_max = float(entry["max"])

            # Verify schema min and max match actual data within 2-decimal rounding resolution (0.01)
            assert abs(schema_min - actual_min) <= 0.01, f"Schema min deviates > 0.01 for {col_name}"
            assert abs(schema_max - actual_max) <= 0.01, f"Schema max deviates > 0.01 for {col_name}"
            assert schema_min <= entry["default"] <= schema_max, f"Default outside [min, max] for {col_name}"


        elif col_type == "binary":
            assert entry["min"] == 0, f"Binary min must be 0 for {col_name}"
            assert entry["max"] == 1, f"Binary max must be 1 for {col_name}"
            assert entry["default"] in (0, 1), f"Binary default must be 0 or 1 for {col_name}"
            assert set(series_clean.unique()).issubset({0, 1})

        elif col_type == "categorical":
            assert entry["min"] is None, f"Categorical min must be None for {col_name}"
            assert entry["max"] is None, f"Categorical max must be None for {col_name}"
            assert isinstance(entry["options"], list), f"Categorical must have options list for {col_name}"
            # Unique raw values should be in options
            raw_unique = set(series_raw.unique())
            options_set = set(entry["options"])
            assert raw_unique.issubset(options_set), (
                f"Raw values {raw_unique} not in options {options_set} for {col_name}"
            )
            # In categorical schema: check if default (or its int cast for numeric categoricals) is in options
            opts_str = [str(o) for o in entry["options"]]
            assert str(entry["default"]) in opts_str, f"Default {entry['default']} not in options for {col_name}"


def test_schema_zero_em_dashes():
    """Verify that models/feature_schema.json contains zero em dashes in any field."""
    schema_path = PROJECT_ROOT / "models" / "feature_schema.json"
    content = schema_path.read_text(encoding="utf-8")
    assert "\u2014" not in content, "Em dash detected in models/feature_schema.json"


def test_benchmarking_repeated_loads():
    """Benchmark repeated loading and cleaning: verify throughput and sub-250ms execution."""
    iterations = 15
    start_time = time.perf_counter()
    for _ in range(iterations):
        X, y = get_features_and_targets()
        assert X.shape == (303, 54)
        assert len(y) == 4
    elapsed = time.perf_counter() - start_time
    avg_ms = (elapsed / iterations) * 1000.0

    # Ensure average pipeline execution is bounded (< 250ms per disk load on Windows under load)
    assert avg_ms < 250.0, f"Pipeline execution too slow: {avg_ms:.2f} ms per load"




def test_multithreaded_concurrency():
    """Verify deterministic behavior and thread safety under concurrent calls."""
    def worker_load():
        X, y = get_features_and_targets()
        return X.shape, y["CAD"].sum(), y["LAD"].sum()

    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        futures = [executor.submit(worker_load) for _ in range(16)]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]

    # All results must be identical
    expected = ((303, 54), 216, 177)
    for res in results:
        assert res == expected, f"Concurrency inconsistency detected: {res} != {expected}"


def test_empirical_finding_bmi_rounding_boundary():
    """
    Verify that BMI schema bounds in feature_schema.json encompass
    actual dataset extremes: min 18.11, max 40.91.
    """
    raw_df = load_data()
    schema_path = PROJECT_ROOT / "models" / "feature_schema.json"
    with open(schema_path, "r", encoding="utf-8") as f:
        schema = json.load(f)

    bmi_entry = next(entry for entry in schema if entry["name"] == "BMI")
    actual_min = float(raw_df["BMI"].min())
    actual_max = float(raw_df["BMI"].max())

    # Actual BMI min is 18.1154..., schema min is 18.11
    assert actual_min >= bmi_entry["min"]
    assert bmi_entry["min"] == 18.11

    # Actual BMI max is 40.9006..., schema max is 40.91
    assert actual_max <= bmi_entry["max"]
    assert bmi_entry["max"] == 40.91


def test_empirical_finding_region_rwma_default_type_mismatch():
    """
    Verify that Region RWMA default value is serialized as integer 0,
    matching options [0, 1, 2, 3, 4] and clean feature matrix int64 dtype.
    """
    X, _ = get_features_and_targets()
    schema_path = PROJECT_ROOT / "models" / "feature_schema.json"
    with open(schema_path, "r", encoding="utf-8") as f:
        schema = json.load(f)

    rwma_entry = next(entry for entry in schema if entry["name"] == "Region RWMA")
    assert rwma_entry["default"] == 0, "Region RWMA default must be integer 0"
    assert isinstance(rwma_entry["default"], int)
    assert rwma_entry["options"] == [0, 1, 2, 3, 4]
    assert all(isinstance(opt, int) for opt in rwma_entry["options"])
    assert pd.api.types.is_integer_dtype(X["Region RWMA"].dtype)


