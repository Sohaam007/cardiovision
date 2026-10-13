/**
 * CardioVision Scene & Rendering Configuration Contracts
 * Exported constants define architectural and clinical constraints for 3D rendering.
 */

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
