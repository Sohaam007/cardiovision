"""tests/test_api_contract.py: Automated test suite validating API contract and endpoints."""

from pathlib import Path
import sys
import pytest
from fastapi.testclient import TestClient

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from api.main import app

client = TestClient(app)


def test_health_endpoint():
    """Verify GET /health returns status ok and model version."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "model_version" in data


def test_schema_endpoint():
    """Verify GET /schema returns 54 documented features."""
    response = client.get("/schema")
    assert response.status_code == 200
    schema = response.json()
    assert isinstance(schema, list)
    assert len(schema) == 54
    sample = schema[0]
    for key in ["name", "type", "group", "min", "max", "default", "unit", "description"]:
        assert key in sample


def test_demo_endpoint():
    """Verify GET /demo returns demo patients list matching contract."""
    response = client.get("/demo")
    assert response.status_code == 200
    patients = response.json()
    assert isinstance(patients, list)
    assert len(patients) >= 8

    patient = patients[0]
    assert "id" in patient
    assert "truth" in patient
    assert "features" in patient
    assert "prediction" in patient
    pred = patient["prediction"]
    assert "cad" in pred
    assert "vessels" in pred
    assert "LAD" in pred["vessels"]
    assert "LCX" in pred["vessels"]
    assert "RCA" in pred["vessels"]
    assert "explanations" in pred


def test_predict_contract_shape():
    """Verify POST /predict returns the exact contract structure."""
    payload = {
        "features": {
            "Age": 62,
            "Sex": "Male",
            "HTN": 1,
            "LDL": 130,
            "EF-TTE": 45,
            "BP": 140,
        }
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()

    # CAD level checks
    assert "cad" in data
    assert "prob" in data["cad"]
    assert "label" in data["cad"]
    assert "ci" in data["cad"]
    assert len(data["cad"]["ci"]) == 2

    # Vessel level checks
    assert "vessels" in data
    for vessel in ["LAD", "LCX", "RCA"]:
        assert vessel in data["vessels"]
        assert "prob" in data["vessels"][vessel]
        assert "label" in data["vessels"][vessel]

    # Server side consistency: P(CAD) >= max(P(LAD), P(LCX), P(RCA))
    vessel_max = max(data["vessels"][v]["prob"] for v in ["LAD", "LCX", "RCA"])
    assert data["cad"]["prob"] >= round(vessel_max, 4) - 1e-4

    # Explanations check
    assert "explanations" in data
    for target in ["CAD", "LAD", "LCX", "RCA"]:
        assert target in data["explanations"]
        items = data["explanations"][target]
        assert isinstance(items, list)
        if len(items) > 0:
            assert "feature" in items[0]
            assert "value" in items[0]
            assert "shap" in items[0]

    # Meta checks
    assert "meta" in data
    assert data["meta"]["model_version"] == "v1"
    assert "explanation_space" in data["meta"]


def test_predict_unknown_key_rejection():
    """Verify that unknown keys in request return 422 Unprocessable Entity."""
    payload = {
        "features": {
            "Age": 55,
            "UnknownFeatureKey": 999,
        }
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 422
    err = response.json()
    assert "Unknown feature key" in err["detail"]


def test_predict_partial_features_uses_defaults():
    """Verify that partial features dictionary is accepted and missing fields use defaults."""
    payload = {"features": {"Age": 60}}
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "cad" in data
    assert 0.0 <= data["cad"]["prob"] <= 1.0


def test_no_shap_import_in_api():
    """Verify hard invariant: zero shap import anywhere in api/."""
    api_dir = PROJECT_ROOT / "api"
    for py_file in api_dir.glob("*.py"):
        content = py_file.read_text(encoding="utf-8")
        assert "import shap" not in content, f"Forbidden 'import shap' found in {py_file}"
        assert "from shap" not in content, f"Forbidden 'from shap' found in {py_file}"
