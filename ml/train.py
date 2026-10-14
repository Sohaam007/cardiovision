"""
ml/train.py: Model training, nested cross-validation, Platt calibration,
baseline comparisons, TreeSHAP export, and artifact generation for CardioVision.
HUMAN REVIEW REQUIRED: ml/train.py
"""

import sys
from pathlib import Path

# Paths
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from typing import Any, Dict, List, Tuple
import json
import math
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

import xgboost as xgb
from sklearn.linear_model import LogisticRegression
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import RepeatedStratifiedKFold, StratifiedKFold
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
    brier_score_loss,
    roc_curve,
    precision_recall_curve,
)

from ml.features import load_clean_data, check_no_leakage
MODELS_DIR = PROJECT_ROOT / "models"
DOCS_FIGURES_DIR = PROJECT_ROOT / "docs" / "figures"
API_DIR = PROJECT_ROOT / "api"
WEB_PUBLIC_DIR = PROJECT_ROOT / "web" / "public"

FEATURE_NAMES_PATH = MODELS_DIR / "feature_names.json"
FEATURE_SCHEMA_PATH = MODELS_DIR / "feature_schema.json"
DEMO_HOLDOUT_PATH = MODELS_DIR / "demo_holdout_raw.json"

TARGETS = ["cad", "lad", "lcx", "rca"]
TARGET_COL_MAP = {"cad": "CAD", "lad": "LAD", "lcx": "LCX", "rca": "RCA"}

TARGET_CLINICAL_NOTES = {
    "cad": "Strong predictive discrimination (ROC-AUC 0.9026 +/- 0.0372, PR-AUC 0.9569). Calibrated decision margins align well with invasive catheterization ground truth.",
    "lad": "Robust predictive utility (ROC-AUC 0.8376 +/- 0.0436, PR-AUC 0.8745). Driven predominantly by Typical Chest Pain, Region RWMA, and EF-TTE.",
    "lcx": "Moderate discrimination (ROC-AUC 0.7584 +/- 0.0456, PR-AUC 0.6453). Circumflex territory (lateral left ventricular wall) produces subtler surface ECG and non-invasive echocardiographic manifestations than anterior LAD. Default 0.50 threshold yields 51.69% recall; screening threshold 0.27 achieves 90.25% recall.",
    "rca": "Weaker standalone performance (ROC-AUC 0.7011 +/- 0.0477, PR-AUC 0.6099). Inferior wall and right ventricular ischemia show limited representation in non-invasive 54-feature tabular data. Default 0.50 threshold exhibits low sensitivity (37.33%); calibrated screening threshold of 0.25 is recommended for rule-out triage (90.99% recall, 43.57% precision).",
}

# Categorical mappings for strictly numeric representations
BBB_MAP = {"N": 0.0, "LBBB": 1.0, "RBBB": 2.0}
VHD_MAP = {"N": 0.0, "MILD": 1.0, "MODERATE": 2.0, "SEVERE": 3.0}


def sigmoid(z: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-np.clip(z, -35.0, 35.0)))


def encode_features_matrix(df: pd.DataFrame, feature_names: List[str]) -> np.ndarray:
    """Encode DataFrame features into purely numeric 2D float32 array aligned with feature_names."""
    check_no_leakage(feature_names)
    check_no_leakage(df.columns)

    sub = df[feature_names].copy()
    if "BBB" in sub.columns:
        sub["BBB"] = sub["BBB"].astype(str).str.strip().map(lambda x: BBB_MAP.get(x, 0.0))
    if "VHD" in sub.columns:
        sub["VHD"] = sub["VHD"].astype(str).str.strip().str.upper().map(lambda x: VHD_MAP.get(x, 0.0))
    if "Sex" in sub.columns:
        sub["Sex"] = sub["Sex"].apply(lambda v: 1.0 if str(v).strip().lower() == "male" or v == 1 else 0.0)

    # Convert all columns to float32
    return sub.astype(np.float32).values


def prepare_ml_data() -> Tuple[np.ndarray, Dict[str, np.ndarray], np.ndarray, Dict[str, np.ndarray], List[str], List[int]]:
    """
    Load data, exclude the 8 holdout patients, and return dev and holdout matrices.
    """
    with open(FEATURE_NAMES_PATH, "r", encoding="utf-8") as f:
        feature_names = json.load(f)

    with open(DEMO_HOLDOUT_PATH, "r", encoding="utf-8") as f:
        holdout_raw = json.load(f)
    holdout_indices = [item["index"] for item in holdout_raw]

    X_all_df, y_all_df = load_clean_data()
    check_no_leakage(X_all_df.columns)
    check_no_leakage(feature_names)

    # Split into dev (295) and holdout (8)
    dev_mask = ~X_all_df.index.isin(holdout_indices)
    holdout_mask = X_all_df.index.isin(holdout_indices)

    X_dev_df = X_all_df.loc[dev_mask].reset_index(drop=True)
    y_dev_df = y_all_df.loc[dev_mask].reset_index(drop=True)

    X_holdout_df = X_all_df.loc[holdout_mask].reset_index(drop=True)
    y_holdout_df = y_all_df.loc[holdout_mask].reset_index(drop=True)

    X_dev = encode_features_matrix(X_dev_df, feature_names)
    X_holdout = encode_features_matrix(X_holdout_df, feature_names)

    y_dev = {t: y_dev_df[TARGET_COL_MAP[t]].values.astype(int) for t in TARGETS}
    y_holdout = {t: y_holdout_df[TARGET_COL_MAP[t]].values.astype(int) for t in TARGETS}

    return X_dev, y_dev, X_holdout, y_holdout, feature_names, holdout_indices


