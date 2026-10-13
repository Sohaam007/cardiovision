# Rules for AI agents (Track A: cardiac risk + 3D viewer)

- Read `docs/00_CONTEXT.md` first, always.
- When the user says `do <ID>` (e.g. `do ML-02`): read `docs/tasks/<ID>.md` and every file listed under **Reads**; implement ONLY that scope; run the Acceptance checks; append one line to `docs/STATUS.md` (date, ID, who, result).
- Never use LAD / LCX / RCA / Cath as model inputs for any target. A pytest enforces this.
- Never imply lesion location. The dataset has none. Color whole vessels by probability only.
- Never change `docs/04_API_CONTRACT.md` without logging it in `docs/DECISIONS.md` and telling the human.
- Keep the Python API light: no `shap` import in production. Use XGBoost `pred_contribs=True` (or LightGBM `pred_contrib=True`).
- Python 3.11, pinned `requirements.txt`. TypeScript strict. Add tests for new logic.
- Do not invent metrics or numbers. Every number in docs/report must come from `models/metrics.json`.
- If a task card is ambiguous, make the smallest reasonable choice, log it in `docs/DECISIONS.md`, and continue.
- Do not touch files outside the task's scope.
