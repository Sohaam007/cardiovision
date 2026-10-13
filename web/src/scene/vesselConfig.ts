import * as THREE from 'three';

export interface PaletteStop {
  low: string;    // p = 0.0 (Low Risk)
  mid: string;    // p = 0.5 (Moderate Risk)
  high: string;   // p = 1.0 (High Risk)
}

export const CLINICAL_GUARDRAIL_CONFIG = { uniformColoring: true, localizedLesionMarkers: false };
export const SCENE_DPR_CONFIG: [number, number] = [1, 1.5];
export const SCENE_FRAMELOOP_CONFIG = 'demand';
export const TORSO_MATERIAL_CONFIG = {
  transparent: true,
  opacity: 0.12,
  depthWrite: false,
  flatShading: true,
};

export const PALETTES: { standard: PaletteStop; colorblind: PaletteStop } = {
  standard: {
    low: '#10b981',   // Emerald Green
    mid: '#f59e0b',   // Amber Yellow
    high: '#ef4444',  // Crimson Red
  },
  colorblind: {
    low: '#3b82f6',   // Royal Blue
    mid: '#f97316',   // Vivid Orange
    high: '#d946ef',  // Magenta Pink
  },
};

export interface VesselParam {
  radius: number;
  proxyRadius: number;
  tubularSegments: number;
  radialSegments: number;
  fullName: string;
  code: string;
}

export const VESSEL_PARAMS: Record<'LM' | 'LAD' | 'LCX' | 'RCA', VesselParam> = {
  LM: {
    code: 'LM',
    fullName: 'Left Main Trunk',
    radius: 0.052,
    proxyRadius: 0.12,
    tubularSegments: 32,
    radialSegments: 10,
  },
  LAD: {
    code: 'LAD',
    fullName: 'Left Anterior Descending',
    radius: 0.046,
    proxyRadius: 0.115,
    tubularSegments: 64,
    radialSegments: 10,
  },
  LCX: {
    code: 'LCX',
    fullName: 'Left Circumflex',
    radius: 0.042,
    proxyRadius: 0.105,
    tubularSegments: 64,
    radialSegments: 10,
  },
  RCA: {
    code: 'RCA',
    fullName: 'Right Coronary Artery',
    radius: 0.046,
    proxyRadius: 0.115,
    tubularSegments: 64,
    radialSegments: 10,
  },
};

// Anatomical control points for CatmullRom curves
const LM_POINTS = [
  new THREE.Vector3(0.08, 0.65, 0.22),
  new THREE.Vector3(0.18, 0.58, 0.29),
  new THREE.Vector3(0.28, 0.52, 0.35),
];

const LAD_POINTS = [
  new THREE.Vector3(0.28, 0.52, 0.35),
  new THREE.Vector3(0.32, 0.28, 0.56),
  new THREE.Vector3(0.30, 0.00, 0.66),
  new THREE.Vector3(0.27, -0.32, 0.62),
  new THREE.Vector3(0.26, -0.65, 0.50),
  new THREE.Vector3(0.25, -0.92, 0.35),
  new THREE.Vector3(0.24, -1.10, 0.22),
];

const LCX_POINTS = [
  new THREE.Vector3(0.28, 0.52, 0.35),
  new THREE.Vector3(0.52, 0.42, 0.30),
  new THREE.Vector3(0.72, 0.25, 0.08),
  new THREE.Vector3(0.74, 0.06, -0.22),
  new THREE.Vector3(0.56, -0.15, -0.46),
  new THREE.Vector3(0.32, -0.32, -0.55),
  new THREE.Vector3(0.12, -0.48, -0.52),
];

const RCA_POINTS = [
  new THREE.Vector3(-0.12, 0.62, 0.22),
  new THREE.Vector3(-0.38, 0.46, 0.32),
  new THREE.Vector3(-0.58, 0.22, 0.26),
  new THREE.Vector3(-0.66, -0.08, 0.12),
  new THREE.Vector3(-0.56, -0.42, -0.12),
  new THREE.Vector3(-0.34, -0.66, -0.32),
  new THREE.Vector3(-0.08, -0.82, -0.38),
];

export const VESSEL_CURVES: Record<'LM' | 'LAD' | 'LCX' | 'RCA', THREE.CatmullRomCurve3> = {
  LM: new THREE.CatmullRomCurve3(LM_POINTS, false, 'catmullrom', 0.5),
  LAD: new THREE.CatmullRomCurve3(LAD_POINTS, false, 'catmullrom', 0.5),
  LCX: new THREE.CatmullRomCurve3(LCX_POINTS, false, 'catmullrom', 0.5),
  RCA: new THREE.CatmullRomCurve3(RCA_POINTS, false, 'catmullrom', 0.5),
};

/**
 * Continuous 3-point piecewise linear RGB interpolation across [0.0, 1.0].
 * Returns THREE.Color.
 */
export function getVesselColorThree(prob: number, colorblind: boolean): THREE.Color {
  const safeProb = Number.isFinite(prob) ? Math.max(0, Math.min(1, prob)) : 0.5;
  const p = safeProb;
  const palette = colorblind ? PALETTES.colorblind : PALETTES.standard;

  const low = new THREE.Color(palette.low);
  const mid = new THREE.Color(palette.mid);
  const high = new THREE.Color(palette.high);
  const result = new THREE.Color();

  if (p <= 0.5) {
    const t = p / 0.5;
    result.lerpColors(low, mid, t);
  } else {
    const t = (p - 0.5) / 0.5;
    result.lerpColors(mid, high, t);
  }
  return result;
}

/**
 * Returns hex string formatted with leading # (e.g. "#10b981").
 */
export function getVesselColorHex(prob: number, colorblind: boolean): string {
  const safeProb = Number.isFinite(prob) ? Math.max(0, Math.min(1, prob)) : 0.5;
  const c = getVesselColorThree(safeProb, colorblind);
  return '#' + c.getHexString();
}

/**
 * Risk categorization helper for UI badges and labels.
 */
export function getRiskTier(prob: number): { label: string; badgeClass: string; color: string } {
  if (prob < 0.4) {
    return {
      label: 'Low Risk',
      badgeClass: 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/50',
      color: '#10b981',
    };
  }
  if (prob < 0.7) {
    return {
      label: 'Moderate Risk',
      badgeClass: 'bg-amber-950/80 text-amber-400 border border-amber-700/50',
      color: '#f59e0b',
    };
  }
  return {
    label: 'High Risk',
    badgeClass: 'bg-rose-950/80 text-rose-400 border border-rose-700/50',
    color: '#ef4444',
  };
}
