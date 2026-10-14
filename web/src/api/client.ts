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
  type: 'binary' | 'numeric' | 'categorical';
  group: 'vitals_history' | 'ecg' | 'echo_lab';
  min: number | null;
  max: number | null;
  default: any;
  unit: string;
  reference_range?: {
    low: number;
    high: number;
    source: string;
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

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'https://cardiovision-vwkj.onrender.com';
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
    // Fallback if API is offline
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

export async function predictRisk(
  features: Record<string, any>
): Promise<{ data: PredictResponse; isFallback: boolean }> {
  // Cancel previous stale in-flight request
  if (currentPredictController) {
    currentPredictController.abort();
  }

  currentPredictController = new AbortController();
  const signal = currentPredictController.signal;
  const timeoutId = setTimeout(() => currentPredictController?.abort(), TIMEOUT_MS);

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
    if (err.name === 'AbortError') {
      throw err; // Stale request cancelled
    }
    throw new Error('API server unavailable or request timed out after 8s');
  }
}
