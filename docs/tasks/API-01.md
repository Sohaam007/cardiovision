# API-01 FastAPI serving with contract
Owner: Soham   Status: done

Reads: docs/04_API_CONTRACT.md, docs/03_ML_SPEC.md
Do:
- Implement /health, /schema, /demo, /predict per contract; load models once at startup.
- Use pred_contribs for SHAP (no shap import); top 15 + (other).
- Enforce P(CAD) >= max(vessel probs); validate inputs with pydantic; CORS.
- Add tests/test_api_parity.py: API probabilities equal offline model probabilities for demo patients.
Acceptance: pytest passes; curl /predict on a demo patient returns the contract shape; cold start under 10 s locally.
Out of scope: UI, 3D
