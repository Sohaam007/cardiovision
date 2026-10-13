# CardioVision Development Workflow

This document specifies the standard development and automated verification workflow for CardioVision (Track A: Cardiovascular Risk Visualization & Prediction).

## 1. Operating Model

- Single lead implementer workflow with automated checks. No recursive multi-agent review loops or adversarial reviewer/challenger/auditor gates.
- Speed and correctness prioritized for hackathon delivery.
- All code changes are verified locally before committing.
- Keep commits small, descriptive, and keep the main branch deployable at all times.

## 2. Automated Verification Suite

Run automated checks before pushing:
1. **Backend and ML test suite:**
   ```bash
   pytest -v
   ```
   Must pass 100% with zero failures.
2. **Frontend lint and build:**
   ```bash
   cd web
   npm run lint    # runs tsc --noEmit
   npm run build   # runs tsc && vite build
   ```
   Must compile and bundle with zero errors.
3. **ML data and model verification:**
   ```bash
   python ml/features.py
   ```
   Must run cleanly with zero leakage detected.

## 3. Human Review Marker

A human review marker is required whenever modifying:
- `ml/train.py`
- `ml/evaluate` code
- `tests/test_no_leakage.py`

Whenever touching any of these files, print:
`HUMAN REVIEW REQUIRED: <file>`
in the implementation summary so the human developer can inspect the logic.

## 4. Hard Invariants

- Exclude LAD, LCX, RCA, Cath from input features for every target.
- No `shap` import in `api/` or production runtime dependencies.
- Never imply lesion location along vessels. Color whole vessels by probability only.
- Freeze API contract (`docs/04_API_CONTRACT.md`); log any required changes in `docs/DECISIONS.md`.
- No em dashes in documentation or comments.
- All report and doc metrics must trace directly to `models/metrics.json`.
