---
description: Automated check and verify for task branch or pull request
---
1. Read AGENTS.md, docs/00_CONTEXT.md, and docs/WORKFLOW.md.
2. Run backend test suite: pytest -v.
3. Run frontend typecheck and build: cd web && npm run lint && npm run build.
4. Verify zero leakage and invariants.
5. If ml/train.py, ml/evaluate code, or tests/test_no_leakage.py were touched, output "HUMAN REVIEW REQUIRED: <file>".
