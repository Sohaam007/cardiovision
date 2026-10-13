# Rules for AI agents (Track A: cardiac risk + 3D viewer)

- Read `docs/00_CONTEXT.md` first, always.
- Workflow: ONE implementer + automated checks (pytest, web typecheck and build). No multi-agent review loops.
- Human review marker: when touching `ml/train.py`, evaluation code, or `tests/test_no_leakage.py`, report "HUMAN REVIEW REQUIRED: <file>".
- Never use LAD / LCX / RCA / Cath as model inputs for any target. A pytest enforces this.
- Never imply lesion location. The dataset has none. Color whole vessels by probability only.
- Never change `docs/04_API_CONTRACT.md` without logging it in `docs/DECISIONS.md`.
- Keep the Python API light: no `shap` import in production. Use XGBoost `pred_contribs=True` (or LightGBM `pred_contrib=True`).
- Python 3.11, pinned `requirements.txt`. TypeScript strict. Add tests for new logic.
- Do not invent metrics or numbers. Every number in docs/report must come from `models/metrics.json`.
- If a task card is ambiguous, make the smallest reasonable choice, log it in `docs/DECISIONS.md`, and continue.
- Keep commits small and main branch deployable at all times.
- Do not touch files outside the task's scope.
