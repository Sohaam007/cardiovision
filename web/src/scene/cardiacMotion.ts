/**
 * CardioVision Biomechanical Cardiac Motion Engine
 * High-fidelity, clinical-grade cardiac biomechanics model based on:
 * 1. The classic Wiggers Diagram (7 discrete physiological cardiac cycle phases)
 * 2. Clinical Echocardiography & Speckle-Tracking (STE):
 *    - Helical wringing torsion (counter-clockwise apex twist, clockwise base twist)
 *    - Longitudinal base-to-apex shortening
 *    - Radial systolic myocardial wall thickening (+20-30%)
 *    - Ventricular suction and elastic untwisting recoil
 *    - Point of Maximal Impulse (PMI / precordial apex impulse thrust)
 * 3. Electrocardiographic timing:
 *    - P-wave: Asynchronous atrial systole (RA contracts before LA due to SA node location)
 *    - QRS complex: Isovolumetric contraction & rapid ejection
 *    - T-wave: Reduced ejection & isovolumetric relaxation
 * 4. Respiratory Modulation:
 *    - ~0.2 Hz sinusoidal diaphragmatic breathing oscillation
 * 
 * Performance Design:
 * - Deterministic & mathematically continuous across all 7 phase boundaries
 * - Zero memory allocations per frame (reusable pre-allocated frame object)
 * - Cached execution if called multiple times in the same frame
 */

export type CardiacCyclePhase = 'diastole' | 'isovolumetric' | 'systole' | 'relaxation';

export type WiggersPhase =
  | 'isovolumetric_contraction'
  | 'rapid_ejection'
  | 'reduced_ejection'
  | 'isovolumetric_relaxation'
  | 'rapid_filling'
  | 'diastasis'
  | 'atrial_systole';

export interface CardiacMotionFrame {
  // Backward-compatible properties
  phase: number; // Normalized cycle time [0.0, 1.0)
  contraction: number; // Ventricular inward squeeze factor [0.0, 1.0]
  torsion: number; // Apex twist in radians (~0 to 0.23 rad / ~0° to 13° CCW)
  shortening: number; // Base-apex longitudinal shortening factor [0.0, 0.085]
  ejectionPulse: number; // Great vessels pulse expansion [0.0, 0.06]
  atrialKick: number; // Auricular & atrial pre-systolic contraction factor (~0.0 to 0.08)
  valveOpenFactor: number; // 0.0 = billowed shut in systole, 1.0 = wide open in diastole
  phaseName: CardiacCyclePhase;

  // Expanded physiological biomechanics metrics
  apexImpulse: number; // Precordial apex kick - systolic forward/outward thrust of cardiac apex against anterior chest wall [0.0, 1.0]
  leftAtrialKick: number; // Left atrial pre-systolic contraction factor [0.0, 1.0] (phase 0.85 - 0.98)
  rightAtrialKick: number; // Right atrial pre-systolic contraction factor [0.0, 1.0] (phase 0.82 - 0.96)
  semilunarValveOpen: number; // 0.0 to 1.0 - Aortic and Pulmonary valves snap open during rapid ejection phase only, tightly sealed in diastole
  avValveOpen: number; // 0.0 to 1.0 - Mitral and Tricuspid valves swing open during rapid filling and diastole, sealed during systole
  torsionApex: number; // Counter-clockwise twist in radians (~10-15° / ~0.17-0.26 rad during systole)
  torsionBase: number; // Clockwise twist in radians (~3-5° / ~ -0.05 to -0.09 rad at cardiac base, creating net wringing motion)
  respiratoryPhase: number; // Slow ~0.2 Hz sinusoidal diaphragmatic respiratory oscillation [-1.0, 1.0] for subtle breathing drift
  wallThicknessFactor: number; // Ventricular myocardium thickening factor during systole (+20-30% thickness during peak contraction)
  wiggersPhase: WiggersPhase; // Discrete physiological Wiggers cycle phase
}

/**
 * Constant static frame returned when beating is disabled.
 */
export const STATIC_FRAME: Readonly<CardiacMotionFrame> = Object.freeze({
  phase: 0.0,
  contraction: 0.0,
  torsion: 0.0,
  shortening: 0.0,
  ejectionPulse: 0.0,
  atrialKick: 0.0,
  valveOpenFactor: 0.45,
  phaseName: 'diastole',
  apexImpulse: 0.0,
  leftAtrialKick: 0.0,
  rightAtrialKick: 0.0,
  semilunarValveOpen: 0.0,
  avValveOpen: 0.45,
  torsionApex: 0.0,
  torsionBase: 0.0,
  respiratoryPhase: 0.0,
  wallThicknessFactor: 1.0,
  wiggersPhase: 'diastasis',
});

