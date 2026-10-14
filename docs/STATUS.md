# STATUS (append one line per finished task)
Format: `YYYY-MM-DD HH:MM | ID | person | done/partial/blocked | note`
2026-10-14 00:18 | DOC-WF | Soham | done | PR #3 adversarial review protocol and unverified log merged into main
2026-10-14 01:10 | 3D-01 | Soumyadeep | done | Interactive 3D heart scene with procedural vessels, demand frameloop, and debug recoloring merged into main
2026-10-14 02:35 | ML-01 | Soham | done | 54 features cleaned (303 rows), targets derived, zero leakage enforced via 41 tests, schema exported, PR #5 merged
2026-10-14 03:40 | ML-02 | Soham | done | 4 targets x 4 models evaluated via 5-fold x 3-repeat nested CV on N=295 rows with baseline comparisons
2026-10-14 03:41 | ML-03 | Soham | done | 4 XGBoost boosters saved, Platt calibration fitted, TreeSHAP global importances and offline figures exported
2026-10-14 03:42 | API-01 | Soham | done | Real model serving and TreeSHAP in api/inference.py with sub-15ms latency, mock fallback, and parity tests
2026-10-14 03:46 | UI-01 | Soumyadeep | done | PersonaPicker with 8 holdout patients, ClinicalPanel tabs (TreeSHAP, Sensitivity sliders, ClinicalForm, 3D controls), SafetyModal disclaimer merged
2026-10-14 03:48 | DOC-01 | Soham | done | 03_ML_SPEC.md, 07_DEPLOY.md, 10_REPORT_OUTLINE.md, and 11_VIDEO_SCRIPT.md populated with verified numbers from metrics.json
2026-10-14 10:25 | 3D-02 | Soumyadeep | done | 3D interactions, camera presets (Anterior, Left Lateral LCX, Posterior), proxy picking, risk HUD, 2D WebGL fallback, UI wording fixes; measured 22.2 FPS under 4x CPU throttle (0 FPS idle demand loop); 4 screenshots generated
2026-10-14 11:25 | INT-01 | Soumyadeep | done | /predict wired to 3D and risk cards; 8s timeout with AbortController; 8 holdout patients with 3D color parity; offline fallback
2026-10-14 11:58 | UI-02-Form | Adin | done | ClinicalForm enhanced with collapsible tabs, min/max validation messages, reference ranges, binary toggles, and Reset action
2026-10-14 12:01 | UI-02-Explainability | Adin | done | RiskExplainer Recharts horizontal bar chart (top 10 + other), log-odds axis, tooltips, and measurement cards
2026-10-14 12:03 | UI-02-Sensitivity | Adin | done | SensitivityPanel directional arrows and probability change badges vs baseline, 300ms debounce, and reset-to-baseline
2026-10-14 12:11 | UI-02-Cards-Picker | Adin | done | Overall CAD card (prob, label, threshold, CI) and 3 vessel cards with 3D color matching and camera focus; 8-patient PersonaPicker
2026-10-14 12:26 | UI-02-ModelInfo | Adin | done | ModelInfoDrawer slide-over with CV metrics table, Platt scaling note, clinical limitations, and asset licenses
