/**
 * CardioVision Biomechanical Cardiac Motion Engine
 * Calculates physiological Wiggers cardiac cycle dynamics:
 * - Ventricular systole contraction & apex torsion (wringing action)
 * - Longitudinal shortening along the base-to-apex axis
 * - Great vessel systolic ejection pulse (aortic arch & pulmonary trunk)
 * - Atrial kick (P-wave pre-systolic contraction)
 * - Atrioventricular valve leaflet dynamics (mitral & tricuspid opening/closing)
 * - Physiological rate modulation (ejection fraction and pulse rate synchronization)
 * - Phase freeze controls (Auto Beating, Systole freeze, Diastole freeze)
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
  avValvesOpen: boolean; // Mitral & Tricuspid opening status
  semilunarValvesOpen: boolean; // Aortic & Pulmonary opening status
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
  avValvesOpen: true,
  semilunarValvesOpen: false,
};

/**
 * Computes the instantaneous biomechanical frame given elapsed time in seconds,
 * heart rate in BPM, animation speed multiplier, ejection fraction, and cardiac phase freeze mode.
 */
export function computeCardiacMotion(
  timeSeconds: number,
  bpm: number,
  speed: number,
  isBeating: boolean,
  ejectionFraction: number = 55,
  cardiacPhase: 'auto' | 'diastole' | 'systole' = 'auto'
): CardiacMotionFrame {
  const safeEf = Math.max(20, Math.min(85, isNaN(ejectionFraction) ? 55 : ejectionFraction));
  // EF scaling: 55% is normal baseline 1.0; low EF (35%) reduces contraction excursion to ~0.64
  const efMultiplier = safeEf / 55.0;

  // 1. Explicit Phase Freeze Overrides
  if (cardiacPhase === 'systole') {
    // Peak Systole Freeze: Ventricles contracted, AV valves closed, Semilunar valves open for ejection
    return {
      phase: 0.20,
      contraction: 1.0 * efMultiplier,
      torsion: 0.082 * efMultiplier,
      shortening: 0.040 * efMultiplier,
      ejectionPulse: 0.042,
      atrialKick: 0.0,
      valveOpenFactor: 0.0,
      phaseName: 'systole',
      avValvesOpen: false,
      semilunarValvesOpen: true,
    };
  }

  if (cardiacPhase === 'diastole') {
    // Peak Diastole Freeze: Full ventricular relaxation, AV valves wide open, Semilunars shut
    return {
      phase: 0.55,
      contraction: 0.0,
      torsion: 0.0,
      shortening: 0.0,
      ejectionPulse: 0.0,
      atrialKick: 0.0,
      valveOpenFactor: 0.95,
      phaseName: 'diastole',
      avValvesOpen: true,
      semilunarValvesOpen: false,
    };
  }

  // 2. Not Beating Fallback
  if (!isBeating) {
    return STATIC_FRAME;
  }

  // 3. Dynamic Beating Motion
  const safeBpm = Math.max(30, Math.min(180, isNaN(bpm) ? 75 : bpm));
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
  let avValvesOpen = false;
  let semilunarValvesOpen = false;

  if (phase < 0.08) {
    // 1. Isovolumetric Contraction (Ventricular tension spikes, AV valves snap shut, Semilunars not yet open)
    phaseName = 'isovolumetric';
    const t = phase / 0.08;
    contraction = Math.sin(t * (Math.PI / 2)) * 0.35 * efMultiplier;
    torsion = contraction * 0.075;
    shortening = contraction * 0.035;
    valveOpenFactor = Math.max(0, 1.0 - t * 1.5);
    avValvesOpen = false;
    semilunarValvesOpen = false;
  } else if (phase < 0.32) {
    // 2. Ventricular Ejection (Systole: peak contraction, apex torsion, aortic semilunar valve open)
    phaseName = 'systole';
    const t = (phase - 0.08) / 0.24;
    const peakCurve = Math.sin(t * Math.PI);
    contraction = (0.35 + 0.65 * peakCurve) * efMultiplier;
    torsion = contraction * 0.082;
    shortening = contraction * 0.040;
    ejectionPulse = Math.sin(t * Math.PI) * 0.042;
    valveOpenFactor = 0.0; // AV valves tightly shut
    avValvesOpen = false;
    semilunarValvesOpen = true; // Semilunar valves swung wide open
  } else if (phase < 0.40) {
    // 3. Isovolumetric Relaxation (Semilunars snap shut - S2 sound, pressure drops)
    phaseName = 'relaxation';
    const t = (phase - 0.32) / 0.08;
    contraction = 0.35 * Math.cos(t * (Math.PI / 2)) * efMultiplier;
    torsion = contraction * 0.075;
    shortening = contraction * 0.035;
    valveOpenFactor = 0.0;
    avValvesOpen = false;
    semilunarValvesOpen = false; // Both valve sets closed
  } else if (phase < 0.72) {
    // 4. Rapid Ventricular Filling (Diastole: AV valves swing wide open, ventricles expand)
    phaseName = 'diastole';
    const t = (phase - 0.40) / 0.32;
    contraction = 0.0;
    torsion = 0.0;
    shortening = 0.0;
    valveOpenFactor = Math.sin(t * Math.PI) * 0.95;
    avValvesOpen = true;
    semilunarValvesOpen = false;
  } else if (phase < 0.86) {
    // 5. Diastasis (Passive slow filling, leaflets floating mid-cavity)
    phaseName = 'diastole';
    const t = (phase - 0.72) / 0.14;
    contraction = 0.0;
    torsion = 0.0;
    shortening = 0.0;
    valveOpenFactor = 0.45 + 0.12 * Math.sin(t * Math.PI);
    avValvesOpen = true;
    semilunarValvesOpen = false;
  } else {
    // 6. Atrial Kick (Late Diastole: auricles contract, leaflets begin drifting shut)
    phaseName = 'diastole';
    const t = (phase - 0.86) / 0.14;
    atrialKick = Math.sin(t * Math.PI) * 0.08;
    valveOpenFactor = 0.45 * (1.0 - t);
    avValvesOpen = true;
    semilunarValvesOpen = false;
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
    avValvesOpen,
    semilunarValvesOpen,
  };
}
