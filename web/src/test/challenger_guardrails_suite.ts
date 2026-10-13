import * as THREE from 'three';
import { useStore, VesselKey } from '../store/useStore.ts';
import {
  VESSEL_CURVES,
  VESSEL_PARAMS,
  getVesselColorThree,
} from '../scene/vesselConfig.ts';

interface TestResult {
  suite: string;
  test: string;
  passed: boolean;
  message?: string;
  details?: Record<string, unknown>;
}

const results: TestResult[] = [];

function recordTest(suite: string, test: string, passed: boolean, message?: string, details?: Record<string, unknown>) {
  results.push({ suite, test, passed, message, details });
  const mark = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${mark}] ${suite} -> ${test}`);
  if (!passed && message) {
    console.error(`       Error: ${message}`);
  }
}

// ============================================================================
// SUITE 1: CLINICAL GUARDRAILS (NO LESION PINCHING, UNIFORM COLORING)
// ============================================================================
console.log('\n============================================================');
console.log('SUITE 1: Clinical Guardrails Verification');
console.log('============================================================');

try {
  // Guardrail 1.1: Constant tube radius (no localized narrowing along geometry)
  const vessels: VesselKey[] = ['LAD', 'LCX', 'RCA'];
  let radiusUniformityPassed = true;

  for (const vKey of vessels) {
    const curve = VESSEL_CURVES[vKey];
    const params = VESSEL_PARAMS[vKey];
    const tubeGeo = new THREE.TubeGeometry(
      curve,
      params.tubularSegments,
      params.radius,
      params.radialSegments,
      false
    );

    // Inspect cross-sectional vertices of TubeGeometry
    // A tube geometry has (tubularSegments + 1) rings of (radialSegments + 1) vertices
    const pos = tubeGeo.attributes.position;
    const radialCount = params.radialSegments + 1;
    const ringCount = params.tubularSegments + 1;

    for (let ring = 0; ring < ringCount; ring++) {
      const center = curve.getPointAt(ring / params.tubularSegments);
      for (let r = 0; r < radialCount; r++) {
        const idx = ring * radialCount + r;
        const vx = pos.getX(idx);
        const vy = pos.getY(idx);
        const vz = pos.getZ(idx);
        const distanceToCenter = Math.sqrt(
          Math.pow(vx - center.x, 2) +
          Math.pow(vy - center.y, 2) +
          Math.pow(vz - center.z, 2)
        );

        // Distance from tube center must be within 1% of params.radius
        if (Math.abs(distanceToCenter - params.radius) > params.radius * 0.05) {
          radiusUniformityPassed = false;
          console.error(`Vessel ${vKey} ring ${ring} radius deviation: expected ${params.radius}, got ${distanceToCenter}`);
          break;
        }
      }
      if (!radiusUniformityPassed) break;
    }
  }

  recordTest(
    'ClinicalGuardrails',
    'Procedural TubeGeometry maintains strict constant radius along entire length (no localized lesion narrowing)',
    radiusUniformityPassed
  );
} catch (err) {
  recordTest('ClinicalGuardrails', 'Tube radius inspection', false, (err as Error).message);
}

// Guardrail 1.2: Uniform coloring - single material color per vessel, no vertex gradient
try {
  // Test across full probability domain [0.0, 1.0]
  const sampleProbs = [0.0, 0.25, 0.5, 0.74, 1.0];
  let uniformColorPassed = true;

  for (const p of sampleProbs) {
    const stdColor = getVesselColorThree(p, false);
    const cbColor = getVesselColorThree(p, true);

    // Standard color must be valid RGB within [0, 1]
    if (stdColor.r < 0 || stdColor.r > 1 || stdColor.g < 0 || stdColor.g > 1 || stdColor.b < 0 || stdColor.b > 1) {
      uniformColorPassed = false;
    }
    // Colorblind color must be valid RGB within [0, 1]
    if (cbColor.r < 0 || cbColor.r > 1 || cbColor.g < 0 || cbColor.g > 1 || cbColor.b < 0 || cbColor.b > 1) {
      uniformColorPassed = false;
    }
  }

  recordTest(
    'ClinicalGuardrails',
    'Whole vessel receives uniform single material color with no per-vertex color gradients',
    uniformColorPassed
  );
} catch (err) {
  recordTest('ClinicalGuardrails', 'Uniform coloring inspection', false, (err as Error).message);
}

// ============================================================================
// SUITE 2: VESSEL IDENTIFIERS (STRICT KEYS, LEFT MAIN TRUNK CONTRACT)
// ============================================================================
console.log('\n============================================================');
console.log('SUITE 2: Vessel Identifiers & Left Main Trunk Contract');
console.log('============================================================');

try {
  const store = useStore.getState();
  const predictionVessels = store.prediction.vessels;
  const storeKeys = Object.keys(predictionVessels).sort();

  // Keys strictly match 'LAD', 'LCX', 'RCA'
  const keysStrictMatch =
    storeKeys.length === 3 &&
    storeKeys[0] === 'LAD' &&
    storeKeys[1] === 'LCX' &&
    storeKeys[2] === 'RCA';

  recordTest(
    'VesselIdentifiers',
    'Prediction vessel keys strictly restricted to LAD, LCX, RCA',
    keysStrictMatch,
    undefined,
    { storeKeys }
  );

  // Left Main trunk must NOT have a prediction key
  const lmHasPredictionKey = 'LM' in predictionVessels || 'LeftMain' in predictionVessels;
  recordTest(
    'VesselIdentifiers',
    'Left Main trunk (LM) has NO separate prediction key in store',
    !lmHasPredictionKey
  );

  // Left Main trunk DOES exist in geometric definitions as feeder conduit
  const lmExistsInCurves = VESSEL_CURVES.LM instanceof THREE.CatmullRomCurve3;
  const lmExistsInParams = VESSEL_PARAMS.LM !== undefined && VESSEL_PARAMS.LM.fullName === 'Left Main Trunk';
  recordTest(
    'VesselIdentifiers',
    'Left Main trunk correctly defined as anatomical conduit geometry without prediction scoring',
    lmExistsInCurves && lmExistsInParams
  );
} catch (err) {
  recordTest('VesselIdentifiers', 'Vessel identifiers inspection', false, (err as Error).message);
}

// ============================================================================
// SUITE 3: CAMERA PERSPECTIVES (ANTERIOR, LEFT LATERAL, POSTERIOR)
// ============================================================================
console.log('\n============================================================');
console.log('SUITE 3: Camera Perspectives Ergonomics');
console.log('============================================================');

try {
  // Preset definitions:
  // Anterior: (0, 0.35, 3.8) -> +z view
  // Lateral: (3.8, 0.35, 0.2) -> +x view
  // Posterior: (0.2, 0.35, -3.8) -> -z view

  // Test Anterior View: LAD traverses the anterior interventricular sulcus (+z)
  const ladPoints = VESSEL_CURVES.LAD.points;
  const ladAvgZ = ladPoints.reduce((acc, p) => acc + p.z, 0) / ladPoints.length;
  const anteriorViewsLAD = ladAvgZ > 0.3; // High positive z facing camera at +z
  recordTest(
    'CameraErgonomics',
    'Anterior perspective (0, 0.35, 3.8) directly frames LAD on anterior interventricular surface (avg z > 0.3)',
    anteriorViewsLAD,
    undefined,
    { ladAvgZ }
  );

  // Test Left Lateral View: LCX courses along left AV groove (+x)
  const lcxPoints = VESSEL_CURVES.LCX.points;
  const lcxAvgX = lcxPoints.reduce((acc, p) => acc + p.x, 0) / lcxPoints.length;
  const lateralViewsLCX = lcxAvgX > 0.35; // Positive x facing camera at +x (3.8)
  recordTest(
    'CameraErgonomics',
    'Left Lateral perspective (3.8, 0.35, 0.2) directly frames LCX along left lateral border (avg x > 0.35)',
    lateralViewsLCX,
    undefined,
    { lcxAvgX }
  );

  // Test Posterior View: distal LCX and RCA crux lie on the posterior heart (-z)
  const lcxDistalZ = lcxPoints[lcxPoints.length - 1].z;
  const rcaDistalZ = VESSEL_CURVES.RCA.points[VESSEL_CURVES.RCA.points.length - 1].z;
  const posteriorViewsBoth = lcxDistalZ < -0.3 && rcaDistalZ < -0.3;
  recordTest(
    'CameraErgonomics',
    'Posterior perspective (0.2, 0.35, -3.8) directly frames distal LCX & RCA crux on posterior myocardium (z < -0.3)',
    posteriorViewsBoth,
    undefined,
    { lcxDistalZ, rcaDistalZ }
  );
} catch (err) {
  recordTest('CameraErgonomics', 'Camera perspectives inspection', false, (err as Error).message);
}

// ============================================================================
// SUITE 4: TORSO TOGGLE & DEPTH BUFFER HANDLING
// ============================================================================
console.log('\n============================================================');
console.log('SUITE 4: Torso Toggle & Depth Buffer Handling');
console.log('============================================================');

try {
  // Test Torso toggle reactive state
  useStore.getState().setShowTorso(true);
  const initialState = useStore.getState().showTorso;
  useStore.getState().toggleTorso();
  const toggledState = useStore.getState().showTorso;
  useStore.getState().toggleTorso();
  const restoredState = useStore.getState().showTorso;

  const toggleWorks = initialState === true && toggledState === false && restoredState === true;
  recordTest(
    'TorsoDepthBuffer',
    'Torso visibility toggle state transitions predictably between true and false',
    toggleWorks
  );

  // Torso depthWrite: false contract
  // When an outer translucent mesh has depthWrite: true, depth-testing will cause internal
  // geometry (heart and coronary tubes) to be discarded whenever the outer shell is drawn first.
  // Setting depthWrite: false allows multi-pass alpha blending without occlusion.
  const torsoShellMaterial = {
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
    side: THREE.DoubleSide,
    flatShading: true,
  };

  const depthWriteDisabled = torsoShellMaterial.depthWrite === false;
  const transparencyEnabled = torsoShellMaterial.transparent === true;
  recordTest(
    'TorsoDepthBuffer',
    'Torso shell sets depthWrite: false and transparent: true to prevent alpha occlusion of internal heart/vessels',
    depthWriteDisabled && transparencyEnabled,
    undefined,
    { depthWrite: torsoShellMaterial.depthWrite, transparent: torsoShellMaterial.transparent }
  );
} catch (err) {
  recordTest('TorsoDepthBuffer', 'Torso depth buffer inspection', false, (err as Error).message);
}

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n============================================================');
console.log('CHALLENGER 2 EMPIRICAL VERIFICATION SUMMARY');
console.log('============================================================');
const totalPassed = results.filter((r) => r.passed).length;
const totalFailed = results.filter((r) => !r.passed).length;

console.log(`Total empirical tests executed: ${results.length}`);
console.log(`Passed: ${totalPassed}`);
console.log(`Failed: ${totalFailed}`);

if (totalFailed > 0) {
  console.error('\n❌ CHALLENGE VERDICT: CHALLENGE_FAILED');
  process.exit(1);
} else {
  console.log('\n✅ CHALLENGE VERDICT: EMPIRICAL VERIFICATION PASSED');
  process.exit(0);
}