// Single pre-allocated mutable frame object to guarantee ZERO garbage-collection allocations per frame
const CURRENT_FRAME: CardiacMotionFrame = {
  phase: 0.0,
  contraction: 0.0,
  torsion: 0.0,
  shortening: 0.0,
  ejectionPulse: 0.0,
  atrialKick: 0.0,
  valveOpenFactor: 0.45,
  phaseName: 'diastole',
  apexImpulse: 0.0,
  leftAtrialKick: 0.0,
  rightAtrialKick: 0.0,
  semilunarValveOpen: 0.0,
  avValveOpen: 0.45,
  torsionApex: 0.0,
  torsionBase: 0.0,
  respiratoryPhase: 0.0,
  wallThicknessFactor: 1.0,
  wiggersPhase: 'diastasis',
};

// Frame cache to avoid duplicate trigonometry when multiple components (Heart, InternalStructures, Vessels)
// query motion in the same render loop.
let cachedTimeSeconds = -1;
let cachedBpm = -1;
let cachedSpeed = -1;
let cachedIsBeating = false;

// Angular constants (13 degrees apex CCW, -4 degrees base CW in radians)
const DEG_TO_RAD = Math.PI / 180.0;
const PEAK_APEX_TORSION_RAD = 13.0 * DEG_TO_RAD; // ~0.2269 rad (13°)
const PEAK_BASE_TORSION_RAD = -4.0 * DEG_TO_RAD; // ~ -0.0698 rad (-4°)
const RESPIRATORY_ANGULAR_FREQ = 2.0 * Math.PI * 0.2; // 0.2 Hz (~12 breaths/min)

/**
 * Computes instantaneous biomechanical cardiac motion based on clinical Wiggers timing.
 * 
 * @param timeSeconds Elapsed time in seconds (e.g. state.clock.getElapsedTime())
 * @param bpm Heart rate in beats per minute [30 - 180]
 * @param speed Playback speed multiplier [0.1 - 3.0]
 * @param isBeating Whether cardiac cycle is actively running
 * @returns Reusable CardiacMotionFrame with zero heap allocations
 */
