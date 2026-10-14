# CardioVision - Team Handoff Guide

**GitHub Repository URL:** `https://github.com/Sohaam007/cardiovision.git`

---

## 1. Quick Copy-Paste Messages for Each Teammate

### For Soham (ML, Models, SHAP, API Serving)
```markdown
Hi Soham,
Repo is ready: https://github.com/Sohaam007/cardiovision.git

Setup:
git clone https://github.com/Sohaam007/cardiovision.git
cd cardiovision
make setup

Your tasks: ML-01, ML-02, ML-03, API-01
Type in Antigravity:
/do ML-01
(Fallback: Read AGENTS.md, then do ML-01)
```

---

### For Soumyadeep (3D Scene, Vessels, Interactions, Integration)
```markdown
Hi Soumyadeep,
Repo is ready: https://github.com/Sohaam007/cardiovision.git

Setup:
git clone https://github.com/Sohaam007/cardiovision.git
cd cardiovision
make setup

Your tasks: 3D-01, 3D-02, INT-01
Type in Antigravity:
/do 3D-01
(Fallback: Read AGENTS.md, then do 3D-01)
```

---

### For Adin (UI Dashboard, Visualizations, What-If Panel)
```markdown
Hi Adin,
Repo is ready: https://github.com/Sohaam007/cardiovision.git

Setup:
git clone https://github.com/Sohaam007/cardiovision.git
cd cardiovision
make setup

Your tasks: UI-01, UI-02 (and INT-01 support)
Type in Antigravity:
/do UI-01
(Fallback: Read AGENTS.md, then do UI-01)
```

---

### For Debdas (DevOps, Cloud Deploys, CI/CD, Documentation, Video)
```markdown
Hi Debdas,
Repo is ready: https://github.com/Sohaam007/cardiovision.git

Setup:
git clone https://github.com/Sohaam007/cardiovision.git
cd cardiovision
make setup

Your tasks: OPS-01 (Vercel + Render hello-world deploys; the repo scaffold already exists, so only deployment and CI remain), OPS-02, DOC-01, DOC-02
Type in Antigravity:
/do OPS-01
(Fallback: Read AGENTS.md, then do OPS-01)
```

---

## 2. Hard Workflow Rules

1. **After every task:**
   ```bash
   git pull
   # run the acceptance check for your task
   git commit -am "<TASK_ID>: description"
   git push
   # append a line to docs/STATUS.md
   ```
   Format for `docs/STATUS.md`:
   `YYYY-MM-DD HH:MM | ID | person | done/partial/blocked | note`

2. **API Contract Integrity:**
   **Never edit `docs/04_API_CONTRACT.md` without logging it in `docs/DECISIONS.md` and telling everyone.**

3. **Working with ChatGPT (Alternative LLM workflow):**
   Run:
   ```bash
   python scripts/pack_context.py <TASK_ID>
   ```
   Then copy and paste the generated `context_bundle.md` into the prompt.

4. **Strict Safety & Leakage Guardrails:**
   - Never use `LAD`, `LCX`, `RCA`, `Cath` as features for any target model.
   - Do not import `shap` in production API (`requirements.txt`).
   - Do not invent metrics; all report numbers must come from `models/metrics.json`.

---

## 3. Adapted 36-Hour Hackathon Timeline (T0 = Now: 13 Oct 2026, 20:30 IST)

| Phase & Window | Time (IST) | Soham | Soumyadeep | Adin | Debdas |
|---|---|---|---|---|---|
| **Hours 0-2** | 13 Oct 20:30 - 22:30 | **ML-01** (EDA, features, leakage test) | **3D-01** (scene skeleton, fake probs) | **UI-01** (dashboard shell) | **OPS-01** (Vercel + Render deploys, CI) |
| **Hours 2-8** | 13 Oct 22:30 - 14 Oct 04:30 | **ML-02** (baselines & CV comparison) | **3D-01** finish, **3D-02** (interactions) | **UI-01** finish, **UI-02** (SHAP/measurement cards) | Docs 08/09, report skeleton |
| **Hours 8-12** | 14 Oct 04:30 - 08:30 | **ML-03** (final models, calibration, SHAP export) | Finish **3D-02** | **UI-02** (what-if panel) | **OPS-02** (CI tuning, warm-up setup) |
| **Hours 12-14** | 14 Oct 08:30 - 10:30 | **API-01** (FastAPI serving + parity test) | **INT-01** (integration) | **INT-01** (integration support) | QA & smoke testing |
| **Hour 14** | **14 Oct 10:30** | <center>**API CONTRACT FROZEN & FIRST INTEGRATED BUILD**</center> | | | |
| **Hours 14-24** | 14 Oct 10:30 - 20:30 | Bug fixes, calibration plots, metrics check | Camera presets, mobile/touch perf pass | UI polish, accessibility, demo fallback mode | **OPS-02** final deploy, **DOC-01** report draft |
| **Hours 24-30** | 14 Oct 20:30 - 15 Oct 02:30 | Verification of `metrics.json` | QA on low-power devices | QA & visual verification | **DOC-02** video recording & YouTube upload |
| **Hours 30-33** | 15 Oct 02:30 - 05:30 | Final report numbers sync | Code freeze | Code freeze | Final PDF check (<= 6 pages) & submission prep |
| **Hour 33** | **15 Oct 05:30** | <center>**STRICT CODE FREEZE**</center> | | | |
| **Hours 33-36** | 15 Oct 05:30 - 08:30 | **Early Submission Buffer** - Submit portal entry, verify live links logged out | | | |

