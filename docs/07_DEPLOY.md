# 07 Deploy (all free)

## Plan
- **Frontend:** Vercel (Cloudflare Pages / Netlify equivalent). Root dir `web/`, build `npm run build`, output `dist`. Env var `VITE_API_URL`.
- **API:** Render free web service, Python 3.11. Build `pip install -r requirements.txt`, start `uvicorn api.main:app --host 0.0.0.0 --port $PORT`. Health check `/health`.
- Hugging Face Spaces: do not use for the backend (Docker/Gradio Spaces may require a paid plan; check current terms).

## Cold start
Render free sleeps after ~15 min idle and takes a while to wake. Mitigations:
1. Frontend calls `/health` on load and shows "warming up model server...".
2. Fallback demo mode with precomputed patients.
3. During the judging window only: ping `/health` every ~10 min (cron-job.org or a GitHub Actions schedule). Do not ping 24/7; free instance hours are limited.

## Keep the API light
No `shap` in production, small pinned deps, models loaded once at startup.

## Checklist
- [ ] Hello-world deployed on both at hour 2
- [ ] CORS works from the Vercel URL
- [ ] Redeploy after every merge to main
- [ ] Final URL tested in an incognito window and on phone
- [ ] README has live URL, run instructions, `make` one-liners
