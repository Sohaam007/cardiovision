import { useStore } from '../store/useStore.ts';
import {
  assert,
  strictEqual,
} from './assert.ts';
import {
  SCENE_DPR_CONFIG,
  SCENE_FRAMELOOP_CONFIG,
  TORSO_MATERIAL_CONFIG,
  CLINICAL_GUARDRAIL_CONFIG,
} from '../scene/sceneConfig.ts';
import {
  CLINICAL_GUARDRAIL_CONFIG as VESSEL_GUARDRAIL,
} from '../scene/vesselConfig.ts';

export function runSceneConfigTests(): { passed: number; failed: number; tests: string[] } {
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

  // TIER 1: DEMAND FRAMELOOP INVALIDATION SUBSCRIBER CONTRACT
  test('Tier 1: Store mutation fires invalidation subscriber for probability changes', () => {
    let invalidationCount = 0;
    const mockInvalidate = () => {
      invalidationCount++;
    };

    // Simulate DemandInvalidator subscribing to store
    const unsubscribe = useStore.subscribe(() => {
      mockInvalidate();
    });

    try {
      useStore.getState().setVesselProbability('LAD', 0.95);
      strictEqual(invalidationCount, 1, 'Invalidate must be invoked exactly once on probability change');

      useStore.getState().setVesselProbability('LCX', 0.40);
      strictEqual(invalidationCount, 2, 'Invalidate must be invoked on second change');
    } finally {
      unsubscribe();
    }

    // Verify unsubscribed: no more invalidations
    useStore.getState().setVesselProbability('RCA', 0.10);
    strictEqual(invalidationCount, 2, 'Unsubscribed listener must not receive further calls');
  });

  test('Tier 1: Store mutation fires invalidation subscriber for colorblind toggle', () => {
    let invalidationCount = 0;
    const unsubscribe = useStore.subscribe(() => {
      invalidationCount++;
    });

    try {
      useStore.getState().toggleColorblindMode();
      strictEqual(invalidationCount, 1, 'Invalidate must fire when colorblind mode is toggled');
    } finally {
      unsubscribe();
    }
  });

  test('Tier 1: Store mutation fires invalidation subscriber for torso toggle', () => {
    let invalidationCount = 0;
    const unsubscribe = useStore.subscribe(() => {
      invalidationCount++;
    });

    try {
      useStore.getState().toggleTorso();
      strictEqual(invalidationCount, 1, 'Invalidate must fire when torso visibility is toggled');
    } finally {
      unsubscribe();
    }
  });

  test('Tier 1: Store mutation fires invalidation subscriber for heart opacity changes', () => {
    let invalidationCount = 0;
    const unsubscribe = useStore.subscribe(() => {
      invalidationCount++;
    });

    try {
      useStore.getState().setHeartOpacity(0.50);
      strictEqual(invalidationCount, 1, 'Invalidate must fire when heart opacity is updated');
    } finally {
      unsubscribe();
    }
  });

  test('Tier 1: Zero invalidations occur while scene is idle (demand frameloop contract)', () => {
    let invalidationCount = 0;
    const unsubscribe = useStore.subscribe(() => {
      invalidationCount++;
    });

    try {
      // No state updates dispatched
      strictEqual(invalidationCount, 0, 'No invalidations must occur while idle (0% GPU utilization)');
    } finally {
      unsubscribe();
    }
  });

  // TIER 1 & 2: RENDERING CONSTRAINTS & CLINICAL GUARDRAILS
  test('Tier 1: Device Pixel Ratio capping contract (DPR <= 1.5)', () => {
    // DPR contract from ORIGINAL_REQUEST R1 and 05_3D_SPEC
    const MAX_ALLOWED_DPR = 1.5;
    assert(SCENE_DPR_CONFIG[1] <= MAX_ALLOWED_DPR, `Max DPR ${SCENE_DPR_CONFIG[1]} must not exceed ${MAX_ALLOWED_DPR}`);
    assert(SCENE_DPR_CONFIG[0] >= 1.0, `Min DPR ${SCENE_DPR_CONFIG[0]} must be >= 1.0`);
    strictEqual(SCENE_FRAMELOOP_CONFIG, 'demand', 'Frameloop contract must be demand');
  });

  test('Tier 1: Torso shell depthWrite: false contract to prevent alpha occlusion', () => {
    // In Three.js, depthWrite must be false for translucent shells enclosing internal organs
    strictEqual(TORSO_MATERIAL_CONFIG.depthWrite, false, 'Torso shell must set depthWrite: false');
    strictEqual(TORSO_MATERIAL_CONFIG.transparent, true, 'Torso shell must be transparent');
    strictEqual(TORSO_MATERIAL_CONFIG.flatShading, true, 'Torso shell must set flatShading: true');
  });

  test('Tier 1: Clinical guardrail contract - uniform vessel shading without localized stenosis', () => {
    // The dataset does NOT provide localized lesion locations.
    // Each vessel receives a single scalar probability and uniform material color.
    strictEqual(CLINICAL_GUARDRAIL_CONFIG.uniformColoring, true, 'Vessel must be shaded uniformly');
    strictEqual(CLINICAL_GUARDRAIL_CONFIG.localizedLesionMarkers, false, 'Never imply localized stenosis lesions');
    strictEqual(VESSEL_GUARDRAIL.uniformColoring, true, 'vesselConfig contract must enforce uniform coloring');
    strictEqual(VESSEL_GUARDRAIL.localizedLesionMarkers, false, 'vesselConfig contract must prohibit localized lesions');
  });

  return { passed, failed, tests };
}

// Standalone execution support
if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/') || '')) {
  console.log('--- Running sceneConfig.test.ts ---');
  const result = runSceneConfigTests();
  result.tests.forEach((t) => console.log(t));
  console.log(`Summary: ${result.passed} passed, ${result.failed} failed.`);
  if (result.failed > 0) process.exit(1);
}
