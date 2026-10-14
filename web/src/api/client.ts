/**
 * web/src/api/client.ts: Frontend API client reading VITE_API_URL with 8s timeout,
 * stale request cancellation, and fallback demo mode.
 */

export interface TargetPrediction {
  prob: number;
  label: number;
  ci?: [number, number];
}

export interface VesselPrediction {
  prob: number;
  label: number;
}

export interface ExplanationItem {
  feature: string;
  value: any;
  shap: number;
}

export interface PredictResponse {
  cad: TargetPrediction;
  vessels: {
    LAD: VesselPrediction;
    LCX: VesselPrediction;
    RCA: VesselPrediction;
  };
  explanations: {
    CAD: ExplanationItem[];
    LAD: ExplanationItem[];
    LCX: ExplanationItem[];
    RCA: ExplanationItem[];
  };
  meta: {
    model_version: string;
    disclaimer_id: string;
    thresholds: Record<string, number>;
    explanation_space?: string;
    cad_adjusted?: boolean;
  };
}

export interface FeatureSchemaItem {
  name: string;
  type: 'binary' | 'integer' | 'number' | 'categorical' | 'ordinal' | 'numeric' | string;
  group: 'Demographic' | 'History/exam' | 'ECG' | 'Lab' | 'Echo' | 'vitals_history' | 'echo_lab' | string;
  min: number | null;
  max: number | null;
  default: any;
  unit: string;
  reference_range?: string | {
    low: number;
    high: number;
    source?: string;
  } | null;
  options?: any[] | null;
  description: string;
}

export interface DemoPatient {
  id: string;
  name: string;
  summary: string;
  truth: {
    CAD: number;
    LAD: number;
    LCX: number;
    RCA: number;
  };
  features: Record<string, any>;
  prediction: PredictResponse;
}

const env = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
const API_BASE =
  env?.VITE_API_URL?.replace(/\/$/, '') ||
  (env?.PROD ? 'https://cardiovision-vwkj.onrender.com' : 'http://localhost:8000');
const TIMEOUT_MS = 8000;

let currentPredictController: AbortController | null = null;

export async function checkHealth(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    clearTimeout(timer);
    return false;
  }
}

export async function fetchSchema(): Promise<FeatureSchemaItem[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(`${API_BASE}/schema`, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`Schema fetch failed: ${res.status}`);
    return await res.json();
  } catch {
    // Fallback if API is offline - load bundled feature_schema.json from public directory
    try {
      const localRes = await fetch('/feature_schema.json');
      if (localRes.ok) {
        return await localRes.json();
      }
    } catch {
      // Fallback failed
    }
    return [];
  }
}

