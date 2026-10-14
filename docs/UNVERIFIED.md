# Unverified Items Log

This document tracks items, assumptions, hardware constraints, clinical questions, or environment behaviors that could not be fully verified during PR review or local automated testing.

Any item logged here must be verified and closed before the **Hour 33 Code Freeze** (or marked as an acknowledged limitation in `docs/10_REPORT_OUTLINE.md`).

## Format
`| Date | PR # | Task ID | Component / Item | Why Unverified | Assignee | Status | Verification Plan |`

Status options:
- `open`: Pending verification.
- `in-progress`: Verification underway.
- `verified`: Formally verified, evidence added to notes or PR.
- `limitation`: Cannot be verified within hackathon constraints; documented as research limitation in report.

---

## Log

| Date | PR # | Task ID | Component / Item | Why Unverified | Assignee | Status | Verification Plan |
|---|---|---|---|---|---|---|---|
| 2026-10-14 00:16 | #3 | DOC-WF | Remote GitHub Actions CI | .github/workflows not yet created in repo (OPS-02 pending); verified locally | Debdas | verified | Create .github/workflows in OPS-02 and verify remote checks pass |
| 2026-10-14 01:10 | #1 | 3D-01 | 60 FPS on non-GPU laptop | Demand rendering verified in tests; physical frame rate profiling on low-end non-GPU hardware | Soumyadeep | verified | Measured 22.2 FPS active tween (45.06 ms avg delta) and 0 FPS idle on demand loop under 4x CPU throttling in Edge headless |
| 2026-10-14 18:45 | #13 | OPS-01 | Local host pytest and npm build execution | Host Windows OS execution verified | Debdas | verified | Python 3.11.9 and Node 24.19 installed; 59/59 pytests and 69/69 web tests pass; npm run build succeeds |
| 2026-10-14 08:45 | #9 | OPS-CI | CI clean runner dependency parity | PR #8 revealed host dev environment masked missing httpx and Node 22 requirement | Debdas | verified | PR #9 pinned httpx==0.28.1 and Node 22 in CI; all GitHub Actions checks green |


---

## How to Close an Item
1. Execute the verification plan (e.g. run on physical non-GPU laptop, trigger live Render `/health`, test mobile touch gesture).
2. Change Status to `verified` (or `limitation`).
3. Add date and short note of evidence in the PR or `docs/DECISIONS.md`.
