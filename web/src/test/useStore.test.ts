import { useStore } from '../store/useStore.ts';
import {
  strictEqual,
  deepStrictEqual,
  closeTo,
} from './assert.ts';

export function runUseStoreTests(): { passed: number; failed: number; tests: string[] } {
  let passed = 0;
  let failed = 0;
  const tests: string[] = [];

  function test(name: string, fn: () => void) {
    try {
      // Always reset store before each test for independence
      useStore.getState().resetDemoProbabilities();
      fn();
      passed++;
      tests.push(`  [PASS] ${name}`);
    } catch (err) {
      failed++;
      tests.push(`  [FAIL] ${name}: ${(err as Error).message}`);
    }
  }

  // TIER 1: FEATURE COVERAGE & STORE CONTRACTS
  test('Tier 1: Store keys strictly match LAD, LCX, and RCA', () => {
    const state = useStore.getState();
    const vesselKeys = Object.keys(state.prediction.vessels).sort();
    deepStrictEqual(vesselKeys, ['LAD', 'LCX', 'RCA'], 'Vessel keys must be strictly LAD, LCX, RCA');
  });

  test('Tier 1: Default initial patient probabilities match API contract sample', () => {
    const state = useStore.getState();
    strictEqual(state.prediction.vessels.LAD.prob, 0.74, 'Default LAD prob must be 0.74');
    strictEqual(state.prediction.vessels.LAD.label, 1, 'Default LAD label must be 1');
    strictEqual(state.prediction.vessels.LCX.prob, 0.31, 'Default LCX prob must be 0.31');
    strictEqual(state.prediction.vessels.LCX.label, 0, 'Default LCX label must be 0');
    strictEqual(state.prediction.vessels.RCA.prob, 0.52, 'Default RCA prob must be 0.52');
    strictEqual(state.prediction.vessels.RCA.label, 1, 'Default RCA label must be 1');
  });

  test('Tier 1: Initial visual and toggle defaults are correctly set', () => {
    const state = useStore.getState();
    strictEqual(state.colorblindMode, false, 'Default colorblindMode must be false');
    strictEqual(state.showTorso, true, 'Default showTorso must be true');
    strictEqual(state.heartOpacity, 0.92, 'Default heartOpacity must be 0.92');
    strictEqual(state.selectedVessel, null, 'Default selectedVessel must be null');
    strictEqual(state.hoveredVessel, null, 'Default hoveredVessel must be null');
  });

  test('Tier 1: setVesselProbability updates target vessel and preserves label', () => {
    const { setVesselProbability } = useStore.getState();
    setVesselProbability('LAD', 0.85);
    const state = useStore.getState();
    strictEqual(state.prediction.vessels.LAD.prob, 0.85);
    strictEqual(state.prediction.vessels.LAD.label, 1, 'Label must be preserved');
  });

  test('Tier 1: Colorblind toggle actions operate correctly', () => {
    const { setColorblindMode, toggleColorblindMode } = useStore.getState();
    setColorblindMode(true);
    strictEqual(useStore.getState().colorblindMode, true);
    toggleColorblindMode();
    strictEqual(useStore.getState().colorblindMode, false);
    toggleColorblindMode();
    strictEqual(useStore.getState().colorblindMode, true);
  });

  test('Tier 1: Torso visibility toggle actions operate correctly', () => {
    const { setShowTorso, toggleTorso } = useStore.getState();
    setShowTorso(false);
    strictEqual(useStore.getState().showTorso, false);
    toggleTorso();
    strictEqual(useStore.getState().showTorso, true);
    toggleTorso();
    strictEqual(useStore.getState().showTorso, false);
  });

  test('Tier 1: Selection and hover vessel states update correctly', () => {
    const { setSelectedVessel, setHoveredVessel } = useStore.getState();
    setSelectedVessel('LAD');
    strictEqual(useStore.getState().selectedVessel, 'LAD');
    setHoveredVessel('LCX');
    strictEqual(useStore.getState().hoveredVessel, 'LCX');
    setSelectedVessel(null);
    setHoveredVessel(null);
    strictEqual(useStore.getState().selectedVessel, null);
    strictEqual(useStore.getState().hoveredVessel, null);
  });

  // TIER 2: BOUNDARY & CORNER CASES
  test('Tier 2: Probability clamping on negative values (p < 0)', () => {
    const { setVesselProbability } = useStore.getState();
    setVesselProbability('LAD', -0.05);
    strictEqual(useStore.getState().prediction.vessels.LAD.prob, 0.0);
    setVesselProbability('LCX', -100);
    strictEqual(useStore.getState().prediction.vessels.LCX.prob, 0.0);
  });

  test('Tier 2: Probability clamping on overflow values (p > 1) and NaN fallback', () => {
    const { setVesselProbability } = useStore.getState();
    setVesselProbability('LAD', 1.05);
    strictEqual(useStore.getState().prediction.vessels.LAD.prob, 1.0);
    setVesselProbability('RCA', 999);
    strictEqual(useStore.getState().prediction.vessels.RCA.prob, 1.0);
    setVesselProbability('LCX', NaN);
    strictEqual(useStore.getState().prediction.vessels.LCX.prob, 0.5, 'NaN probability must safely fallback to 0.5');
  });

  test('Tier 2: Exact probability boundary values (0.0, 0.5, 1.0)', () => {
    const { setVesselProbability } = useStore.getState();
    setVesselProbability('LAD', 0.0);
    strictEqual(useStore.getState().prediction.vessels.LAD.prob, 0.0);
    setVesselProbability('LCX', 0.5);
    strictEqual(useStore.getState().prediction.vessels.LCX.prob, 0.5);
    setVesselProbability('RCA', 1.0);
    strictEqual(useStore.getState().prediction.vessels.RCA.prob, 1.0);
  });

  test('Tier 2: Heart opacity bounds clamping ([0.1, 1.0])', () => {
    const { setHeartOpacity } = useStore.getState();
    setHeartOpacity(0.0);
    strictEqual(useStore.getState().heartOpacity, 0.1, 'Opacity < 0.1 must clamp to 0.1');
    setHeartOpacity(-5.0);
    strictEqual(useStore.getState().heartOpacity, 0.1, 'Negative opacity must clamp to 0.1');
    setHeartOpacity(1.5);
    strictEqual(useStore.getState().heartOpacity, 1.0, 'Opacity > 1.0 must clamp to 1.0');
    setHeartOpacity(0.65);
    closeTo(useStore.getState().heartOpacity, 0.65, 0.001);
  });

  test('Tier 2: Rapid sequential state updates preserve monotonic order and stability', () => {
    const { setVesselProbability } = useStore.getState();
    const updateCount = 50;
    for (let i = 0; i <= updateCount; i++) {
      const p = i / updateCount;
      setVesselProbability('LAD', p);
    }
    strictEqual(useStore.getState().prediction.vessels.LAD.prob, 1.0);
  });

  // TIER 3: CROSS-FEATURE INTERACTIONS & STATE ISOLATION
  test('Tier 3: Modifying LAD probability does not mutate LCX or RCA', () => {
    const { setVesselProbability } = useStore.getState();
    const originalLCX = useStore.getState().prediction.vessels.LCX.prob;
    const originalRCA = useStore.getState().prediction.vessels.RCA.prob;

    setVesselProbability('LAD', 0.99);

    const state = useStore.getState();
    strictEqual(state.prediction.vessels.LAD.prob, 0.99);
    strictEqual(state.prediction.vessels.LCX.prob, originalLCX, 'LCX must remain unchanged');
    strictEqual(state.prediction.vessels.RCA.prob, originalRCA, 'RCA must remain unchanged');
  });

  test('Tier 3: resetDemoProbabilities completely restores baseline from modified state', () => {
    const {
      setVesselProbability,
      setColorblindMode,
      setShowTorso,
      setHeartOpacity,
      setSelectedVessel,
      resetDemoProbabilities,
    } = useStore.getState();

    // Mutate everything
    setVesselProbability('LAD', 0.12);
    setVesselProbability('LCX', 0.99);
    setVesselProbability('RCA', 0.02);
    setColorblindMode(true);
    setShowTorso(false);
    setHeartOpacity(0.35);
    setSelectedVessel('LCX');

    // Reset
    resetDemoProbabilities();

    const state = useStore.getState();
    strictEqual(state.prediction.vessels.LAD.prob, 0.74);
    strictEqual(state.prediction.vessels.LCX.prob, 0.31);
    strictEqual(state.prediction.vessels.RCA.prob, 0.52);
    strictEqual(state.colorblindMode, false);
    strictEqual(state.showTorso, true);
    strictEqual(state.heartOpacity, 0.92);
    strictEqual(state.selectedVessel, null);
  });

  return { passed, failed, tests };
}

// Standalone execution support
if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/') || '')) {
  console.log('--- Running useStore.test.ts ---');
  const result = runUseStoreTests();
  result.tests.forEach((t) => console.log(t));
  console.log(`Summary: ${result.passed} passed, ${result.failed} failed.`);
  if (result.failed > 0) process.exit(1);
}
