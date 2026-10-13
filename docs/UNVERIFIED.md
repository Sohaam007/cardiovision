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

---

## How to Close an Item
1. Execute the verification plan (e.g. run on physical non-GPU laptop, trigger live Render `/health`, test mobile touch gesture).
2. Change Status to `verified` (or `limitation`).
3. Add date and short note of evidence in the PR or `docs/DECISIONS.md`.