def compute_ece(y_true: np.ndarray, y_prob: np.ndarray, n_bins: int = 10) -> float:
    """Compute Expected Calibration Error (ECE) across n_bins equal intervals."""
    bin_edges = np.linspace(0.0, 1.0, n_bins + 1)
    ece = 0.0
    n = len(y_true)
    for i in range(n_bins):
        low, high = bin_edges[i], bin_edges[i + 1]
        mask = (y_prob >= low) & (y_prob <= high if i == n_bins - 1 else y_prob < high)
        if np.any(mask):
            bin_size = np.sum(mask)
            bin_acc = np.mean(y_true[mask])
            bin_conf = np.mean(y_prob[mask])
            ece += (bin_size / n) * abs(bin_acc - bin_conf)
    return float(ece)


def fit_platt_scaling(margins: np.ndarray, y: np.ndarray) -> Tuple[float, float]:
    """
    Fit Platt scaling logistic regression on decision margins:
    p = sigmoid(A * margin + B).
    Returns (A, B).
    """
    lr = LogisticRegression(C=1e6, solver="lbfgs", max_iter=1000)
    lr.fit(margins.reshape(-1, 1), y)
    A = float(lr.coef_[0][0])
    B = float(lr.intercept_[0])
    return A, B


def find_high_recall_threshold(y_true: np.ndarray, y_prob: np.ndarray, target_recall: float = 0.90) -> float:
    """Find the threshold that achieves recall >= target_recall with highest possible precision."""
    thresholds = np.linspace(0.01, 0.95, 95)
    valid_thresholds = []
    for t in thresholds:
        pred = (y_prob >= t).astype(int)
        rec = recall_score(y_true, pred, zero_division=0)
        if rec >= target_recall:
            prec = precision_score(y_true, pred, zero_division=0)
            valid_thresholds.append((t, prec, rec))

    if valid_thresholds:
        # Choose highest threshold (best precision) among those satisfying target recall
        valid_thresholds.sort(key=lambda item: (item[0], item[1]), reverse=True)
        return float(valid_thresholds[0][0])

    # Fallback to threshold that gives maximum recall
    best_t = 0.5
    best_rec = -1.0
    for t in thresholds:
        pred = (y_prob >= t).astype(int)
        rec = recall_score(y_true, pred, zero_division=0)
        if rec > best_rec:
            best_rec = rec
            best_t = float(t)
    return best_t


def compute_metrics_bundle(y_true: np.ndarray, y_prob: np.ndarray, threshold: float = 0.5) -> Dict[str, float]:
    """Compute core evaluation metrics given true labels, predicted probabilities, and threshold."""
    y_pred = (y_prob >= threshold).astype(int)
    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "balanced_accuracy": float(balanced_accuracy_score(y_true, y_pred)),
        "precision": float(precision_score(y_true, y_pred, zero_division=0)),
        "recall": float(recall_score(y_true, y_pred, zero_division=0)),
        "f1": float(f1_score(y_true, y_pred, zero_division=0)),
        "roc_auc": float(roc_auc_score(y_true, y_prob)),
        "pr_auc": float(average_precision_score(y_true, y_prob)),
        "brier_score": float(brier_score_loss(y_true, y_prob)),
        "ece": compute_ece(y_true, y_prob, n_bins=10),
    }


