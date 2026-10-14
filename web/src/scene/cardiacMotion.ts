/**
 * CardioVision Biomechanical Cardiac Motion Engine
 * Calculates physiological Wiggers cardiac cycle dynamics:
 * - Ventricular systole contraction & apex torsion (wringing action)
 * - Longitudinal shortening along the base-to-apex axis
 * - Great vessel systolic ejection pulse (aortic arch & pulmonary trunk)
 * - Atrial kick (P-wave pre-systolic contraction)
 * - Atrioventricular valve leaflet dynamics (mitral & tricuspid opening/closing)
 * Exactly reproduces the motion seen in the reference Cinema 4D animation.
 */

export interface CardiacMotionFrame {
  phase: number; // Normalized cycle time [0.0, 1.0)
  contraction: number; // Ventricular inward squeeze factor [0.0, 1.0]
  torsion: number; // Apex twist in radians (~0 to 0.08 rad / 4.6 deg)
  shortening: number; // Base-apex longitudinal shortening factor
  ejectionPulse: number; // Great vessels pulse expansion
  atrialKick: number; // Auricular & atrial pre-systolic contraction
  valveOpenFactor: number; // 0.0 = billowed shut in systole, 1.0 = wide open in diastole
  phaseName: 'systole' | 'diastole' | 'isovolumetric' | 'relaxation';
}

const STATIC_FRAME: CardiacMotionFrame = {
  phase: 0.0,
  contraction: 0.0,
  torsion: 0.0,
  shortening: 0.0,
  ejectionPulse: 0.0,
  atrialKick: 0.0,
  valveOpenFactor: 0.45,
  phaseName: 'diastole',
};

/**
 * Computes the instantaneous biomechanical frame given elapsed time in seconds,
 * heart rate in BPM, and animation speed multiplier.
 */
export function computeCardiacMotion(
  timeSeconds: number,
  bpm: number,
  speed: number,
  isBeating: boolean
): CardiacMotionFrame {
  if (!isBeating) {
    return STATIC_FRAME;
  }

  const safeBpm = Math.max(30, Math.min(180, bpm));
  const safeSpeed = Math.max(0.1, Math.min(3.0, speed));
  const cycleDuration = 60.0 / (safeBpm * safeSpeed);

  // Normalized phase [0.0, 1.0)
  const phase = (timeSeconds / cycleDuration) % 1.0;

  let contraction = 0.0;
  let torsion = 0.0;
  let shortening = 0.0;
  let ejectionPulse = 0.0;
  let atrialKick = 0.0;
  let valveOpenFactor = 0.0;
  let phaseName: CardiacMotionFrame['phaseName'] = 'diastole';

  if (phase < 0.08) {
    // 1. Isovolumetric Contraction (Ventricular tension spikes, AV valves snap shut)
    phaseName = 'isovolumetric';
    const t = phase / 0.08;
    contraction = Math.sin(t * (Math.PI / 2)) * 0.35;
    torsion = contraction * 0.075;
    shortening = contraction * 0.035;
    valveOpenFactor = Math.max(0, 1.0 - t * 1.5);
  } else if (phase < 0.32) {
    // 2. Ventricular Ejection (Systole: peak contraction, apex torsion, aortic ejection pulse)
    phaseName = 'systole';
    const t = (phase - 0.08) / 0.24;
    // Bell curve reaching peak contraction around t ~ 0.45 (phase ~ 0.19)
    const peakCurve = Math.sin(t * Math.PI);
    contraction = 0.35 + 0.65 * peakCurve;
    torsion = contraction * 0.082; // ~4.7 degrees of counter-clockwise torsion
    shortening = contraction * 0.040;
    ejectionPulse = Math.sin(t * Math.PI) * 0.042; // Aorta and pulmonary trunk swell
    valveOpenFactor = 0.0; // Tightly closed & billowed shut
  } else if (phase < 0.40) {
    // 3. Isovolumetric Relaxation (Pressure drops, rapid elastic recoil)
    phaseName = 'relaxation';
    const t = (phase - 0.32) / 0.08;
    contraction = 0.35 * Math.cos(t * (Math.PI / 2));
    torsion = contraction * 0.075;
    shortening = contraction * 0.035;
    valveOpenFactor = 0.0;
  } else if (phase < 0.72) {
    // 4. Rapid Ventricular Filling (Diastole: valves swing wide open, ventricles expand)
    phaseName = 'diastole';
    const t = (phase - 0.40) / 0.32;
    contraction = 0.0;
    torsion = 0.0;
    shortening = 0.0;
    // Valve leaflets swing open into ventricular cavities
    valveOpenFactor = Math.sin(t * Math.PI) * 0.95;
  } else if (phase < 0.86) {
    // 5. Diastasis (Passive slow filling, leaflets floating mid-cavity)
    phaseName = 'diastole';
    const t = (phase - 0.72) / 0.14;
    contraction = 0.0;
    torsion = 0.0;
    shortening = 0.0;
    valveOpenFactor = 0.45 + 0.12 * Math.sin(t * Math.PI);
  } else {
    // 6. Atrial Kick (Late Diastole: auricles and atria contract to top off ventricles)
    phaseName = 'diastole';
    const t = (phase - 0.86) / 0.14;
    atrialKick = Math.sin(t * Math.PI) * 0.08;
    valveOpenFactor = 0.45 * (1.0 - t); // Leaflets begin closing
  }

  return {
    phase,
    contraction,
    torsion,
    shortening,
    ejectionPulse,
    atrialKick,
    valveOpenFactor,
    phaseName,
  };
}
