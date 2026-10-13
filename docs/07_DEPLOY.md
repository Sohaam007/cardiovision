# 07 Deploy (Production Configuration)

## Architecture Overview
- **Frontend:** Vercel (or Cloudflare Pages / Netlify). Root directory `web/`, build command `npm run build`, output directory `dist`.
  - Environment variable: `VITE_API_URL` (points to the Render live backend URL).
  - Graceful fallback: If API is unreachable or waking, frontend automatically falls back to precomputed offline demo mode (`/demo_patients.json`).
- **Backend API:** Render Web Service (Free Tier), Python 3.11.
  - Start command: `uvicorn api.main:app --host 0.0.0.0 --port $PORT`
  - Health check path: `/health`
  - Zero heavy dependencies: no `shap` in production runtime; models loaded at startup into memory.

## Environment Variables
- `PORT`: Set automatically by Render (default: 8000).
- `CORS_ORIGINS`: Comma-separated list of allowed origins (e.g. `http://localhost:5173,https://cardiovision.vercel.app`). Also supports all `*.vercel.app` preview deployments automatically.
- `MOCK_MODE`:
  - `0` (default in production): Serves live calibrated XGBoost models with native TreeSHAP in < 15ms.
  - `1`: Runs deterministic mock inference engine for testing or fallback.
- `VITE_API_URL`: Configured in frontend `.env` or Vercel dashboard to route calls to the live Render URL.

## Cold-Start Mitigation
Render free tier instances sleep after 15 minutes of inactivity:
1. Frontend makes an immediate non-blocking call to `/health` on mount.
2. If the backend is sleeping, the top bar displays a subtle 'Demo Offline Engine' pill while waking up.
3. Once live, the status badge seamlessly switches to 'Live Model Serving' without interrupting user interactions.
4. During live evaluation or judging windows: ping `/health` every 10 minutes via a health monitor to maintain warm memory residency.

## Deployment Verification Checklist
- [x] Fast sub-15ms live inference confirmed via automated tests (`tests/test_api_parity.py`).
- [x] Precomputed holdout personas verified in `api/demo_patients.json` and `web/public/demo_patients.json`.
- [x] CORS middleware supports localhost:5173, custom domains, and Vercel preview URLs.
- [x] Zero leakage guaranteed by automated CI test suite (`tests/test_no_leakage.py`).
- [x] Frontend passes strict TypeScript checking and builds cleanly without warnings.