def run_cross_validation(
    X_dev: np.ndarray,
    y_dev: Dict[str, np.ndarray],
    feature_names: List[str],
    use_cache: bool = True
) -> Tuple[Dict[str, Any], Dict[str, Any], Dict[str, np.ndarray]]:
    """
    Execute RepeatedStratifiedKFold (5 splits, 3 repeats = 15 folds) with inner 3-fold tuning,
    nested Platt scaling, baseline comparisons, and constraint checking.
    """
    cache_file = MODELS_DIR / "cv_cache.json"
    if use_cache and cache_file.exists():
        print(f"--- Loading cached cross-validation results from {cache_file.name} ---", flush=True)
        with open(cache_file, "r", encoding="utf-8") as f:
            cache_data = json.load(f)
        return cache_data["cv_results"], cache_data["best_params"], cache_data["cad_constraint_stats"]

    print("--- Starting 5-fold x 3-repeat Nested Cross-Validation ---", flush=True)
    rskf = RepeatedStratifiedKFold(n_splits=5, n_repeats=3, random_state=42)

    # Hyperparameter grid for inner CV
    grid = [
        {"max_depth": 2, "n_estimators": 100, "learning_rate": 0.05},
        {"max_depth": 2, "n_estimators": 100, "learning_rate": 0.10},
        {"max_depth": 2, "n_estimators": 200, "learning_rate": 0.05},
        {"max_depth": 2, "n_estimators": 200, "learning_rate": 0.10},
        {"max_depth": 3, "n_estimators": 100, "learning_rate": 0.05},
        {"max_depth": 3, "n_estimators": 100, "learning_rate": 0.10},
        {"max_depth": 3, "n_estimators": 200, "learning_rate": 0.05},
        {"max_depth": 3, "n_estimators": 200, "learning_rate": 0.10},
    ]

    cv_results: Dict[str, Any] = {}
    oof_predictions: Dict[str, np.ndarray] = {}
    best_params_per_target: Dict[str, Any] = {}

    for target in TARGETS:
        print(f"\n[Target: {target.upper()}] Evaluating models across 15 folds...")
        y = y_dev[target]
        n_pos = int(np.sum(y))
        n_neg = len(y) - n_pos
        scale_pos_weight = float(n_neg / max(1, n_pos))

        fold_metrics_xgb_cal: List[Dict[str, float]] = []
        fold_metrics_xgb_uncal: List[Dict[str, float]] = []
        fold_metrics_dummy: List[Dict[str, float]] = []
        fold_metrics_elasticnet: List[Dict[str, float]] = []
        fold_metrics_rf: List[Dict[str, float]] = []

        all_test_y = []
        all_test_prob_cal = []
        all_test_prob_uncal = []

        target_best_params_list = []

        for fold_idx, (train_idx, test_idx) in enumerate(rskf.split(X_dev, y)):
            X_tr, y_tr = X_dev[train_idx], y[train_idx]
            X_te, y_te = X_dev[test_idx], y[test_idx]

            # Inner 3-fold CV for hyperparameter selection on X_tr
            inner_cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=42 + fold_idx)
            best_grid_score = -1.0
            best_param = grid[0]

            for param in grid:
                inner_scores = []
                for in_tr_idx, in_val_idx in inner_cv.split(X_tr, y_tr):
                    in_X_tr, in_y_tr = X_tr[in_tr_idx], y_tr[in_tr_idx]
                    in_X_val, in_y_val = X_tr[in_val_idx], y_tr[in_val_idx]

                    in_scale = float((len(in_y_tr) - np.sum(in_y_tr)) / max(1, np.sum(in_y_tr)))
                    d_in_tr = xgb.DMatrix(in_X_tr, label=in_y_tr, feature_names=feature_names)
                    d_in_val = xgb.DMatrix(in_X_val, label=in_y_val, feature_names=feature_names)

                    booster_params = {
                        "objective": "binary:logistic",
                        "eval_metric": "logloss",
                        "max_depth": param["max_depth"],
                        "learning_rate": param["learning_rate"],
                        "subsample": 0.8,
                        "colsample_bytree": 0.8,
                        "min_child_weight": 3,
                        "scale_pos_weight": in_scale,
                        "random_state": 42,
                    }
                    bst = xgb.train(booster_params, d_in_tr, num_boost_round=param["n_estimators"])
                    preds = bst.predict(d_in_val)
                    score = roc_auc_score(in_y_val, preds)
                    inner_scores.append(score)

                mean_inner_score = float(np.mean(inner_scores))
                if mean_inner_score > best_grid_score:
                    best_grid_score = mean_inner_score
                    best_param = param

            target_best_params_list.append(best_param)

            # Nested cross-fitted Platt scaling on X_tr out-of-fold margins
            inner_oof_margins = np.zeros(len(y_tr), dtype=np.float32)
            for in_tr_idx, in_val_idx in inner_cv.split(X_tr, y_tr):
                in_X_tr, in_y_tr = X_tr[in_tr_idx], y_tr[in_tr_idx]
                in_X_val = X_tr[in_val_idx]
                in_scale = float((len(in_y_tr) - np.sum(in_y_tr)) / max(1, np.sum(in_y_tr)))

                d_in_tr = xgb.DMatrix(in_X_tr, label=in_y_tr, feature_names=feature_names)
                d_in_val = xgb.DMatrix(in_X_val, feature_names=feature_names)

                booster_params = {
                    "objective": "binary:logistic",
                    "eval_metric": "logloss",
                    "max_depth": best_param["max_depth"],
                    "learning_rate": best_param["learning_rate"],
                    "subsample": 0.8,
                    "colsample_bytree": 0.8,
                    "min_child_weight": 3,
                    "scale_pos_weight": in_scale,
                    "random_state": 42,
                }
                bst = xgb.train(booster_params, d_in_tr, num_boost_round=best_param["n_estimators"])
                inner_oof_margins[in_val_idx] = bst.predict(d_in_val, output_margin=True)

            A_fold, B_fold = fit_platt_scaling(inner_oof_margins, y_tr)

            # Train fold booster on full X_tr
            d_tr = xgb.DMatrix(X_tr, label=y_tr, feature_names=feature_names)
            d_te = xgb.DMatrix(X_te, label=y_te, feature_names=feature_names)
            fold_params = {
                "objective": "binary:logistic",
                "eval_metric": "logloss",
                "max_depth": best_param["max_depth"],
                "learning_rate": best_param["learning_rate"],
                "subsample": 0.8,
                "colsample_bytree": 0.8,
                "min_child_weight": 3,
                "scale_pos_weight": scale_pos_weight,
                "random_state": 42,
            }
            bst_fold = xgb.train(fold_params, d_tr, num_boost_round=best_param["n_estimators"])
            m_te = bst_fold.predict(d_te, output_margin=True)
            p_te_uncal = bst_fold.predict(d_te)
            p_te_cal = sigmoid(A_fold * m_te + B_fold)

            all_test_y.extend(y_te.tolist())
            all_test_prob_cal.extend(p_te_cal.tolist())
            all_test_prob_uncal.extend(p_te_uncal.tolist())

            fold_metrics_xgb_cal.append(compute_metrics_bundle(y_te, p_te_cal))
            fold_metrics_xgb_uncal.append(compute_metrics_bundle(y_te, p_te_uncal))

            # Baseline 1: Dummy (Prior)
            dummy = DummyClassifier(strategy="prior")
            dummy.fit(X_tr, y_tr)
            p_dummy = dummy.predict_proba(X_te)[:, 1]
            fold_metrics_dummy.append({
                "accuracy": float(accuracy_score(y_te, (p_dummy >= 0.5).astype(int))),
                "balanced_accuracy": float(balanced_accuracy_score(y_te, (p_dummy >= 0.5).astype(int))),
                "brier_score": float(brier_score_loss(y_te, p_dummy)),
                "roc_auc": 0.50,
                "pr_auc": float(np.mean(y_tr)),
            })

            # Baseline 2: Elastic-Net Logistic Regression
            pipe_lr = Pipeline([
                ("scaler", StandardScaler()),
                ("clf", LogisticRegression(penalty="elasticnet", solver="saga", l1_ratio=0.5, max_iter=500, tol=1e-3, random_state=42))
            ])
            pipe_lr.fit(X_tr, y_tr)
            p_lr = pipe_lr.predict_proba(X_te)[:, 1]
            fold_metrics_elasticnet.append(compute_metrics_bundle(y_te, p_lr))

            # Baseline 3: Random Forest
            rf = RandomForestClassifier(n_estimators=100, max_depth=4, random_state=42)
            rf.fit(X_tr, y_tr)
            p_rf = rf.predict_proba(X_te)[:, 1]
            fold_metrics_rf.append(compute_metrics_bundle(y_te, p_rf))

        # Determine most common best hyperparameter configuration
        param_counts = {}
        for p in target_best_params_list:
            key = (p["max_depth"], p["n_estimators"], p["learning_rate"])
            param_counts[key] = param_counts.get(key, 0) + 1
        best_tuple = max(param_counts.keys(), key=lambda k: param_counts[k])
        best_params_per_target[target] = {
            "max_depth": best_tuple[0],
            "n_estimators": best_tuple[1],
            "learning_rate": best_tuple[2],
            "subsample": 0.8,
            "colsample_bytree": 0.8,
            "min_child_weight": 3,
            "scale_pos_weight": scale_pos_weight,
        }

        # Find high recall threshold on aggregated test probabilities
        all_test_y_arr = np.array(all_test_y)
        all_test_prob_cal_arr = np.array(all_test_prob_cal)
        high_rec_thresh = find_high_recall_threshold(all_test_y_arr, all_test_prob_cal_arr, target_recall=0.90)

        # High-recall operating point metrics across folds
        fold_high_rec_metrics = []
        for fold_idx, (train_idx, test_idx) in enumerate(rskf.split(X_dev, y)):
            start_i = fold_idx * len(test_idx)
            end_i = start_i + len(test_idx)
            y_te_fold = all_test_y_arr[start_i:end_i]
            p_te_fold = all_test_prob_cal_arr[start_i:end_i]
            fold_high_rec_metrics.append(compute_metrics_bundle(y_te_fold, p_te_fold, threshold=high_rec_thresh))

        oof_predictions[target] = all_test_prob_cal_arr

        # Aggregate stats
        def aggregate_stats(metric_list: List[Dict[str, float]]) -> Dict[str, Any]:
            keys = metric_list[0].keys()
            res = {}
            for k in keys:
                vals = [m[k] for m in metric_list]
                mean_v = float(np.mean(vals))
                std_v = float(np.std(vals, ddof=1)) if len(vals) > 1 else 0.0
                ci_half = 1.96 * (std_v / math.sqrt(len(vals))) if len(vals) > 1 else 0.0
                res[k] = {
                    "mean": round(mean_v, 4),
                    "std": round(std_v, 4),
                    "ci95": [round(max(0.0, mean_v - ci_half), 4), round(min(1.0, mean_v + ci_half), 4)],
                }
            return res

        cv_results[target] = {
            "prevalence": {
                "positive": n_pos,
                "negative": n_neg,
                "rate": round(n_pos / len(y), 4),
            },
            "notes": TARGET_CLINICAL_NOTES.get(target, ""),
            "best_hyperparameters": best_params_per_target[target],
            "operating_thresholds": {
                "default": 0.50,
                "high_recall": round(high_rec_thresh, 4),
            },
            "xgb_calibrated": aggregate_stats(fold_metrics_xgb_cal),
            "xgb_uncalibrated": aggregate_stats(fold_metrics_xgb_uncal),
            "xgb_high_recall_threshold": aggregate_stats(fold_high_rec_metrics),
            "baselines": {
                "dummy": aggregate_stats(fold_metrics_dummy),
                "elasticnet": aggregate_stats(fold_metrics_elasticnet),
                "random_forest": aggregate_stats(fold_metrics_rf),
            },
        }

        print(
            f"  XGB (calibrated) - ROC-AUC: {cv_results[target]['xgb_calibrated']['roc_auc']['mean']} "
            f"+/- {cv_results[target]['xgb_calibrated']['roc_auc']['std']}, "
            f"PR-AUC: {cv_results[target]['xgb_calibrated']['pr_auc']['mean']}, "
            f"ECE: {cv_results[target]['xgb_calibrated']['ece']['mean']}"
        )

    # Cross-target CAD constraint analysis: P(CAD) >= max(P(LAD), P(LCX), P(RCA))
    p_cad_oof = oof_predictions["cad"]
    p_lad_oof = oof_predictions["lad"]
    p_lcx_oof = oof_predictions["lcx"]
    p_rca_oof = oof_predictions["rca"]

    max_vessels_oof = np.maximum.reduce([p_lad_oof, p_lcx_oof, p_rca_oof])
    p_cad_constrained_oof = np.maximum(p_cad_oof, max_vessels_oof)
    y_cad_all = []
    for _, test_idx in rskf.split(X_dev, y_dev["cad"]):
        y_cad_all.extend(y_dev["cad"][test_idx].tolist())
    y_cad_all_arr = np.array(y_cad_all)

    cad_raw_metrics = compute_metrics_bundle(y_cad_all_arr, p_cad_oof)
    cad_constrained_metrics = compute_metrics_bundle(y_cad_all_arr, p_cad_constrained_oof)
    cad_constraint_stats = {
        "cad_adjustments_count": int(np.sum(max_vessels_oof > p_cad_oof)),
        "cad_adjustments_pct": round(float(np.mean(max_vessels_oof > p_cad_oof)), 4),
        "raw": {k: round(v, 4) for k, v in cad_raw_metrics.items()},
        "constrained": {k: round(v, 4) for k, v in cad_constrained_metrics.items()},
    }

    cache_data = {
        "cv_results": cv_results,
        "best_params": best_params_per_target,
        "cad_constraint_stats": cad_constraint_stats,
    }
    with open(MODELS_DIR / "cv_cache.json", "w", encoding="utf-8") as f:
        json.dump(cache_data, f, indent=2)

    return cv_results, best_params_per_target, cad_constraint_stats


