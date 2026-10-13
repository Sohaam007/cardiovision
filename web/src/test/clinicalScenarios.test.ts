import { useStore } from '../store/useStore.ts';
import {
  getVesselColorHex,
  getVesselColorThree,
  getRiskTier,
} from '../scene/vesselConfig.ts';
import {
  assert,
  strictEqual,
} from './assert.ts';

export function runClinicalScenarioTests(): { passed: number; failed: number; tests: string[] } {
  let passed = 0;
  let failed = 0;
  const tests: string[] = [];

  function test(name: string, fn: () => void) {
    try {
      useStore.getState().resetDemoProbabilities();
      fn();
      passed++;
      tests.push(`  [PASS] ${name}`);
    } catch (err) {
      failed++;
      tests.push(`  [FAIL] ${name}: ${(err as Error).message}`);
    }
  }

  // TIER 4: REAL-WORLD CLINICAL SCENARIOS
  test('Tier 4: Scenario A - API Contract Sample Patient (LAD:0.74, LCX:0.31, RCA:0.52)', () => {
    const store = useStore.getState();
    const ladProb = store.prediction.vessels.LAD.prob;
    const lcxProb = store.prediction.vessels.LCX.prob;
    const rcaProb = store.prediction.vessels.RCA.prob;

    // Verify clinical values
    strictEqual(ladProb, 0.74, 'Sample patient LAD probability');
    strictEqual(lcxProb, 0.31, 'Sample patient LCX probability');
    strictEqual(rcaProb, 0.52, 'Sample patient RCA probability');

    // Verify risk categorization
    strictEqual(getRiskTier(ladProb).label, 'High Risk', 'LAD (0.74) must be High Risk');
    strictEqual(getRiskTier(lcxProb).label, 'Low Risk', 'LCX (0.31) must be Low Risk');
    strictEqual(getRiskTier(rcaProb).label, 'Moderate Risk', 'RCA (0.52) must be Moderate Risk');

    // Verify standard palette colors
    const ladHexStd = getVesselColorHex(ladProb, false);
    const lcxHexStd = getVesselColorHex(lcxProb, false);
    const rcaHexStd = getVesselColorHex(rcaProb, false);

    assert(ladHexStd.startsWith('#'), 'LAD standard color hex');
    assert(lcxHexStd.startsWith('#'), 'LCX standard color hex');
    assert(rcaHexStd.startsWith('#'), 'RCA standard color hex');

    // Verify colorblind palette colors
    const ladHexCb = getVesselColorHex(ladProb, true);
    const lcxHexCb = getVesselColorHex(lcxProb, true);
    const rcaHexCb = getVesselColorHex(rcaProb, true);

    assert(ladHexCb !== ladHexStd, 'Colorblind LAD color must differ from standard');
    assert(lcxHexCb !== lcxHexStd, 'Colorblind LCX color must differ from standard');
    assert(rcaHexCb !== rcaHexStd, 'Colorblind RCA color must differ from standard');
  });

  test('Tier 4: Scenario B - Triple Vessel Disease (LAD:0.88, LCX:0.82, RCA:0.91)', () => {
    const { setVesselProbability } = useStore.getState();

    // Patient with multivessel CAD
    setVesselProbability('LAD', 0.88);
    setVesselProbability('LCX', 0.82);
    setVesselProbability('RCA', 0.91);

    const state = useStore.getState();
    const pLAD = state.prediction.vessels.LAD.prob;
    const pLCX = state.prediction.vessels.LCX.prob;
    const pRCA = state.prediction.vessels.RCA.prob;

    // All vessels must trigger high risk tier
    strictEqual(getRiskTier(pLAD).label, 'High Risk');
    strictEqual(getRiskTier(pLCX).label, 'High Risk');
    strictEqual(getRiskTier(pRCA).label, 'High Risk');

    // Standard palette: all vessels strongly red (R component dominant in Three.Color)
    const cLAD = getVesselColorThree(pLAD, false);
    const cLCX = getVesselColorThree(pLCX, false);
    const cRCA = getVesselColorThree(pRCA, false);

    assert(cLAD.r > 0.85 && cLAD.g < 0.50, 'LAD in TVD must be prominent crimson red');
    assert(cLCX.r > 0.85 && cLCX.g < 0.55, 'LCX in TVD must be prominent crimson red');
    assert(cRCA.r > 0.85 && cRCA.g < 0.45, 'RCA in TVD must be prominent crimson red');
  });

  test('Tier 4: Scenario C - Low-Risk Screening Patient (LAD:0.15, LCX:0.20, RCA:0.18)', () => {
    const { setVesselProbability } = useStore.getState();

    // Healthy screening subject
    setVesselProbability('LAD', 0.15);
    setVesselProbability('LCX', 0.20);
    setVesselProbability('RCA', 0.18);

    const state = useStore.getState();
    const pLAD = state.prediction.vessels.LAD.prob;
    const pLCX = state.prediction.vessels.LCX.prob;
    const pRCA = state.prediction.vessels.RCA.prob;

    // All vessels must trigger low risk tier
    strictEqual(getRiskTier(pLAD).label, 'Low Risk');
    strictEqual(getRiskTier(pLCX).label, 'Low Risk');
    strictEqual(getRiskTier(pRCA).label, 'Low Risk');

    // Standard palette: green component dominant in linear-sRGB space
    const cLAD = getVesselColorThree(pLAD, false);
    const cLCX = getVesselColorThree(pLCX, false);
    const cRCA = getVesselColorThree(pRCA, false);

    assert(cLAD.g > cLAD.r && cLAD.g > cLAD.b, 'LAD in screening must have dominant green component');
    assert(cLCX.g > cLCX.r && cLCX.g > cLCX.b, 'LCX in screening must have dominant green component');
    assert(cRCA.g > cRCA.r && cRCA.g > cRCA.b, 'RCA in screening must have dominant green component');
  });

  test('Tier 4: Scenario D - Isolated Critical LAD Stenosis ("Widow Maker" LAD:0.95)', () => {
    const { setVesselProbability } = useStore.getState();

    setVesselProbability('LAD', 0.95);
    setVesselProbability('LCX', 0.10);
    setVesselProbability('RCA', 0.12);

    const state = useStore.getState();
    const pLAD = state.prediction.vessels.LAD.prob;
    const pLCX = state.prediction.vessels.LCX.prob;
    const pRCA = state.prediction.vessels.RCA.prob;

    strictEqual(getRiskTier(pLAD).label, 'High Risk');
    strictEqual(getRiskTier(pLCX).label, 'Low Risk');
    strictEqual(getRiskTier(pRCA).label, 'Low Risk');

    // High visual color contrast between LAD and LCX
    const cLAD = getVesselColorThree(pLAD, false);
    const cLCX = getVesselColorThree(pLCX, false);

    // Euclidean RGB distance between critical LAD and healthy LCX
    const colorDistance = Math.sqrt(
      Math.pow(cLAD.r - cLCX.r, 2) +
      Math.pow(cLAD.g - cLCX.g, 2) +
      Math.pow(cLAD.b - cLCX.b, 2)
    );

    assert(colorDistance > 0.5, 'Critical LAD must have high visual contrast against healthy circumflex');
  });

  return { passed, failed, tests };
}

// Standalone execution support
if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/') || '')) {
  console.log('--- Running clinicalScenarios.test.ts ---');
  const result = runClinicalScenarioTests();
  result.tests.forEach((t) => console.log(t));
  console.log(`Summary: ${result.passed} passed, ${result.failed} failed.`);
  if (result.failed > 0) process.exit(1);
}