export function computeCardiacMotion(
  timeSeconds: number,
  bpm: number,
  speed: number,
  isBeating: boolean
): CardiacMotionFrame {
  // Fast path: return cached frame if already computed this frame
  if (
    timeSeconds === cachedTimeSeconds &&
    bpm === cachedBpm &&
    speed === cachedSpeed &&
    isBeating === cachedIsBeating
  ) {
    return CURRENT_FRAME;
  }

  cachedTimeSeconds = timeSeconds;
  cachedBpm = bpm;
  cachedSpeed = speed;
  cachedIsBeating = isBeating;

  if (!isBeating) {
    CURRENT_FRAME.phase = 0.0;
    CURRENT_FRAME.contraction = 0.0;
    CURRENT_FRAME.torsion = 0.0;
    CURRENT_FRAME.shortening = 0.0;
    CURRENT_FRAME.ejectionPulse = 0.0;
    CURRENT_FRAME.atrialKick = 0.0;
    CURRENT_FRAME.valveOpenFactor = 0.45;
    CURRENT_FRAME.phaseName = 'diastole';
    CURRENT_FRAME.apexImpulse = 0.0;
    CURRENT_FRAME.leftAtrialKick = 0.0;
    CURRENT_FRAME.rightAtrialKick = 0.0;
    CURRENT_FRAME.semilunarValveOpen = 0.0;
    CURRENT_FRAME.avValveOpen = 0.45;
    CURRENT_FRAME.torsionApex = 0.0;
    CURRENT_FRAME.torsionBase = 0.0;
    CURRENT_FRAME.respiratoryPhase = 0.0;
    CURRENT_FRAME.wallThicknessFactor = 1.0;
    CURRENT_FRAME.wiggersPhase = 'diastasis';
    return CURRENT_FRAME;
  }

  const safeBpm = Math.max(30, Math.min(180, bpm));
  const safeSpeed = Math.max(0.1, Math.min(3.0, speed));
  const cycleDuration = 60.0 / (safeBpm * safeSpeed);

  // Normalized phase [0.0, 1.0)
  const rawPhase = (timeSeconds / cycleDuration) % 1.0;
  const phase = rawPhase < 0.0 ? rawPhase + 1.0 : rawPhase;

  // Diaphragmatic respiratory oscillation (0.2 Hz sinusoidal drift)
  const respiratoryPhase = Math.sin(timeSeconds * RESPIRATORY_ANGULAR_FREQ);

  let contraction = 0.0;
  let shortening = 0.0;
  let ejectionPulse = 0.0;
  let apexImpulse = 0.0;
  let semilunarValveOpen = 0.0;
  let avValveOpen = 0.0;
  let leftAtrialKick = 0.0;
  let rightAtrialKick = 0.0;
  let atrialKick = 0.0;
  let phaseName: CardiacCyclePhase = 'diastole';
  let wiggersPhase: WiggersPhase = 'diastasis';

  // =========================================================================
  // PHYSIOLOGICAL 7-PHASE WIGGERS DYNAMICS
  // =========================================================================

  if (phase < 0.08) {
    // -----------------------------------------------------------------------
    // 1. Isovolumetric Contraction (Phase 0.00 - 0.08)
    // -----------------------------------------------------------------------
    // QRS complex depolarization trigger. Ventricular pressure rises steeply above atrial pressure,
    // snapping AV valves shut (S1 heart sound). Ventricular pressure is still below aortic pressure,
    // so semilunar valves are closed. All 4 valves closed tight; volume is strictly constant.
    phaseName = 'isovolumetric';
    wiggersPhase = 'isovolumetric_contraction';
    const t = phase / 0.08;

    // Steep rate of tension rise (dp/dt max)
    contraction = Math.sin(t * (Math.PI / 2)) * 0.35;
    shortening = contraction * 0.02; // Minimal longitudinal strain prior to ejection

    // Precordial apex impulse begins thrusting forward against anterior chest wall
    apexImpulse = Math.sin(t * (Math.PI / 2)) * 0.45;
    ejectionPulse = 0.0;

    // All valves sealed
    semilunarValveOpen = 0.0;
    avValveOpen = 0.0;
    leftAtrialKick = 0.0;
    rightAtrialKick = 0.0;
    atrialKick = 0.0;
  } else if (phase < 0.22) {
    // -----------------------------------------------------------------------
    // 2. Rapid Ejection (Phase 0.08 - 0.22)
    // -----------------------------------------------------------------------
    // Ventricular pressure exceeds aortic and pulmonary artery pressure.
    // Semilunar valves burst open; high-velocity stroke volume ejection into great vessels.
    // Strong helical wringing torsion, apex counter-clockwise twist, base clockwise twist.
    // Maximal precordial apex thrust (PMI).
    phaseName = 'systole';
    wiggersPhase = 'rapid_ejection';
    const t = (phase - 0.08) / 0.14;

    // Contraction surges smoothly to peak (1.00) at phase 0.22 with 0 slope crest
    const riseCurve = Math.sin(t * (Math.PI / 2));
    contraction = 0.35 + 0.65 * riseCurve;
    shortening = 0.007 + 0.078 * riseCurve;

    // Precordial apex kick (Point of Maximal Impulse) against anterior chest wall
    apexImpulse = 0.45 + 0.55 * Math.sin(t * Math.PI) - 0.10 * t;

    // Great vessels surge expansion pulse across ejection duration [0.08 - 0.34]
    const tEject = (phase - 0.08) / 0.26;
    ejectionPulse = Math.sin(tEject * Math.PI) * 0.058;

    // Semilunar valves snap open immediately and remain wide open
    semilunarValveOpen = t < 0.25 ? Math.sin((t / 0.25) * (Math.PI / 2)) : 1.0;
    avValveOpen = 0.0;
    leftAtrialKick = 0.0;
    rightAtrialKick = 0.0;
    atrialKick = 0.0;
  } else if (phase < 0.34) {
    // -----------------------------------------------------------------------
    // 3. Reduced Ejection (Phase 0.22 - 0.34)
    // -----------------------------------------------------------------------
    // Ventricular repolarization begins (T-wave on ECG).
    // Outflow deceleration: stroke volume flow decelerates, ventricular pressure begins dropping.
    phaseName = 'systole';
    wiggersPhase = 'reduced_ejection';
    const t = (phase - 0.22) / 0.12;

    // Contraction smoothly subsides from peak (1.00) to 0.35 with C1 continuous crest
    const decayCurve = 0.5 * (1.0 + Math.cos(t * Math.PI));
    contraction = 0.35 + 0.65 * decayCurve;
    shortening = 0.007 + 0.078 * decayCurve;

    // Apex impulse subsides smoothly to zero
    apexImpulse = 0.35 * decayCurve;

    // Great vessels pulse smoothly completes its expansion wave
    const tEject = (phase - 0.08) / 0.26;
    ejectionPulse = Math.sin(tEject * Math.PI) * 0.058;

    // Semilunar valves float inward toward coaptation as outflow velocity drops
    semilunarValveOpen = decayCurve;
    avValveOpen = 0.0;
    leftAtrialKick = 0.0;
    rightAtrialKick = 0.0;
    atrialKick = 0.0;
  } else if (phase < 0.42) {
    // -----------------------------------------------------------------------
    // 4. Isovolumetric Relaxation (Phase 0.34 - 0.42)
    // -----------------------------------------------------------------------
    // Aortic & pulmonary valves snap shut abruptly (dicrotic notch, S2 heart sound).
    // Ventricular pressure plunges precipitously below arterial pressure.
    // Rapid untwisting elastic recoil generates early diastolic intraventricular suction.
    // All 4 valves closed tight.
    phaseName = 'relaxation';
    wiggersPhase = 'isovolumetric_relaxation';
    const t = (phase - 0.34) / 0.08;

    // Myocardial relaxation & untwisting elastic recoil easing into diastole
    const relaxCurve = 0.5 * (1.0 + Math.cos(t * Math.PI));
    contraction = 0.35 * relaxCurve;
    shortening = 0.007 * relaxCurve;

    apexImpulse = 0.0;
    ejectionPulse = 0.0;

    // All valves sealed
    semilunarValveOpen = 0.0;
    avValveOpen = 0.0;
    leftAtrialKick = 0.0;
    rightAtrialKick = 0.0;
    atrialKick = 0.0;
  } else if (phase < 0.65) {
    // -----------------------------------------------------------------------
    // 5. Rapid Ventricular Filling (Phase 0.42 - 0.65)
    // -----------------------------------------------------------------------
    // Ventricular pressure falls below atrial pressure.
    // Atrioventricular valves (mitral and tricuspid) swing wide open!
    // Rapid diastolic filling wave (E-wave on echocardiographic Doppler).
    // Receives ~70-80% of total ventricular diastolic filling volume.
    phaseName = 'diastole';
    wiggersPhase = 'rapid_filling';
    const t = (phase - 0.42) / 0.23;

    contraction = 0.0;
    shortening = 0.0;
    apexImpulse = 0.0;
    ejectionPulse = 0.0;
    semilunarValveOpen = 0.0;

    // AV valves swing wide open to 1.0, then gently ease toward intermediate floating position (~0.50)
    if (t < 0.30) {
      avValveOpen = Math.sin((t / 0.30) * (Math.PI / 2));
    } else {
      const ease = (t - 0.30) / 0.70;
      avValveOpen = 1.0 - ease * 0.50;
    }

    leftAtrialKick = 0.0;
    rightAtrialKick = 0.0;
    atrialKick = 0.0;
  } else if (phase < 0.82) {
    // -----------------------------------------------------------------------
    // 6. Diastasis / Reduced Filling (Phase 0.65 - 0.82)
    // -----------------------------------------------------------------------
    // Slow passive filling: chamber pressures between atria and ventricles equalize.
    // Leaflets float partially open in mid-cavity in the passive venous bloodstream.
    phaseName = 'diastole';
    wiggersPhase = 'diastasis';
    const t = (phase - 0.65) / 0.17;

    contraction = 0.0;
    shortening = 0.0;
    apexImpulse = 0.0;
    ejectionPulse = 0.0;
    semilunarValveOpen = 0.0;

    // Leaflets floating mid-cavity
    avValveOpen = 0.50 + 0.05 * Math.sin(t * Math.PI * 2);

    leftAtrialKick = 0.0;
    rightAtrialKick = 0.0;
    atrialKick = 0.0;
  } else {
    // -----------------------------------------------------------------------
    // 7. Atrial Systole / Kick (Phase 0.82 - 1.00)
    // -----------------------------------------------------------------------
    // P-wave on ECG triggers electrical depolarization of atria.
    // RA contracts slightly before LA due to SA node location in the superior high right atrium
    // (RA: 0.82 - 0.96, LA: 0.85 - 0.98 delayed by Bachmann's bundle conduction).
    // Delivers remaining 15-20% of stroke volume (A-wave on echocardiography) to complete EDV.
    // AV valves pre-close into coaptation as ventricular end-diastolic pressure rises at phase 0.90-1.00.
    phaseName = 'diastole';
    wiggersPhase = 'atrial_systole';

    contraction = 0.0;
    shortening = 0.0;
    apexImpulse = 0.0;
    ejectionPulse = 0.0;
    semilunarValveOpen = 0.0;

    // Right Atrial contraction (Phase 0.82 - 0.96)
    if (phase < 0.96) {
      const tRA = (phase - 0.82) / 0.14;
      rightAtrialKick = Math.sin(tRA * Math.PI);
    } else {
      rightAtrialKick = 0.0;
    }

    // Left Atrial contraction (Phase 0.85 - 0.98) - delayed conduction
    if (phase >= 0.85 && phase < 0.98) {
      const tLA = (phase - 0.85) / 0.13;
      leftAtrialKick = Math.sin(tLA * Math.PI);
    } else {
      leftAtrialKick = 0.0;
    }

    // Backward-compatible combined atrial displacement factor (~0.0 to 0.08)
    atrialKick = Math.max(rightAtrialKick, leftAtrialKick) * 0.08;

    // AV valve dynamics: Atrial blood flow flutters leaflets open (A-wave), then they smoothly drift shut
    // into coaptation as ventricular end-diastolic pressure rises (phase 0.90 -> 1.00).
    const kickBoost = Math.max(rightAtrialKick, leftAtrialKick) * 0.20;
    if (phase < 0.90) {
      avValveOpen = 0.50 + kickBoost;
    } else {
      const tClose = (phase - 0.90) / 0.10;
      const closeCurve = 0.5 * (1.0 + Math.cos(tClose * Math.PI));
      avValveOpen = (0.50 + kickBoost) * closeCurve;
    }
  }

  // -------------------------------------------------------------------------
  // Biomechanical Torsion & Wall Thickening Derivations
  // -------------------------------------------------------------------------
  // Helical cardiac wringing:
  // - Apex twists counter-clockwise ~10-15° (+13° = ~0.2269 rad)
  // - Base twists clockwise ~3-5° (-4° = ~ -0.0698 rad)
  // - Net wringing shear angle = ~17° (0.2967 rad)
  const torsionApex = PEAK_APEX_TORSION_RAD * contraction;
  const torsionBase = PEAK_BASE_TORSION_RAD * contraction;

  // Backward-compatible torsion matches apex CCW twist
  const torsion = torsionApex;

  // Ventricular myocardium thickens by +20-30% (+25% at peak contraction)
  const wallThicknessFactor = 1.0 + 0.25 * contraction;

  // Backward-compatible valveOpenFactor synchronizes with AV valves
  const valveOpenFactor = avValveOpen;

  // Write directly into pre-allocated frame object (ZERO garbage collection)
  CURRENT_FRAME.phase = phase;
  CURRENT_FRAME.contraction = contraction;
  CURRENT_FRAME.torsion = torsion;
  CURRENT_FRAME.shortening = shortening;
  CURRENT_FRAME.ejectionPulse = ejectionPulse;
  CURRENT_FRAME.atrialKick = atrialKick;
  CURRENT_FRAME.valveOpenFactor = valveOpenFactor;
  CURRENT_FRAME.phaseName = phaseName;
  CURRENT_FRAME.apexImpulse = apexImpulse;
  CURRENT_FRAME.leftAtrialKick = leftAtrialKick;
  CURRENT_FRAME.rightAtrialKick = rightAtrialKick;
  CURRENT_FRAME.semilunarValveOpen = semilunarValveOpen;
  CURRENT_FRAME.avValveOpen = avValveOpen;
  CURRENT_FRAME.torsionApex = torsionApex;
  CURRENT_FRAME.torsionBase = torsionBase;
  CURRENT_FRAME.respiratoryPhase = respiratoryPhase;
  CURRENT_FRAME.wallThicknessFactor = wallThicknessFactor;
  CURRENT_FRAME.wiggersPhase = wiggersPhase;

  return CURRENT_FRAME;
}

/**
 * Utility helper to compute the interpolated helical torsion angle at any point along the
 * base-to-apex cardiac longitudinal axis.
 * 
 * In clinical echocardiography (speckle-tracking), the cardiac rotation transitions linearly
 * from clockwise at the base (y = +1.0) through a transition plane of zero twist near the mid-ventricle
 * to counter-clockwise at the apex (y = -1.0).
 * 
 * @param frame The computed CardiacMotionFrame
 * @param normalizedY Normalized height along the ventricle: -1.0 at apex, +1.0 at base
 * @returns Interpolated torsion angle in radians
 */
export function getLongitudinalTorsion(frame: CardiacMotionFrame, normalizedY: number): number {
  // Clamp normalizedY to [-1.0, 1.0]
  const clampedY = Math.max(-1.0, Math.min(1.0, normalizedY));
  // Map [-1, 1] to [0, 1] where 0 = apex, 1 = base
  const t = (clampedY + 1.0) * 0.5;
  // Linear interpolation: apex (t = 0) -> base (t = 1)
  return frame.torsionApex * (1.0 - t) + frame.torsionBase * t;
}
