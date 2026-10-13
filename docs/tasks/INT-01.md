# INT-01 Integration and fallback
Owner: Soumyadeep   Status: todo
Reads: docs/04_API_CONTRACT.md, docs/07_DEPLOY.md
Do:
- Wire /predict to store -> 3D + cards + SHAP; cancel stale requests.
- 8 s timeout -> demo mode from public/demo_patients.json.
- Verify the colors in 3D equal the numbers on cards for 5 patients (screenshot test).
Acceptance: End-to-end works on the deployed URLs; killing the API switches to demo mode cleanly.
Out of scope: New features
