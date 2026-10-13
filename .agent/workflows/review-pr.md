---
description: Review a pull request adversarially by number, e.g. /review-pr 1
---
1. Read AGENTS.md, docs/00_CONTEXT.md, and docs/WORKFLOW.md.
2. Checkout the branch for PR #<NUMBER> (via gh pr checkout <NUMBER>).
3. Run test and build checks locally (pytest -v, cd web && npm run lint && npm run build).
4. Run mutation tests on new tests and adversarial attack checks (leakage variants, whole-vessel coloring, contract freeze).
5. Post review comments on the PR (gh pr review <NUMBER> --comment), fix issues on the branch, merge into main, and delete branch.
6. Record unverified items in docs/UNVERIFIED.md and append completion to docs/STATUS.md.
