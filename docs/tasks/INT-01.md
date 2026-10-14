# INT-01 Integration and fallback
Owner: Soumyadeep   Status: done
Reads: docs/04_API_CONTRACT.md, docs/07_DEPLOY.md
Do:
- Wire /predict to store -> 3D + cards + SHAP; cancel stale requests.
- 8 s timeout -> demo mode from public/demo_patients.json.
- Verify the colors in 3D equal the numbers on cards for 5 patients (screenshot test).
Acceptance: End-to-end works on the deployed URLs; killing the API switches to demo mode cleanly.
Out of scope: New features

Completed:
- /predict wired to Zustand store updating 3D vessel colors, risk cards, and SHAP waterfall chart.
- API client enforces 8000 ms timeout via AbortController; stale in-flight requests cancelled.
- Bundled public/demo_patients.json contains 8 holdout patients matching API contract schema.
- Automated tests verify 3D vessel colors match card percentages in standard and colorblind palettes across all benchmark cases.
- Simulated API offline state triggers graceful demo mode fallback with informative status badge and uninterrupted 3D rendering.

