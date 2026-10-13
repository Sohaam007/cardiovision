# OPS-01 Repo bootstrap and hello-world deploys
Owner: Debdas   Status: todo
Reads: docs/00_CONTEXT.md, docs/01_ARCHITECTURE.md, docs/07_DEPLOY.md
Do:
- Create GitHub repo with the folder layout from 01_ARCHITECTURE.md (add this docs pack at root).
- Vite + React + TS app in web/ with a hello page; deploy to Vercel.
- FastAPI app in api/ with GET /health; deploy to Render free.
- Add Makefile: make setup, make train, make api, make web, make test.
- Add GitHub Actions: pytest + web typecheck/build.
Acceptance: Both live URLs return hello/health; CI green; CORS from Vercel URL to Render works.
Out of scope: ML, 3D, UI
