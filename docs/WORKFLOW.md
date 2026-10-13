# CardioVision Development & PR Review Workflow

This document specifies the standard branching, pull request, and adversarial review workflows for CardioVision (Track A: Cardiovascular Risk Visualization & Prediction).

---

## 1. Branching Strategy

- All production-ready work merges into `main`.
- Branch naming convention:
  - Feature branches: `feat/<task-id>-<short-description>` (e.g. `feat/ml-01-features-leakage`, `feat/3d-01-scene`)
  - Fix branches: `fix/<task-id>-<short-description>`
  - Documentation/Ops: `docs/<short-description>` or `ops/<task-id>-<short-description>`
- Exactly **one task card per PR**. If a PR attempts two tasks, split it.

---

## 2. Task Card Lifecycle

Every task card lives in `docs/tasks/<ID>.md`:
1. Check assigned owner in the card or `README_START_HERE.md`.
2. Implement **only** the scope defined under `Do:`.
3. Verify all requirements under `Acceptance:` pass locally.
4. Open a pull request against `main` using GitHub CLI or web UI.
5. Once merged, append a line to `docs/STATUS.md`:
   `YYYY-MM-DD HH:MM | <TASK_ID> | <PERSON> | done | <SHORT_NOTE>`

---

## 3. Adversarial PR Review Protocol

Review PRs as an adversary, not as a formality. Claims made in PR descriptions are checkable—check them by execution.

### Step 1: Independent Local Execution
Never trust PR descriptions or green badges. Check out the branch and run the checks locally:
- **Backend & ML tests:**
  ```bash
  pytest -v
  ```
  Must pass 100% without warnings or failures.
- **Frontend type-check & build:**
  ```bash
  cd web && npm run lint    # runs tsc --noEmit
  npm run build            # runs tsc && vite build
  ```
  Must compile and bundle with zero errors.
- **ML data / model checks (if ML files modified):**
  ```bash
  python ml/features.py    # confirms shapes and zero leakage
  ```

### Step 2: Task Card Alignment & Author Check
- Match the task ID in the PR title to `docs/tasks/<ID>.md`.
- Verify the PR author matches the assigned Owner (or notes who delegated it).
- Verify work is strictly within the "Do" scope; reject out-of-scope creep.

### Step 3: Mutation Testing (Break-Before-Merge)
For every newly introduced test:
1. Intentionally break the code or condition it guards.
2. Run `pytest` or `npm test` and verify the test fails with red output.
3. Revert the intentional break and verify it passes again.
A test that cannot fail is an illusion of protection.

### Step 4: Adversarial Attack Checks
Actively probe the code against project-specific failure modes:
- **Leakage attack:** Inject casing variants (`lad`, `Cath `, `CAD`, `lcx`) into candidate feature lists; confirm `test_no_leakage.py` catches them.
- **Lesion location illusion:** Confirm no 3D shader, mesh texture, or UI label implies lesion location along a vessel. The dataset has no segmental location data—vessels must be colored strictly by predicted probability across their entire geometry.
- **Probability consistency:** Verify that `P(CAD) >= max(P(LAD), P(LCX), P(RCA))` is never violated.
- **Production dependency check:** Ensure `import shap` is absent from `api/` and `requirements.txt`. TreeSHAP in production must use XGBoost `pred_contribs=True` or LightGBM `pred_contrib=True`.
- **Metrics honesty:** Confirm that no accuracy or AUC values are invented or hardcoded; all metrics must trace to `models/metrics.json`.

### Step 5: Architecture & Contract Invariants
- Verify `docs/04_API_CONTRACT.md` is untouched unless an architectural decision was logged in `docs/DECISIONS.md` and approved by the team.
- Confirm `main` remains demoable (fallback demo mode functions offline).
- Verify comments explain *why*, not *what*. Ensure no dead code or speculative generality.

### Step 6: PR Feedback, Fixes, and Merge
Follow this exact sequence:
1. **Comment before edit:** Post review findings with evidence to the PR using GitHub CLI:
   ```bash
   gh pr review <NUMBER> --comment -b "Findings..."
   ```
2. **Fix on branch:** If issues are objective, push fixes directly to the branch with clear commit messages explaining what was changed and naming any author override.
3. **Re-verify:** Re-run `pytest -v` and `cd web && npm run build`.
4. **Merge and cleanup:**
   ```bash
   gh pr merge <NUMBER> --squash --delete-branch
   git checkout main
   git pull origin main
   ```
5. **Verify clean main:** Run `pytest -v` and `cd web && npm run build` on fresh `main`.

### Step 7: Log Unverified Items & Status
- Anything that cannot be verified locally (e.g. physical low-end GPU framerates, live hosting wakeups, clinician reviews) must be logged in `docs/UNVERIFIED.md`.
- Append a status line to `docs/STATUS.md`.
- Inform the user plainly what was verified, what was merged, and what was logged in `docs/UNVERIFIED.md`.

---

## 4. House Rules

- Terse English. No em dashes. No "it's not just X, it's Y".
- Sentence case headings.
- Concrete numbers over adjectives. State reasoning and alternatives rejected.
- Say "this is wrong" with an exact reason. Minor suggestions are labelled `nit:` and never block merging.
- Review only 1 PR at a time. Confirm with the user before proceeding to the next.
