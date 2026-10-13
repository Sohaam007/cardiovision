# 04 API Contract (SOURCE OF TRUTH, frozen at hour 14)

Changes require an entry in DECISIONS.md and a heads-up to the whole team.

## Endpoints
- `GET /health` -> `{"status":"ok","model_version":"v1"}`
- `GET /schema` -> contents of `feature_schema.json` (feature name, type, min, max, default, unit, reference range)
- `GET /demo` -> demo patients (same as `demo_patients.json`)
- `POST /predict`

## POST /predict request
```json
{ "features": { "Age": 62, "Sex": "Male", "HTN": 1, "LDL": 130, "EF-TTE": 45 } }
```
Missing optional features are filled from defaults in `feature_schema.json`. Unknown keys return 422.

## Response
```json
{
  "cad":     {"prob": 0.83, "label": 1, "ci": [0.71, 0.91]},
  "vessels": {"LAD": {"prob": 0.74, "label": 1},
              "LCX": {"prob": 0.31, "label": 0},
              "RCA": {"prob": 0.52, "label": 1}},
  "explanations": {
    "CAD": [{"feature": "Age", "value": 62, "shap": 0.12}],
    "LAD": [], "LCX": [], "RCA": []
  },
  "meta": {"model_version": "v1", "disclaimer_id": "d1", "thresholds": {"CAD": 0.5}}
}
```
- `shap` values are in log-odds, sorted by absolute value, top 15 + `"(other)"` bucket.
- `ci` is a model-level uncertainty from CV/bootstrap, not a per-patient guarantee.
- `P(CAD) >= max(vessel probs)` is enforced server-side.

## Fallback
If `/predict` fails or times out (8 s), the UI loads `public/demo_patients.json` (same response shape per patient) and shows a "demo mode" banner.

## CORS
Allow the Vercel production + preview origins and `http://localhost:5173`.