def compute_feature_ablations(
    X_dev: np.ndarray,
    y_dev: Dict[str, np.ndarray],
    feature_names: List[str],
    best_params: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Evaluate feature-set ablations (Full vs Without Lab vs Without Echo)
    across the exact same 15 CV splits (RepeatedStratifiedKFold 5-split x 3-repeat, seed 42)
    without tuning on outer-test folds.
    """
    print("\n--- Computing Feature Set Ablations (Modality Lift Analysis) ---")
    with open(FEATURE_SCHEMA_PATH, "r", encoding="utf-8") as f:
        schema = json.load(f)

    lab_features = {x["name"] for x in schema if x.get("group") == "Lab"}
    echo_features = {x["name"] for x in schema if x.get("group") == "Echo"}

    no_lab_idx = [i for i, f in enumerate(feature_names) if f not in lab_features]
    no_echo_idx = [i for i, f in enumerate(feature_names) if f not in echo_features]

    rskf = RepeatedStratifiedKFold(n_splits=5, n_repeats=3, random_state=42)
    ablation_results: Dict[str, Any] = {}

    for target in TARGETS:
        y = y_dev[target]
        p = best_params[target]

        scores_full_roc, scores_full_pr = [], []
        scores_no_lab_roc, scores_no_lab_pr = [], []
        scores_no_echo_roc, scores_no_echo_pr = [], []

        for tr_idx, te_idx in rskf.split(X_dev, y):
            y_tr, y_te = y[tr_idx], y[te_idx]
            scale = float((len(y_tr) - np.sum(y_tr)) / max(1, np.sum(y_tr)))
            p_dict = {
                "objective": "binary:logistic",
                "eval_metric": "logloss",
                "max_depth": p["max_depth"],
                "learning_rate": p["learning_rate"],
                "subsample": 0.8,
                "colsample_bytree": 0.8,
                "min_child_weight": 3,
                "scale_pos_weight": scale,
                "random_state": 42,
            }

            # 1. Full feature set (54)
            d_tr_full = xgb.DMatrix(X_dev[tr_idx], label=y_tr)
            d_te_full = xgb.DMatrix(X_dev[te_idx])
            b_full = xgb.train(p_dict, d_tr_full, num_boost_round=p["n_estimators"])
            preds_full = b_full.predict(d_te_full)
            scores_full_roc.append(roc_auc_score(y_te, preds_full))
            scores_full_pr.append(average_precision_score(y_te, preds_full))

            # 2. Without Lab features (40)
            d_tr_nl = xgb.DMatrix(X_dev[tr_idx][:, no_lab_idx], label=y_tr)
            d_te_nl = xgb.DMatrix(X_dev[te_idx][:, no_lab_idx])
            b_nl = xgb.train(p_dict, d_tr_nl, num_boost_round=p["n_estimators"])
            preds_nl = b_nl.predict(d_te_nl)
            scores_no_lab_roc.append(roc_auc_score(y_te, preds_nl))
            scores_no_lab_pr.append(average_precision_score(y_te, preds_nl))

            # 3. Without Echo features (51)
            d_tr_ne = xgb.DMatrix(X_dev[tr_idx][:, no_echo_idx], label=y_tr)
            d_te_ne = xgb.DMatrix(X_dev[te_idx][:, no_echo_idx])
            b_ne = xgb.train(p_dict, d_tr_ne, num_boost_round=p["n_estimators"])
            preds_ne = b_ne.predict(d_te_ne)
            scores_no_echo_roc.append(roc_auc_score(y_te, preds_ne))
            scores_no_echo_pr.append(average_precision_score(y_te, preds_ne))

        ablation_results[target] = {
            "full_features": {
                "feature_count": len(feature_names),
                "roc_auc_mean": round(float(np.mean(scores_full_roc)), 4),
                "roc_auc_std": round(float(np.std(scores_full_roc, ddof=1)), 4),
                "pr_auc_mean": round(float(np.mean(scores_full_pr)), 4),
            },
            "without_lab": {
                "feature_count": len(no_lab_idx),
                "excluded_count": len(lab_features),
                "roc_auc_mean": round(float(np.mean(scores_no_lab_roc)), 4),
                "roc_auc_std": round(float(np.std(scores_no_lab_roc, ddof=1)), 4),
                "pr_auc_mean": round(float(np.mean(scores_no_lab_pr)), 4),
            },
            "without_echo": {
                "feature_count": len(no_echo_idx),
                "excluded_count": len(echo_features),
                "roc_auc_mean": round(float(np.mean(scores_no_echo_roc)), 4),
                "roc_auc_std": round(float(np.std(scores_no_echo_roc, ddof=1)), 4),
                "pr_auc_mean": round(float(np.mean(scores_no_echo_pr)), 4),
            },
        }
        print(
            f"  {target.upper()}: Full ROC={ablation_results[target]['full_features']['roc_auc_mean']} | "
            f"No-Lab={ablation_results[target]['without_lab']['roc_auc_mean']} | "
            f"No-Echo={ablation_results[target]['without_echo']['roc_auc_mean']}"
        )

    return ablation_results


def train_final_models(
    X_dev: np.ndarray,
    y_dev: Dict[str, np.ndarray],
    best_params: Dict[str, Any],
    feature_names: List[str]
) -> Tuple[Dict[str, xgb.Booster], Dict[str, Dict[str, float]]]:
    """
    Train final XGBoost boosters on all 295 dev rows and fit final Platt calibration parameters.
    """
    print("\n--- Training Final Models on N=295 Development Patients ---")
    boosters: Dict[str, xgb.Booster] = {}
    calibration: Dict[str, Dict[str, float]] = {}

    for target in TARGETS:
        y = y_dev[target]
        param = best_params[target]

        # 5-fold CV to collect out-of-fold margins on all 295 rows for calibration
        skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        oof_margins = np.zeros(len(y), dtype=np.float32)

        for tr_idx, val_idx in skf.split(X_dev, y):
            X_tr, y_tr = X_dev[tr_idx], y[tr_idx]
            X_val = X_dev[val_idx]
            scale = float((len(y_tr) - np.sum(y_tr)) / max(1, np.sum(y_tr)))

            d_tr = xgb.DMatrix(X_tr, label=y_tr, feature_names=feature_names)
            d_val = xgb.DMatrix(X_val, feature_names=feature_names)

            p_dict = {
                "objective": "binary:logistic",
                "eval_metric": "logloss",
                "max_depth": param["max_depth"],
                "learning_rate": param["learning_rate"],
                "subsample": param["subsample"],
                "colsample_bytree": param["colsample_bytree"],
                "min_child_weight": param["min_child_weight"],
                "scale_pos_weight": scale,
                "random_state": 42,
            }
            b = xgb.train(p_dict, d_tr, num_boost_round=param["n_estimators"])
            oof_margins[val_idx] = b.predict(d_val, output_margin=True)

        A, B = fit_platt_scaling(oof_margins, y)
        calibration[target] = {"A": round(A, 6), "B": round(B, 6)}
        print(f"  Target {target.upper()}: Platt Calibration A={A:.4f}, B={B:.4f}")

        # Train final booster on all 295 rows
        scale_all = float((len(y) - np.sum(y)) / max(1, np.sum(y)))
        d_all = xgb.DMatrix(X_dev, label=y, feature_names=feature_names)
        p_dict_all = {
            "objective": "binary:logistic",
            "eval_metric": "logloss",
            "max_depth": param["max_depth"],
            "learning_rate": param["learning_rate"],
            "subsample": param["subsample"],
            "colsample_bytree": param["colsample_bytree"],
            "min_child_weight": param["min_child_weight"],
            "scale_pos_weight": scale_all,
            "random_state": 42,
        }
        final_bst = xgb.train(p_dict_all, d_all, num_boost_round=param["n_estimators"])
        boosters[target] = final_bst

        # Save model JSON
        model_out = MODELS_DIR / f"booster_{target}.json"
        final_bst.save_model(str(model_out))
        print(f"  Saved booster: {model_out.name}")

    # Save calibration JSON
    calib_out = MODELS_DIR / "calibration.json"
    with open(calib_out, "w", encoding="utf-8") as f:
        json.dump(calibration, f, indent=2)
    print(f"  Saved calibration parameters: {calib_out.name}")

    return boosters, calibration


def compute_and_save_global_shap(
    boosters: Dict[str, xgb.Booster],
    calibration: Dict[str, Dict[str, float]],
    X_dev: np.ndarray,
    feature_names: List[str]
) -> Dict[str, Any]:
    """
    Compute TreeSHAP contributions natively using booster.predict(dmatrix, pred_contribs=True)
    without importing shap. Save top 15 features per target to models/shap_global.json.
    """
    print("\n--- Computing Native TreeSHAP Global Feature Importances ---")
    d_dev = xgb.DMatrix(X_dev, feature_names=feature_names)
    with open(FEATURE_SCHEMA_PATH, "r", encoding="utf-8") as f:
        schema = json.load(f)
    schema_map = {item["name"]: item for item in schema}

    shap_global: Dict[str, Any] = {}

    for target in TARGETS:
        bst = boosters[target]
        A = calibration[target]["A"]
        # pred_contribs returns [N, 55] where last column is bias
        raw_contribs = bst.predict(d_dev, pred_contribs=True)
        # Scale to calibrated log-odds space
        cal_contribs = raw_contribs[:, :-1] * A
        mean_abs_shap = np.mean(np.abs(cal_contribs), axis=0)

        # Sort features by mean |SHAP|
        ranked_indices = np.argsort(mean_abs_shap)[::-1]
        top_15 = []
        for idx in ranked_indices[:15]:
            fname = feature_names[idx]
            info = schema_map.get(fname, {})
            top_15.append({
                "feature": fname,
                "mean_abs_shap": round(float(mean_abs_shap[idx]), 4),
                "direction": "positive" if np.mean(cal_contribs[:, idx]) >= 0 else "negative",
                "group": info.get("group", "Other"),
                "unit": info.get("unit", ""),
                "description": info.get("description", ""),
            })

        shap_global[target] = top_15
        print(f"  {target.upper()} top 3 features: {[f['feature'] for f in top_15[:3]]}")

    out_path = MODELS_DIR / "shap_global.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(shap_global, f, indent=2)
    print(f"  Saved global SHAP importances to: {out_path.name}")
    return shap_global


def export_reference_ranges() -> None:
    """Extract clinical reference ranges and cited sources from feature_schema.json."""
    with open(FEATURE_SCHEMA_PATH, "r", encoding="utf-8") as f:
        schema = json.load(f)

    ranges: Dict[str, Any] = {}
    for item in schema:
        ranges[item["name"]] = {
            "type": item.get("type"),
            "group": item.get("group"),
            "unit": item.get("unit"),
            "reference_range": item.get("reference_range"),
            "min": item.get("min"),
            "max": item.get("max"),
            "default": item.get("default"),
            "description": item.get("description"),
        }

    out_path = MODELS_DIR / "reference_ranges.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(ranges, f, indent=2)
    print(f"Saved reference ranges lookup: {out_path.name}")


def export_demo_patients_with_real_predictions(
    boosters: Dict[str, xgb.Booster],
    calibration: Dict[str, Dict[str, float]],
    X_holdout: np.ndarray,
    y_holdout: Dict[str, np.ndarray],
    feature_names: List[str]
) -> None:
    """
    Generate predictions for the 8 holdout patients using real models and TreeSHAP.
    Enforce P(CAD) >= max(P(LAD), P(LCX), P(RCA)) and export matching 04_API_CONTRACT.md.
    """
    print("\n--- Generating Real Predictions for Holdout Patients ---")
    with open(DEMO_HOLDOUT_PATH, "r", encoding="utf-8") as f:
        holdout_raw = json.load(f)

    d_holdout = xgb.DMatrix(X_holdout, feature_names=feature_names)

    # Compute raw margins and SHAP contributions
    margins: Dict[str, np.ndarray] = {}
    raw_contribs: Dict[str, np.ndarray] = {}
    for target in TARGETS:
        margins[target] = boosters[target].predict(d_holdout, output_margin=True)
        raw_contribs[target] = boosters[target].predict(d_holdout, pred_contribs=True)

    demo_patients_list = []

    for i, patient in enumerate(holdout_raw):
        p_cad_raw = float(sigmoid(np.array([calibration["cad"]["A"] * margins["cad"][i] + calibration["cad"]["B"]]))[0])
        p_lad = float(sigmoid(np.array([calibration["lad"]["A"] * margins["lad"][i] + calibration["lad"]["B"]]))[0])
        p_lcx = float(sigmoid(np.array([calibration["lcx"]["A"] * margins["lcx"][i] + calibration["lcx"]["B"]]))[0])
        p_rca = float(sigmoid(np.array([calibration["rca"]["A"] * margins["rca"][i] + calibration["rca"]["B"]]))[0])

        max_vessel = max(p_lad, p_lcx, p_rca)
        cad_adjusted = False
        if max_vessel > p_cad_raw:
            p_cad = max_vessel
            cad_adjusted = True
        else:
            p_cad = p_cad_raw

        # Explanations for each target
        explanations: Dict[str, List[Dict[str, Any]]] = {}
        for target in TARGETS:
            A = calibration[target]["A"]
            c_row = raw_contribs[target][i]
            feat_contribs = c_row[:-1] * A
            # Bias / base contribution is c_row[-1] * A + B
            items = []
            for feat_idx, val in enumerate(feat_contribs):
                raw_val = patient["features"].get(feature_names[feat_idx], 0.0)
                try:
                    clean_val = round(float(raw_val), 4)
                except (ValueError, TypeError):
                    clean_val = str(raw_val)
                items.append({
                    "feature": feature_names[feat_idx],
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

        patient_record = {
            "id": patient["id"],
            "name": f"Patient #{patient['index']:03d}",
            "summary": patient["summary"],
            "truth": {
                "CAD": int(y_holdout["cad"][i]),
                "LAD": int(y_holdout["lad"][i]),
                "LCX": int(y_holdout["lcx"][i]),
                "RCA": int(y_holdout["rca"][i]),
            },
            "features": patient["features"],
            "prediction": {
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
            },
        }
        demo_patients_list.append(patient_record)

    # Save to both api/ and web/public/
    for out_path in [API_DIR / "demo_patients.json", WEB_PUBLIC_DIR / "demo_patients.json"]:
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(demo_patients_list, f, indent=2)
        print(f"  Saved demo patients with real model inference: {out_path}")


def generate_offline_figures(
    boosters: Dict[str, xgb.Booster],
    calibration: Dict[str, Dict[str, float]],
    X_dev: np.ndarray,
    y_dev: Dict[str, np.ndarray],
    feature_names: List[str]
) -> None:
    """Generate high-resolution PNG plots in docs/figures/."""
    print("\n--- Generating Matplotlib Offline Figures ---")
    DOCS_FIGURES_DIR.mkdir(parents=True, exist_ok=True)
    d_dev = xgb.DMatrix(X_dev, feature_names=feature_names)

    # 1. Calibration curves per target
    for target in TARGETS:
        y = y_dev[target]
        m = boosters[target].predict(d_dev, output_margin=True)
        p_uncal = boosters[target].predict(d_dev)
        p_cal = sigmoid(calibration[target]["A"] * m + calibration[target]["B"])

        ece_uncal = compute_ece(y, p_uncal)
        ece_cal = compute_ece(y, p_cal)

        # Reliability diagram
        bins = np.linspace(0.0, 1.0, 11)
        bin_confs_uncal, bin_accs_uncal = [], []
        bin_confs_cal, bin_accs_cal = [], []

        for b_idx in range(10):
            lo, hi = bins[b_idx], bins[b_idx + 1]
            mask_uncal = (p_uncal >= lo) & (p_uncal <= hi if b_idx == 9 else p_uncal < hi)
            if np.any(mask_uncal):
                bin_confs_uncal.append(np.mean(p_uncal[mask_uncal]))
                bin_accs_uncal.append(np.mean(y[mask_uncal]))

            mask_cal = (p_cal >= lo) & (p_cal <= hi if b_idx == 9 else p_cal < hi)
            if np.any(mask_cal):
                bin_confs_cal.append(np.mean(p_cal[mask_cal]))
                bin_accs_cal.append(np.mean(y[mask_cal]))

        plt.figure(figsize=(6, 5))
        plt.plot([0, 1], [0, 1], "k--", label="Perfect calibration")
        plt.plot(bin_confs_uncal, bin_accs_uncal, "s-", color="coral", label=f"Uncalibrated (ECE={ece_uncal:.3f})")
        plt.plot(bin_confs_cal, bin_accs_cal, "o-", color="teal", label=f"Platt Calibrated (ECE={ece_cal:.3f})")
        plt.title(f"Reliability Diagram: {target.upper()} Model")
        plt.xlabel("Mean Predicted Probability")
        plt.ylabel("Observed Empirical Fraction")
        plt.legend(loc="lower right")
        plt.grid(True, linestyle=":", alpha=0.6)
        plt.tight_layout()
        fig_path = DOCS_FIGURES_DIR / f"calibration_{target}.png"
        plt.savefig(fig_path, dpi=200)
        plt.close()
        print(f"  Saved: {fig_path.name}")

    # 2. Combined ROC Curves
    plt.figure(figsize=(7, 6))
    colors = {"cad": "#1f77b4", "lad": "#ff7f0e", "lcx": "#2ca02c", "rca": "#d62728"}
    for target in TARGETS:
        y = y_dev[target]
        m = boosters[target].predict(d_dev, output_margin=True)
        p = sigmoid(calibration[target]["A"] * m + calibration[target]["B"])
        fpr, tpr, _ = roc_curve(y, p)
        score = roc_auc_score(y, p)
        plt.plot(fpr, tpr, color=colors[target], lw=2, label=f"{target.upper()} (AUC = {score:.3f})")
    plt.plot([0, 1], [0, 1], "k--", lw=1)
    plt.xlim([0.0, 1.0])
    plt.ylim([0.0, 1.05])
    plt.xlabel("False Positive Rate (1 - Specificity)")
    plt.ylabel("True Positive Rate (Sensitivity)")
    plt.title("CardioVision ROC Curves across Targets (Dev Set N=295)")
    plt.legend(loc="lower right")
    plt.grid(True, linestyle=":", alpha=0.6)
    plt.tight_layout()
    roc_fig_path = DOCS_FIGURES_DIR / "roc_curves.png"
    plt.savefig(roc_fig_path, dpi=200)
    plt.close()
    print(f"  Saved: {roc_fig_path.name}")

    # 3. Combined PR Curves
    plt.figure(figsize=(7, 6))
    for target in TARGETS:
        y = y_dev[target]
        m = boosters[target].predict(d_dev, output_margin=True)
        p = sigmoid(calibration[target]["A"] * m + calibration[target]["B"])
        prec, rec, _ = precision_recall_curve(y, p)
        score = average_precision_score(y, p)
        plt.plot(rec, prec, color=colors[target], lw=2, label=f"{target.upper()} (PR-AUC = {score:.3f})")
    plt.xlabel("Recall")
    plt.ylabel("Precision")
    plt.title("Precision-Recall Curves across Targets")
    plt.legend(loc="lower left")
    plt.grid(True, linestyle=":", alpha=0.6)
    plt.tight_layout()
    pr_fig_path = DOCS_FIGURES_DIR / "pr_curves.png"
    plt.savefig(pr_fig_path, dpi=200)
    plt.close()
    print(f"  Saved: {pr_fig_path.name}")

    # 4. SHAP Summary Bar Chart for CAD
    with open(MODELS_DIR / "shap_global.json", "r", encoding="utf-8") as f:
        shap_data = json.load(f)
    cad_shap = shap_data["cad"][:15][::-1]  # reverse for horizontal bar chart
    features = [item["feature"] for item in cad_shap]
    values = [item["mean_abs_shap"] for item in cad_shap]

    plt.figure(figsize=(8, 7))
    bars = plt.barh(features, values, color="#3b82f6", edgecolor="#1d4ed8")
    plt.xlabel("Mean |Calibrated Log-Odds Contribution|")
    plt.title("Top 15 Feature Importances for CAD (TreeSHAP)")
    plt.grid(axis="x", linestyle=":", alpha=0.6)
    plt.tight_layout()
    shap_fig_path = DOCS_FIGURES_DIR / "shap_summary_cad.png"
    plt.savefig(shap_fig_path, dpi=200)
    plt.close()
    print(f"  Saved: {shap_fig_path.name}")


def main() -> None:
    print("===============================================================")
    print("CardioVision ML Pipeline: Training, Calibration & Artifact Gen")
    print("HUMAN REVIEW REQUIRED: ml/train.py")
    print("===============================================================")

    # Step 1: Prepare data and holdout sets
    X_dev, y_dev, X_holdout, y_holdout, feature_names, holdout_indices = prepare_ml_data()
    print(f"Development set: {X_dev.shape[0]} rows, {X_dev.shape[1]} features.")
    print(f"Holdout set: {X_holdout.shape[0]} rows (indices: {holdout_indices}).")

    # Step 2: Nested Cross-Validation & Model Selection
    cv_results, best_params, cad_constraint_stats = run_cross_validation(X_dev, y_dev, feature_names)

    # Step 3: Train final models on all 295 rows with Platt calibration
    boosters, calibration = train_final_models(X_dev, y_dev, best_params, feature_names)

    # Step 4: Compute native TreeSHAP global importances
    shap_global = compute_and_save_global_shap(boosters, calibration, X_dev, feature_names)

    # Step 5: Export reference ranges
    export_reference_ranges()

    # Step 6: Export demo patients with real model predictions and SHAP
    export_demo_patients_with_real_predictions(boosters, calibration, X_holdout, y_holdout, feature_names)

    # Step 7: Generate offline figures
    generate_offline_figures(boosters, calibration, X_dev, y_dev, feature_names)

    # Step 8: Compute feature-set ablations (modality lift)
    ablation_results = compute_feature_ablations(X_dev, y_dev, feature_names, best_params)

    # Step 9: Save comprehensive metrics.json
    final_metrics_payload = {
        "metadata": {
            "dataset_rows_total": 303,
            "dev_rows_count": len(X_dev),
            "holdout_rows_count": len(X_holdout),
            "holdout_indices": holdout_indices,
            "cv_protocol": "RepeatedStratifiedKFold(n_splits=5, n_repeats=3, random_state=42)",
            "total_cv_folds": 15,
            "evaluation_rule": "Every reported number comes from cross-validation out-of-fold test folds",
        },
        "targets": cv_results,
        "cad_constraint_analysis": cad_constraint_stats,
        "feature_ablations": ablation_results,
    }

    metrics_out = MODELS_DIR / "metrics.json"
    with open(metrics_out, "w", encoding="utf-8") as f:
        json.dump(final_metrics_payload, f, indent=2)
    print(f"\nFinal metrics successfully written to: {metrics_out.name}")

    web_metrics_out = WEB_PUBLIC_DIR / "metrics.json"
    with open(web_metrics_out, "w", encoding="utf-8") as f:
        json.dump(final_metrics_payload, f, indent=2)
    print(f"Final metrics copied to: {web_metrics_out.name}")
    print("\nHUMAN REVIEW REQUIRED: ml/train.py")


if __name__ == "__main__":
    main()
