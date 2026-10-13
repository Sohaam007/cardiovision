# Track A — CAD Risk + 3D Heart Viewer: START HERE

Deadline: **14 Oct 2026, 12:00 a.m. (midnight)**. We have roughly 36 hours. Scope is cut for that.

## Team
| Person | Owns |
|---|---|
| Soham | Data, models, SHAP, FastAPI, tests (ML-*, API-*) |
| Soumyadeep | React Three Fiber scene, interactions, API wiring (3D-*, INT-*) |
| Adin | Dashboard UI, charts, what-if panel (UI-*) |
| Debdas | Repo, deploy, docs, report, video, QA (OPS-*, DOC-*) |

## How to work with AI (the "just say the name" system)
1. Put this whole folder at the root of a GitHub repo (`AGENTS.md`, `GEMINI.md`, `docs/`, `scripts/`, `.agent/`).
2. In Antigravity: open the repo, then type `/do ML-02` (workflow in `.agent/workflows/do.md`). If your version has no workflows folder, just type: `Read AGENTS.md, then do ML-02`.
3. In ChatGPT: run `python scripts/pack_context.py ML-02` and paste the output file. It bundles context + that task card.
4. Every task card lists Reads / Do / Acceptance. The agent appends a line to `docs/STATUS.md` when done.
5. A human reviews anything touching evaluation code and `tests/test_no_leakage.py`.

## 36-hour timeline (T0 = when you start)
| Hours | Soham | Soumyadeep | Adin | Debdas |
|---|---|---|---|---|
| 0-2 | OPS-01 repo, ML-01 EDA | 3D-01 scene skeleton (fake probs) | UI-01 shell | OPS-01 repo + hello-world deploys (Vercel + Render) |
| 2-8 | ML-02 baselines + CV | 3D-01 finish, 3D-02 interactions | UI-01 finish, UI-02 SHAP/measurement cards | 08/09 docs, report skeleton |
| 8-12 | ML-03 final models + SHAP export | finish 3D-02 | UI-02 what-if | OPS-02 CI |
| 12-14 | API-01 FastAPI + contract | INT-01 integration | INT-01 | QA |
| **14: API contract frozen, first integrated build** | | | | |
| 14-24 | bug fixes, calibration plots | camera presets, perf pass | polish, a11y, fallback mode | OPS-02 final deploy, DOC-01 report draft |
| 24-30 | metrics for report | QA on weak laptop | QA | DOC-02 video recording |
| 30-33 | final numbers into report | freeze | freeze | report PDF + video upload (test logged out) |
| **33: CODE FREEZE** | | | | |
| 33-36 | Submit early. Do not wait for the last hour. | | | |

Sleep in shifts. Two people awake at all times near the end.

## Scope cuts (decided because of the deadline)
- No custom Blender work by default. Vessels are **procedural tubes** in code over a heart mesh (or stylized procedural heart). Blender only if Adin is idle after hour 14.
- Repeated stratified 5-fold x3 with a small fixed grid, not nested Optuna.
- Browser-side inference is dropped. Fallback is precomputed demo patients.
- Hard rule: **always have a deployed, working version.** Deploy at hour 2, redeploy after every merge.

## Verify before you trust this plan
- Check the hackathon's team-size rule (4 names on a 3-person slot).
- Confirm the dataset column names against the actual CSV (`docs/02_DATASET.md` lists expected names only).
- Confirm where/how submission is made (portal, form) and what the report must be (PDF, 6 pages max).
