import * as THREE from 'three';
import { useStore, VesselKey } from '../store/useStore.ts';
import {
  VESSEL_CURVES,
  VESSEL_PARAMS,
  getVesselColorThree,
  getVesselColorHex,
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
// SUITE 1: COLOR INTERPOLATION MATH ACROSS STANDARD AND COLORBLIND PALETTES
// ============================================================================
console.log('\n============================================================');
console.log('SUITE 1: Color Interpolation Math Across Standard & Colorblind Palettes');
console.log('============================================================');

const boundaryTestPoints = [-1.0, 0.0, 0.001, 0.499, 0.5, 0.501, 0.999, 1.0, 2.0];

// Test 1.1: Standard palette boundaries and clamping
try {
  const stdColors: Record<number, string> = {};
  for (const p of boundaryTestPoints) {
    stdColors[p] = getVesselColorHex(p, false).toLowerCase();
  }

  // p = -1 and p = 0 must match low stop (#10b981)
  const pUnderClamped = stdColors[-1.0] === '#10b981';
  const pZero = stdColors[0.0] === '#10b981';
  recordTest('ColorMath', 'Standard p=-1 clamps to low stop #10b981', pUnderClamped, undefined, { color: stdColors[-1.0] });
  recordTest('ColorMath', 'Standard p=0 matches low stop #10b981', pZero, undefined, { color: stdColors[0.0] });

  // p = 0.5 must match mid stop (#f59e0b)
  const pMid = stdColors[0.5] === '#f59e0b';
  recordTest('ColorMath', 'Standard p=0.5 matches mid stop #f59e0b', pMid, undefined, { color: stdColors[0.5] });

  // p = 1.0 and p = 2.0 must match high stop (#ef4444)
  const pOne = stdColors[1.0] === '#ef4444';
  const pOverClamped = stdColors[2.0] === '#ef4444';
  recordTest('ColorMath', 'Standard p=1.0 matches high stop #ef4444', pOne, undefined, { color: stdColors[1.0] });
  recordTest('ColorMath', 'Standard p=2.0 clamps to high stop #ef4444', pOverClamped, undefined, { color: stdColors[2.0] });

  // Boundary transitions around 0.5
  const color0_499 = getVesselColorThree(0.499, false);
  const color0_500 = getVesselColorThree(0.500, false);
  const color0_501 = getVesselColorThree(0.501, false);

  const deltaBelow = Math.sqrt(
    Math.pow(color0_500.r - color0_499.r, 2) +
    Math.pow(color0_500.g - color0_499.g, 2) +
    Math.pow(color0_500.b - color0_499.b, 2)
  );
  const deltaAbove = Math.sqrt(
    Math.pow(color0_501.r - color0_500.r, 2) +
    Math.pow(color0_501.g - color0_500.g, 2) +
    Math.pow(color0_501.b - color0_500.b, 2)
  );

  const smoothBoundary = deltaBelow < 0.01 && deltaAbove < 0.01;
  recordTest('ColorMath', 'Standard smooth boundary transition around p=0.5 (delta < 0.01)', smoothBoundary, undefined, { deltaBelow, deltaAbove });
} catch (err) {
  recordTest('ColorMath', 'Standard palette boundaries execution', false, (err as Error).message);
}

// Test 1.2: Colorblind palette boundaries and clamping
try {
  const cbColors: Record<number, string> = {};
  for (const p of boundaryTestPoints) {
    cbColors[p] = getVesselColorHex(p, true).toLowerCase();
  }

  // p = -1 and p = 0 must match low stop (#3b82f6)
  const cbUnderClamped = cbColors[-1.0] === '#3b82f6';
  const cbZero = cbColors[0.0] === '#3b82f6';
  recordTest('ColorMath', 'Colorblind p=-1 clamps to low stop #3b82f6', cbUnderClamped, undefined, { color: cbColors[-1.0] });
  recordTest('ColorMath', 'Colorblind p=0 matches low stop #3b82f6', cbZero, undefined, { color: cbColors[0.0] });

  // p = 0.5 must match mid stop (#f97316)
  const cbMid = cbColors[0.5] === '#f97316';
  recordTest('ColorMath', 'Colorblind p=0.5 matches mid stop #f97316', cbMid, undefined, { color: cbColors[0.5] });

  // p = 1.0 and p = 2.0 must match high stop (#d946ef)
  const cbOne = cbColors[1.0] === '#d946ef';
  const cbOverClamped = cbColors[2.0] === '#d946ef';
  recordTest('ColorMath', 'Colorblind p=1.0 matches high stop #d946ef', cbOne, undefined, { color: cbColors[1.0] });
  recordTest('ColorMath', 'Colorblind p=2.0 clamps to high stop #d946ef', cbOverClamped, undefined, { color: cbColors[2.0] });

  // Boundary transitions around 0.5
  const cbColor0_499 = getVesselColorThree(0.499, true);
  const cbColor0_500 = getVesselColorThree(0.500, true);
  const cbColor0_501 = getVesselColorThree(0.501, true);

  const cbDeltaBelow = Math.sqrt(
    Math.pow(cbColor0_500.r - cbColor0_499.r, 2) +
    Math.pow(cbColor0_500.g - cbColor0_499.g, 2) +
    Math.pow(cbColor0_500.b - cbColor0_499.b, 2)
  );
  const cbDeltaAbove = Math.sqrt(
    Math.pow(cbColor0_501.r - cbColor0_500.r, 2) +
    Math.pow(cbColor0_501.g - cbColor0_500.g, 2) +
    Math.pow(cbColor0_501.b - cbColor0_500.b, 2)
  );

  const cbSmoothBoundary = cbDeltaBelow < 0.01 && cbDeltaAbove < 0.01;
  recordTest('ColorMath', 'Colorblind smooth boundary transition around p=0.5 (delta < 0.01)', cbSmoothBoundary, undefined, { cbDeltaBelow, cbDeltaAbove });
} catch (err) {
  recordTest('ColorMath', 'Colorblind palette boundaries execution', false, (err as Error).message);
}

// Test 1.3: Continuous smooth RGB transition test across 1000 uniform steps
try {
  let maxStdDelta = 0;
  let maxCbDelta = 0;
  let stdPrev = getVesselColorThree(0, false);
  let cbPrev = getVesselColorThree(0, true);

  const steps = 1000;
  for (let i = 1; i <= steps; i++) {
    const p = i / steps;
    const stdCurr = getVesselColorThree(p, false);
    const cbCurr = getVesselColorThree(p, true);

    const stdDelta = Math.sqrt(
      Math.pow(stdCurr.r - stdPrev.r, 2) +
      Math.pow(stdCurr.g - stdPrev.g, 2) +
      Math.pow(stdCurr.b - stdPrev.b, 2)
    );
    const cbDelta = Math.sqrt(
      Math.pow(cbCurr.r - cbPrev.r, 2) +
      Math.pow(cbCurr.g - cbPrev.g, 2) +
      Math.pow(cbCurr.b - cbPrev.b, 2)
    );

    if (stdDelta > maxStdDelta) maxStdDelta = stdDelta;
    if (cbDelta > maxCbDelta) maxCbDelta = cbDelta;

    stdPrev = stdCurr;
    cbPrev = cbCurr;
  }

  // Max step delta for delta_p = 0.001 should be well under 0.005 for smooth interpolation
  const stdSmooth = maxStdDelta < 0.005;
  const cbSmooth = maxCbDelta < 0.005;

  recordTest('ColorMath', 'Standard palette 1000-step smoothness (max delta < 0.005)', stdSmooth, undefined, { maxStdDelta });
  recordTest('ColorMath', 'Colorblind palette 1000-step smoothness (max delta < 0.005)', cbSmooth, undefined, { maxCbDelta });
} catch (err) {
  recordTest('ColorMath', 'Smoothness sweep test execution', false, (err as Error).message);
}

// ============================================================================
// SUITE 2: EMPIRICALLY STRESS-TEST ZUSTAND STORE
// ============================================================================
console.log('\n============================================================');
console.log('SUITE 2: Empirically Stress-Test Zustand Store');
console.log('============================================================');

useStore.getState().resetDemoProbabilities();

// Test 2.1: State isolation between LAD, LCX, RCA
try {
  const vessels: VesselKey[] = ['LAD', 'LCX', 'RCA'];
  let isolationPassed = true;
  const failureNotes: string[] = [];

  for (const target of vessels) {
    // Record baselines for other vessels
    const others = vessels.filter((v) => v !== target);
    const initialValues = others.map((v) => ({
      key: v,
      prob: useStore.getState().prediction.vessels[v].prob,
      label: useStore.getState().prediction.vessels[v].label,
    }));

    // Update target to 0.1234
    useStore.getState().setVesselProbability(target, 0.1234);

    // Verify target updated
    if (useStore.getState().prediction.vessels[target].prob !== 0.1234) {
      isolationPassed = false;
      failureNotes.push(`Target ${target} did not update to 0.1234`);
    }

    // Verify others untouched
    for (const other of initialValues) {
      const current = useStore.getState().prediction.vessels[other.key];
      if (current.prob !== other.prob) {
        isolationPassed = false;
        failureNotes.push(`Target update of ${target} mutated ${other.key}.prob from ${other.prob} to ${current.prob}`);
      }
      if (current.label !== other.label) {
        isolationPassed = false;
        failureNotes.push(`Target update of ${target} mutated ${other.key}.label from ${other.label} to ${current.label}`);
      }
    }
  }

  recordTest('StoreStress', 'State isolation strictly preserved between LAD, LCX, RCA', isolationPassed, failureNotes.join('; '));
} catch (err) {
  recordTest('StoreStress', 'State isolation execution', false, (err as Error).message);
}

// Test 2.2: 100 rapid sequential updates maintain consistency
try {
  let monotonicConsistencyPassed = true;
  const { setVesselProbability } = useStore.getState();

  for (let i = 1; i <= 100; i++) {
    const p = i / 100;
    setVesselProbability('LAD', p);
    const recorded = useStore.getState().prediction.vessels.LAD.prob;
    const expected = Number(p.toFixed(4));
    if (recorded !== expected) {
      monotonicConsistencyPassed = false;
      break;
    }
  }

  const finalLAD = useStore.getState().prediction.vessels.LAD.prob;
  const passed100 = monotonicConsistencyPassed && finalLAD === 1.0;
  recordTest('StoreStress', '100 rapid sequential updates maintain mathematical consistency and final=1.0', passed100, undefined, { finalLAD });

  // 100 interleaved pseudo-random updates across all vessels
  let interleavedPassed = true;
  for (let i = 0; i < 100; i++) {
    const v: VesselKey = i % 3 === 0 ? 'LAD' : i % 3 === 1 ? 'LCX' : 'RCA';
    const val = Number(((i * 17 + 23) % 101 / 100).toFixed(4));
    setVesselProbability(v, val);
    if (useStore.getState().prediction.vessels[v].prob !== val) {
      interleavedPassed = false;
      break;
    }
  }
  recordTest('StoreStress', '100 interleaved updates across LAD, LCX, RCA maintain consistency', interleavedPassed);
} catch (err) {
  recordTest('StoreStress', '100 updates execution', false, (err as Error).message);
}

// Test 2.3: resetDemoProbabilities completely resets to baseline
try {
  const store = useStore.getState();
  // Thoroughly perturb state
  store.setVesselProbability('LAD', 0.05);
  store.setVesselProbability('LCX', 0.95);
  store.setVesselProbability('RCA', 0.15);
  store.setColorblindMode(true);
  store.setShowTorso(false);
  store.setHeartOpacity(0.25);
  store.setSelectedVessel('LCX');
  store.setHoveredVessel('LAD');
  store.setCameraPreset('lateral');

  // Perform reset
  store.resetDemoProbabilities();

  const resetState = useStore.getState();
  const resetVessels = resetState.prediction.vessels;

  const baselineValid =
    resetVessels.LAD.prob === 0.74 && resetVessels.LAD.label === 1 &&
    resetVessels.LCX.prob === 0.31 && resetVessels.LCX.label === 0 &&
    resetVessels.RCA.prob === 0.52 && resetVessels.RCA.label === 1 &&
    resetState.colorblindMode === false &&
    resetState.showTorso === true &&
    resetState.heartOpacity === 0.92 &&
    resetState.selectedVessel === null &&
    resetState.hoveredVessel === null &&
    resetState.cameraPreset === null;

  recordTest('StoreStress', 'resetDemoProbabilities completely restores baseline defaults', baselineValid, undefined, {
    LAD: resetVessels.LAD,
    LCX: resetVessels.LCX,
    RCA: resetVessels.RCA,
    colorblindMode: resetState.colorblindMode,
    showTorso: resetState.showTorso,
    heartOpacity: resetState.heartOpacity,
  });
} catch (err) {
  recordTest('StoreStress', 'resetDemoProbabilities execution', false, (err as Error).message);
}

// ============================================================================
// SUITE 3: EMPIRICALLY VERIFY DEMAND RENDERING CONTRACT
// ============================================================================
console.log('\n============================================================');
console.log('SUITE 3: Empirically Verify Demand Rendering Contract');
console.log('============================================================');

try {
  useStore.getState().resetDemoProbabilities();
  let invalidationCalls = 0;
  const mockInvalidate = () => {
    invalidationCalls++;
  };

  // DemandInvalidator subscribes to useStore
  const unsubscribe = useStore.subscribe(() => {
    mockInvalidate();
  });

  // Verify idle scene triggers 0 invalidations
  const idleCount = invalidationCalls;
  recordTest('DemandRendering', 'Idle scene triggers 0 invalidations (0% GPU drain)', idleCount === 0, undefined, { idleCount });

  // Test reactive store mutations triggering invalidations
  useStore.getState().setVesselProbability('LAD', 0.88);
  const afterLAD = invalidationCalls;
  recordTest('DemandRendering', 'LAD probability update triggers invalidate()', afterLAD === 1, undefined, { afterLAD });

  useStore.getState().toggleColorblindMode();
  const afterCB = invalidationCalls;
  recordTest('DemandRendering', 'Colorblind toggle triggers invalidate()', afterCB === 2, undefined, { afterCB });

  useStore.getState().toggleTorso();
  const afterTorso = invalidationCalls;
  recordTest('DemandRendering', 'Torso toggle triggers invalidate()', afterTorso === 3, undefined, { afterTorso });

  useStore.getState().setHeartOpacity(0.5);
  const afterOpacity = invalidationCalls;
  recordTest('DemandRendering', 'Heart opacity slider triggers invalidate()', afterOpacity === 4, undefined, { afterOpacity });

  useStore.getState().setSelectedVessel('RCA');
  const afterSelect = invalidationCalls;
  recordTest('DemandRendering', 'Vessel selection triggers invalidate()', afterSelect === 5, undefined, { afterSelect });

  useStore.getState().resetDemoProbabilities();
  const afterReset = invalidationCalls;
  recordTest('DemandRendering', 'resetDemoProbabilities triggers invalidate()', afterReset === 6, undefined, { afterReset });

  // Clean unsubscribe
  unsubscribe();
  useStore.getState().setVesselProbability('LAD', 0.11);
  const afterUnsub = invalidationCalls;
  recordTest('DemandRendering', 'Unsubscribed listener does not trigger invalidate()', afterUnsub === 6, undefined, { afterUnsub });
} catch (err) {
  recordTest('DemandRendering', 'Demand rendering contract execution', false, (err as Error).message);
}

// ============================================================================
// SUITE 4: TRIANGLE COUNT AND GEOMETRY SANITY CHECK
// ============================================================================
console.log('\n============================================================');
console.log('SUITE 4: Triangle Count & Geometry Sanity Check');
console.log('============================================================');

function getTriangles(geo: THREE.BufferGeometry): number {
  if (geo.index) {
    return geo.index.count / 3;
  }
  return geo.attributes.position ? geo.attributes.position.count / 3 : 0;
}

try {
  // Reconstruct exact Heart geometries as in Heart.tsx
  const myocardiumGeo = new THREE.SphereGeometry(1.0, 48, 36);
  const rightAtriumGeo = new THREE.SphereGeometry(1.0, 24, 20);
  const leftAtriumGeo = new THREE.SphereGeometry(1.0, 24, 20);
  const aortaGeo = new THREE.CylinderGeometry(0.20, 0.22, 0.75, 24);
  const pulmonaryGeo = new THREE.CylinderGeometry(0.16, 0.18, 0.65, 20);
  const svcGeo = new THREE.CylinderGeometry(0.12, 0.13, 0.55, 16);

  const myocardiumTriangles = getTriangles(myocardiumGeo);
  const rightAtriumTriangles = getTriangles(rightAtriumGeo);
  const leftAtriumTriangles = getTriangles(leftAtriumGeo);
  const aortaTriangles = getTriangles(aortaGeo);
  const pulmonaryTriangles = getTriangles(pulmonaryGeo);
  const svcTriangles = getTriangles(svcGeo);

  const totalHeartTriangles =
    myocardiumTriangles +
    rightAtriumTriangles +
    leftAtriumTriangles +
    aortaTriangles +
    pulmonaryTriangles +
    svcTriangles;

  console.log(`Heart geometry breakdown:`);
  console.log(`  - Myocardium (Sphere 48x36): ${myocardiumTriangles} tris`);
  console.log(`  - Right Atrium (Sphere 24x20): ${rightAtriumTriangles} tris`);
  console.log(`  - Left Atrium (Sphere 24x20): ${leftAtriumTriangles} tris`);
  console.log(`  - Aorta Root (Cylinder 24 seg): ${aortaTriangles} tris`);
  console.log(`  - Pulmonary Trunk (Cylinder 20 seg): ${pulmonaryTriangles} tris`);
  console.log(`  - SVC (Cylinder 16 seg): ${svcTriangles} tris`);
  console.log(`  Total Heart Triangles: ${totalHeartTriangles}`);

  const heartWithinBudget = totalHeartTriangles <= 40000;
  const heartAround5600 = totalHeartTriangles >= 5000 && totalHeartTriangles <= 7000;

  recordTest('GeometrySanity', 'Heart compound mesh <= 40,000 triangles budget', heartWithinBudget, undefined, { totalHeartTriangles, limit: 40000 });
  recordTest('GeometrySanity', 'Heart compound mesh actual count ~5,600 (within 5k-7k range)', heartAround5600, undefined, { totalHeartTriangles, actual: totalHeartTriangles });

  // Torso geometry
  const torsoGeo = new THREE.CylinderGeometry(1.65, 1.30, 3.8, 12, 4);
  const torsoTriangles = getTriangles(torsoGeo);
  console.log(`  Torso Shell Triangles: ${torsoTriangles} tris`);

  const torsoIsLowPoly = torsoTriangles <= 500;
  recordTest('GeometrySanity', 'Torso mesh is low-poly faceted (<= 500 triangles)', torsoIsLowPoly, undefined, { torsoTriangles });

  // Vessel geometries
  const lmGeo = new THREE.TubeGeometry(VESSEL_CURVES.LM, VESSEL_PARAMS.LM.tubularSegments, VESSEL_PARAMS.LM.radius, VESSEL_PARAMS.LM.radialSegments, false);
  const ladGeo = new THREE.TubeGeometry(VESSEL_CURVES.LAD, VESSEL_PARAMS.LAD.tubularSegments, VESSEL_PARAMS.LAD.radius, VESSEL_PARAMS.LAD.radialSegments, false);
  const lcxGeo = new THREE.TubeGeometry(VESSEL_CURVES.LCX, VESSEL_PARAMS.LCX.tubularSegments, VESSEL_PARAMS.LCX.radius, VESSEL_PARAMS.LCX.radialSegments, false);
  const rcaGeo = new THREE.TubeGeometry(VESSEL_CURVES.RCA, VESSEL_PARAMS.RCA.tubularSegments, VESSEL_PARAMS.RCA.radius, VESSEL_PARAMS.RCA.radialSegments, false);

  const lmTriangles = getTriangles(lmGeo);
  const ladTriangles = getTriangles(ladGeo);
  const lcxTriangles = getTriangles(lcxGeo);
  const rcaTriangles = getTriangles(rcaGeo);
  const totalVesselTriangles = lmTriangles + ladTriangles + lcxTriangles + rcaTriangles;

  console.log(`Vessel tubes breakdown:`);
  console.log(`  - LM: ${lmTriangles} tris`);
  console.log(`  - LAD: ${ladTriangles} tris`);
  console.log(`  - LCX: ${lcxTriangles} tris`);
  console.log(`  - RCA: ${rcaTriangles} tris`);
  console.log(`  Total Vessel Triangles: ${totalVesselTriangles}`);

  const totalSceneTriangles = totalHeartTriangles + torsoTriangles + totalVesselTriangles;
  console.log(`  TOTAL SCENE TRIANGLES (Heart + Torso + Vessels): ${totalSceneTriangles}`);

  recordTest('GeometrySanity', 'Total 3D scene triangle budget <= 40,000', totalSceneTriangles <= 40000, undefined, { totalSceneTriangles });
} catch (err) {
  recordTest('GeometrySanity', 'Geometry sanity execution', false, (err as Error).message);
}

// ============================================================================
// FINAL SUMMARY
// ============================================================================
console.log('\n============================================================');
console.log('CHALLENGER EMPIRICAL VERIFICATION SUMMARY');
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
