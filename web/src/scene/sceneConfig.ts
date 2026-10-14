/**
 * CardioVision Scene & Rendering Configuration Contracts
 * Exported constants define architectural, interaction, and clinical constraints for 3D rendering.
 */

import type { VesselKey } from '../store/useStore.ts';

/**
 * Device Pixel Ratio capping contract [minDpr, maxDpr].
 * Enforces DPR <= 1.5 to maintain 60 FPS on low-power / integrated GPUs.
 */
export const SCENE_DPR_CONFIG: [number, number] = [1, 1.5];

/**
 * R3F Frameloop contract.
 * 'demand' guarantees 0% idle GPU utilization by repainting only on state mutation or camera motion.
 */
export const SCENE_FRAMELOOP_CONFIG = 'demand';

/**
 * OrbitControls interaction and limit contracts.
 * Specifically tuned for smooth mouse and touchpad navigation without runaway spin or zoom.
 */
export const ORBIT_CONTROLS_CONFIG = {
  minDistance: 2.0,
  maxDistance: 8.0,
  dampingFactor: 0.08,
  enableDamping: true,
  rotateSpeed: 0.8,
  zoomSpeed: 0.7,
  panSpeed: 0.8,
  minPolarAngle: Math.PI / 8, // ~22.5 deg (prevents flipping over superior pole)
  maxPolarAngle: (Math.PI * 7) / 8, // ~157.5 deg (prevents flipping under inferior pole)
  screenSpacePanning: true,
} as const;

export interface CameraPose {
  position: [number, number, number];
  target: [number, number, number];
  description: string;
}

/**
 * Canonical clinical camera presets.
 * - Anterior: Frontal view showing anterior interventricular groove and LAD course.
 * - Left lateral: Specifically tuned to display LCX clearly along the left atrioventricular groove.
 * - Posterior: Shows posterior crux and distal LCX / RCA trajectories.
 */
export const CAMERA_PRESETS: Record<'anterior' | 'lateral' | 'posterior', CameraPose> = {
  anterior: {
    position: [0, 0.35, 3.8],
    target: [0, 0, 0],
    description: 'Anterior perspective (frontal view, optimal for LAD overview and ventricular outflow)',
  },
  lateral: {
    position: [3.8, 0.35, 0.2],
    target: [0.2, 0, 0],
    description: 'Left lateral perspective (displays LCX winding along the left AV groove)',
  },
  posterior: {
    position: [0.2, 0.35, -3.8],
    target: [0, 0, 0],
    description: 'Posterior perspective (displays distal LCX and posterior crux RCA)',
  },
};

/**
 * Smooth camera fly targets when selecting specific coronary vessels.
 */
export const VESSEL_FOCUS_PRESETS: Record<VesselKey, CameraPose> = {
  LAD: {
    position: [0.8, 0.5, 2.6],
    target: [0.28, -0.1, 0.5],
    description: 'Focused on Left Anterior Descending artery along anterior interventricular groove',
  },
  LCX: {
    position: [3.2, 0.35, 0.2],
    target: [0.55, 0.05, -0.1],
    description: 'Focused on Left Circumflex artery wrapping the left atrioventricular groove',
  },
  RCA: {
    position: [-2.6, 0.2, 1.8],
    target: [-0.45, -0.1, 0.0],
    description: 'Focused on Right Coronary Artery wrapping the right atrioventricular sulcus',
  },
};

/**
 * Standard tweening duration in milliseconds for smooth camera transitions.
 */
export const CAMERA_TWEEN_DURATION_MS = 750;

/**
 * Cubic smooth easing interpolation function (easeInOutCubic).
 * Input t in [0, 1] -> output in [0, 1].
 */
export function easeInOutCubic(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped < 0.5
    ? 4 * clamped * clamped * clamped
    : 1 - Math.pow(-2 * clamped + 2, 3) / 2;
}

/**
 * Torso shell material configuration contract.
 * depthWrite: false is mandatory to prevent alpha sorting occlusion of internal heart and vessels.
 */
export const TORSO_MATERIAL_CONFIG = {
  transparent: true,
  opacity: 0.12,
  depthWrite: false,
  flatShading: true,
};

/**
 * Clinical guardrail contract.
 * Vessels must be colored uniformly along their entire length based on prediction probability.
 * Localized stenosis or lesion point markers are strictly prohibited.
 */
export const CLINICAL_GUARDRAIL_CONFIG = {
  uniformColoring: true,
  localizedLesionMarkers: false,
};