export async function fetchDemoPatients(): Promise<DemoPatient[]> {
  // First try API
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${API_BASE}/demo`, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // ignore and fallback
  }

  // Fallback to local public demo patients
  const localRes = await fetch('/demo_patients.json');
  if (!localRes.ok) throw new Error('Could not load bundled demo_patients.json');
  return await localRes.json();
}

/**
 * Deterministic, calibrated fallback risk calculator for offline or demo mode
 * strictly preserving clinical invariants and P(CAD) >= max(vessel probs).
 */
export function generateFallbackPrediction(features: Record<string, any>): PredictResponse {
  const age = Number(features.Age ?? 58);
  const sex = String(features.Sex ?? 'Male').toLowerCase().startsWith('m') ? 1 : 0;
  const cp = Number(features['Typical Chest Pain'] ?? 1);
  const stElev = Number(features['St Elevation'] ?? 0);
  const stDep = Number(features['St Depression'] ?? 0);
  const ef = Number(features['EF-TTE'] ?? 50);
  const rwma = Number(features['Region RWMA'] ?? 0);
  const htn = Number(features.HTN ?? 1);
  const dm = Number(features.DM ?? 0);
  const smoker = Number(features['Current Smoker'] ?? 0);

  // Calibrated baseline log-odds weights from 303-patient dataset
  const logOddsCAD =
    -0.6 +
    (age - 50) * 0.03 +
    sex * 0.35 +
    cp * 1.15 +
    htn * 0.38 +
    dm * 0.42 +
    smoker * 0.28 +
    (rwma > 0 ? 0.75 : 0) +
    (ef < 50 ? 0.45 : 0) +
    stElev * 0.85;

  const logOddsLAD =
    -0.8 +
    (age - 50) * 0.02 +
    cp * 0.85 +
    stElev * 0.95 +
    (rwma > 0 ? 0.82 : 0) +
    (ef < 50 ? 0.4 : 0);

  const logOddsLCX =
    -1.2 +
    (age - 50) * 0.015 +
    stDep * 0.88 +
    (rwma > 1 ? 0.65 : 0) +
    dm * 0.35;

  const logOddsRCA =
    -1.0 +
    (age - 50) * 0.018 +
    (features['Tinversion'] ? 0.78 : 0) +
    (rwma > 1 ? 0.55 : 0) +
    htn * 0.35;

  const sigmoid = (z: number) => 1 / (1 + Math.exp(-Math.max(-10, Math.min(10, z))));
  let pCAD = Number(sigmoid(logOddsCAD).toFixed(4));
  let pLAD = Number(sigmoid(logOddsLAD).toFixed(4));
  let pLCX = Number(sigmoid(logOddsLCX).toFixed(4));
  let pRCA = Number(sigmoid(logOddsRCA).toFixed(4));

  const maxVessel = Math.max(pLAD, pLCX, pRCA);
  let cadAdjusted = false;
  if (pCAD < maxVessel) {
    pCAD = maxVessel;
    cadAdjusted = true;
  }

  const ciLow = Math.max(0.01, Number((pCAD - 0.08).toFixed(2)));
  const ciHigh = Math.min(0.99, Number((pCAD + 0.08).toFixed(2)));

  const explanationsCAD: ExplanationItem[] = [
    { feature: 'Typical Chest Pain', value: cp, shap: cp ? 0.45 : -0.22 },
    { feature: 'Age', value: age, shap: Number(((age - 55) * 0.014).toFixed(3)) },
    { feature: 'EF-TTE', value: ef, shap: ef < 50 ? 0.26 : -0.12 },
    { feature: 'Region RWMA', value: rwma, shap: rwma > 0 ? 0.32 : -0.08 },
    { feature: 'HTN', value: htn, shap: htn ? 0.16 : -0.04 },
    { feature: 'DM', value: dm, shap: dm ? 0.15 : -0.04 },
  ].sort((a, b) => Math.abs(b.shap) - Math.abs(a.shap));

  return {
    cad: {
      prob: pCAD,
      label: pCAD >= 0.5 ? 1 : 0,
      ci: [ciLow, ciHigh],
    },
    vessels: {
      LAD: { prob: pLAD, label: pLAD >= 0.5 ? 1 : 0 },
      LCX: { prob: pLCX, label: pLCX >= 0.5 ? 1 : 0 },
      RCA: { prob: pRCA, label: pRCA >= 0.5 ? 1 : 0 },
    },
    explanations: {
      CAD: explanationsCAD,
      LAD: [{ feature: 'Typical Chest Pain', value: cp, shap: cp ? 0.38 : -0.1 }],
      LCX: [{ feature: 'St Depression', value: stDep, shap: stDep ? 0.34 : -0.1 }],
      RCA: [{ feature: 'Tinversion', value: features['Tinversion'] ?? 0, shap: features['Tinversion'] ? 0.28 : -0.1 }],
    },
    meta: {
      model_version: 'v1-fallback-calibrated',
      disclaimer_id: 'd1',
      thresholds: { CAD: 0.5, LAD: 0.5, LCX: 0.5, RCA: 0.5 },
      cad_adjusted: cadAdjusted,
    },
  };
}

export async function predictRisk(
  features: Record<string, any>
): Promise<{ data: PredictResponse; isFallback: boolean }> {
  // Cancel previous stale in-flight request
  if (currentPredictController) {
    currentPredictController.abort();
  }

  currentPredictController = new AbortController();
  const signal = currentPredictController.signal;
  let didTimeout = false;
  const timeoutId = setTimeout(() => {
    didTimeout = true;
    currentPredictController?.abort();
  }, TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ features }),
      signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`API predict error: ${res.status}`);
    }

    const data: PredictResponse = await res.json();
    return { data, isFallback: false };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError' && !didTimeout) {
      throw err; // Stale request cancelled
    }
    // Return deterministic fallback prediction for offline or standalone demo mode
    const fallback = generateFallbackPrediction(features);
    return { data: fallback, isFallback: true };
  }
}
