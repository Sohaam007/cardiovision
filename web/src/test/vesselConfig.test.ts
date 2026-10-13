import * as THREE from 'three';
import {
  PALETTES,
  VESSEL_PARAMS,
  VESSEL_CURVES,
  getVesselColorThree,
  getVesselColorHex,
  getRiskTier,
} from '../scene/vesselConfig.ts';
import {
  assert,
  strictEqual,
  deepStrictEqual,
  closeTo,
} from './assert.ts';

export function runVesselConfigTests(): { passed: number; failed: number; tests: string[] } {
  let passed = 0;
  let failed = 0;
  const tests: string[] = [];

  function test(name: string, fn: () => void) {
    try {
      fn();
      passed++;
      tests.push(`  [PASS] ${name}`);
    } catch (err) {
      failed++;
      tests.push(`  [FAIL] ${name}: ${(err as Error).message}`);
    }
  }

  // TIER 1: FEATURE COVERAGE & CONTRACTS
  test('Tier 1: Standard and colorblind palettes define exact required color stops', () => {
    // Standard palette: Green (#10b981), Amber (#f59e0b), Red (#ef4444)
    strictEqual(PALETTES.standard.low.toLowerCase(), '#10b981', 'Standard low risk must be Emerald Green');
    strictEqual(PALETTES.standard.mid.toLowerCase(), '#f59e0b', 'Standard mid risk must be Amber Yellow');
    strictEqual(PALETTES.standard.high.toLowerCase(), '#ef4444', 'Standard high risk must be Crimson Red');

    // Colorblind palette: Blue (#3b82f6), Orange (#f97316), Magenta (#d946ef)
    strictEqual(PALETTES.colorblind.low.toLowerCase(), '#3b82f6', 'Colorblind low risk must be Royal Blue');
    strictEqual(PALETTES.colorblind.mid.toLowerCase(), '#f97316', 'Colorblind mid risk must be Vivid Orange');
    strictEqual(PALETTES.colorblind.high.toLowerCase(), '#d946ef', 'Colorblind high risk must be Magenta');
  });

  test('Tier 1: Vessel parameters strictly cover LM, LAD, LCX, and RCA', () => {
    const keys = Object.keys(VESSEL_PARAMS).sort();
    deepStrictEqual(keys, ['LAD', 'LCX', 'LM', 'RCA']);

    for (const k of ['LM', 'LAD', 'LCX', 'RCA'] as const) {
      const p = VESSEL_PARAMS[k];
      assert(p.radius > 0, `${k} radius must be positive`);
      assert(p.proxyRadius >= p.radius * 2.0, `${k} proxyRadius must be >= 2x visible radius for raycasting`);
      assert(p.tubularSegments >= 16, `${k} tubularSegments must be >= 16`);
      assert(p.radialSegments >= 6, `${k} radialSegments must be >= 6`);
      assert(p.fullName.length > 0, `${k} fullName must be non-empty`);
      strictEqual(p.code, k, `${k} code must match key`);
    }
  });

  test('Tier 1: CatmullRomCurve3 curves exist with anatomical trajectories', () => {
    const keys = Object.keys(VESSEL_CURVES).sort();
    deepStrictEqual(keys, ['LAD', 'LCX', 'LM', 'RCA']);

    for (const k of ['LM', 'LAD', 'LCX', 'RCA'] as const) {
      const curve = VESSEL_CURVES[k];
      assert(curve instanceof THREE.CatmullRomCurve3, `${k} must be CatmullRomCurve3`);
      assert(curve.points.length >= 3, `${k} must have at least 3 control points`);
    }

    // LAD must traverse down towards inferior apex (-y, +z)
    const ladPoints = VESSEL_CURVES.LAD.points;
    const ladStart = ladPoints[0];
    const ladEnd = ladPoints[ladPoints.length - 1];
    assert(ladEnd.y < ladStart.y, 'LAD must course inferiorly towards apex');
    assert(ladEnd.z > 0, 'LAD apex must remain on anterior surface');

    // LCX must wrap to posterior surface (-z)
    const lcxPoints = VESSEL_CURVES.LCX.points;
    const lcxEnd = lcxPoints[lcxPoints.length - 1];
    assert(lcxEnd.z < 0, 'LCX must wrap around to posterior myocardium');

    // RCA must wrap from right AV sulcus (-x) to posterior crux (-z)
    const rcaPoints = VESSEL_CURVES.RCA.points;
    const rcaMid = rcaPoints[2];
    const rcaEnd = rcaPoints[rcaPoints.length - 1];
    assert(rcaMid.x < 0, 'RCA must course along patient right / screen left');
    assert(rcaEnd.z < 0, 'RCA must terminate at posterior crux');
  });

  // TIER 2: BOUNDARY & CORNER CASES (COLOR MATH)
  test('Tier 2: Standard palette exact boundary values (0.0, 0.5, 1.0)', () => {
    strictEqual(getVesselColorHex(0.0, false), '#10b981', 'p=0.0 must be #10b981');
    strictEqual(getVesselColorHex(0.5, false), '#f59e0b', 'p=0.5 must be #f59e0b');
    strictEqual(getVesselColorHex(1.0, false), '#ef4444', 'p=1.0 must be #ef4444');
  });

  test('Tier 2: Colorblind palette exact boundary values (0.0, 0.5, 1.0)', () => {
    strictEqual(getVesselColorHex(0.0, true), '#3b82f6', 'p=0.0 colorblind must be #3b82f6');
    strictEqual(getVesselColorHex(0.5, true), '#f97316', 'p=0.5 colorblind must be #f97316');
    strictEqual(getVesselColorHex(1.0, true), '#d946ef', 'p=1.0 colorblind must be #d946ef');
  });

  test('Tier 2: Out-of-bounds probability clamping (p < 0.0 and p > 1.0)', () => {
    // Underflow clamped to 0.0
    strictEqual(getVesselColorHex(-0.01, false), '#10b981');
    strictEqual(getVesselColorHex(-999.0, false), '#10b981');
    strictEqual(getVesselColorHex(-0.5, true), '#3b82f6');

    // Overflow clamped to 1.0
    strictEqual(getVesselColorHex(1.001, false), '#ef4444');
    strictEqual(getVesselColorHex(100.0, false), '#ef4444');
    strictEqual(getVesselColorHex(2.5, true), '#d946ef');

    // Non-finite / NaN fallback to 0.5
    strictEqual(getVesselColorHex(NaN, false), '#f59e0b', 'NaN must fallback to 0.5 (#f59e0b)');
    strictEqual(getVesselColorHex(NaN, true), '#f97316', 'NaN colorblind must fallback to 0.5 (#f97316)');
  });

  test('Tier 2: Continuous piecewise linear RGB interpolation formula verification', () => {
    // Test at p = 0.25 (halfway between low and mid)
    const colQuarter = getVesselColorThree(0.25, false);
    const low = new THREE.Color(PALETTES.standard.low);
    const mid = new THREE.Color(PALETTES.standard.mid);
    const expectedQuarter = new THREE.Color().lerpColors(low, mid, 0.5);

    closeTo(colQuarter.r, expectedQuarter.r, 0.001, 'Quarter point R channel');
    closeTo(colQuarter.g, expectedQuarter.g, 0.001, 'Quarter point G channel');
    closeTo(colQuarter.b, expectedQuarter.b, 0.001, 'Quarter point B channel');

    // Test at p = 0.75 (halfway between mid and high)
    const colThreeQuarter = getVesselColorThree(0.75, false);
    const high = new THREE.Color(PALETTES.standard.high);
    const expectedThreeQuarter = new THREE.Color().lerpColors(mid, high, 0.5);

    closeTo(colThreeQuarter.r, expectedThreeQuarter.r, 0.001, 'Three-quarter point R channel');
    closeTo(colThreeQuarter.g, expectedThreeQuarter.g, 0.001, 'Three-quarter point G channel');
    closeTo(colThreeQuarter.b, expectedThreeQuarter.b, 0.001, 'Three-quarter point B channel');
  });

  test('Tier 2: Risk tier categorization and threshold boundaries', () => {
    // Low risk: p < 0.40
    strictEqual(getRiskTier(0.0).label, 'Low Risk');
    strictEqual(getRiskTier(0.39).label, 'Low Risk');

    // Moderate risk: 0.40 <= p < 0.70
    strictEqual(getRiskTier(0.40).label, 'Moderate Risk');
    strictEqual(getRiskTier(0.55).label, 'Moderate Risk');
    strictEqual(getRiskTier(0.69).label, 'Moderate Risk');

    // High risk: p >= 0.70
    strictEqual(getRiskTier(0.70).label, 'High Risk');
    strictEqual(getRiskTier(0.85).label, 'High Risk');
    strictEqual(getRiskTier(1.0).label, 'High Risk');
  });

  // TIER 3: CROSS-FEATURE INTERACTIONS (PALETTE SWITCHING & COLOR CONTINUITY)
  test('Tier 3: Colorblind toggle instantly switches palette without changing probability', () => {
    const testProb = 0.65;
    const stdColor = getVesselColorHex(testProb, false);
    const cbColor = getVesselColorHex(testProb, true);

    // Standard is reddish-amber, Colorblind is purplish-orange
    assert(stdColor !== cbColor, 'Standard and Colorblind colors must differ for p=0.65');
    assert(stdColor.startsWith('#'), 'Must be valid hex');
    assert(cbColor.startsWith('#'), 'Must be valid hex');

    // Toggling back produces identical standard color
    const stdColorBack = getVesselColorHex(testProb, false);
    strictEqual(stdColorBack, stdColor, 'Toggling back must produce identical standard color');
  });

  return { passed, failed, tests };
}

// Standalone execution support
if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/') || '')) {
  console.log('--- Running vesselConfig.test.ts ---');
  const result = runVesselConfigTests();
  result.tests.forEach((t) => console.log(t));
  console.log(`Summary: ${result.passed} passed, ${result.failed} failed.`);
  if (result.failed > 0) process.exit(1);
}
