# 07 Deploy (Production Configuration & Runbook)

## Architecture Overview
- **Frontend:** Vercel (or Cloudflare Pages). Root directory `web/`, build command `npm run build`, output directory `dist`.
  - Environment variable: `VITE_API_URL` (points to the Render live backend URL, e.g. `https://cardiovision-vwkj.onrender.com`).
  - Graceful fallback: If API is unreachable or waking, frontend automatically falls back to bundled precomputed offline demo mode (`/demo_patients.json`).
- **Backend API:** Render Web Service (Free Tier), Python 3.11.9.
  - Start command: `uvicorn api.main:app --host 0.0.0.0 --port $PORT`
  - Build command: `pip install -r requirements.txt`
  - Health check path: `/health`
  - Zero heavy runtime dependencies: TreeSHAP is executed natively via XGBoost C++ `pred_contribs=True` without importing `shap` in production.

---

## Click-by-Click Deployment Guide

### A. Deploy Backend API on Render

1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** &rarr; **Web Service**.
3. Select your GitHub repository (`swapnildebdas9630-crypto/cardiovision`).
4. Configure service settings:
   - **Name:** `cardiovision-vwkj` (or custom name)
   - **Region:** Ohio (US East) or Frankfurt (EU Central)
   - **Branch:** `main`
   - **Root Directory:** *(leave blank / repo root)*
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn api.main:app --host 0.0.0.0 --port $PORT`
   - **Plan:** `Free`
5. Expand **Advanced** and configure Environment Variables:
   - `PYTHON_VERSION` = `3.11.9`
   - `MOCK_MODE` = `0`
   - `CORS_ORIGINS` = `http://localhost:5173,https://cardiovision-sigma.vercel.app`
6. Set **Health Check Path** to `/health`.
7. Click **Create Web Service**. Wait 2-3 minutes for the build to finish.
8. Verify deployment:
   ```bash
   curl -s https://cardiovision-vwkj.onrender.com/health
   # Expected response: {"status":"ok","model_version":"v1"}
   ```

### B. Deploy Frontend on Vercel

1. Log in to [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** &rarr; **Project**.
3. Import the `Sohaam007/cardiovision` GitHub repository.
4. In Project Configuration:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click `Edit` and select `web`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
5. Expand **Environment Variables**:
   - `VITE_API_URL` = `https://cardiovision-vwkj.onrender.com`
6. Click **Deploy**. Vercel will install dependencies, typecheck (`tsc`), and bundle via Vite.
7. Verify live URL:
   - Navigate to `https://cardiovision-sigma.vercel.app`
   - Confirm safety disclaimer banner is visible.
   - Confirm Model Info drawer opens and displays cross-validation metrics.
   - Confirm 3D heart renders without errors.

---

## Testing CORS and End-to-End Connectivity

Run the following test to confirm CORS headers from your Vercel domain:
```bash
curl -I -X OPTIONS "https://cardiovision-vwkj.onrender.com/predict" \
  -H "Origin: https://cardiovision-sigma.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"
```
Verify the response includes:
```http
access-control-allow-origin: https://cardiovision-sigma.vercel.app
access-control-allow-methods: *
access-control-allow-headers: *
```

---

## Cold-Start Mitigation & Warm-Up Cron

Render free tier instances sleep after 15 minutes of inactivity:
1. **Frontend Resilience:** If the backend is waking up, the top bar displays 'Demo Mode (Offline)'. Patients can still be explored via precomputed holdout personas with zero interruption.
2. **Scheduled Keep-Warm (for Judging Windows):**
   - Use [cron-job.org](https://cron-job.org) or GitHub Actions (`.github/workflows/warmup.yml`) to ping `https://cardiovision-vwkj.onrender.com/health` every 10 minutes.
   - **Enable:** 2 hours before judging starts.
   - **Disable:** Immediately following judging completion to conserve free tier quotas.

---

## Deployment Verification Checklist
- [x] Fast sub-25ms live inference confirmed via automated tests (`tests/test_api_parity.py`).
- [x] Precomputed holdout personas verified in `api/demo_patients.json` and `web/public/demo_patients.json`.
- [x] CORS middleware supports `localhost:5173`, custom domains, and Vercel preview URLs regex (`https://.*\.vercel\.app`).
- [x] Zero leakage guaranteed by automated test suite (`tests/test_no_leakage.py`).
- [x] Frontend passes strict TypeScript checking (`tsc --noEmit`) and Vite production build.
- [x] `render.yaml` and `web/vercel.json` configured for infrastructure-as-code and client-side routing.
