/**
 * CardioVision 3D-01 E2E Test Suite Runner (TypeScript)
 * Executes all 4 test tiers:
 *   - Tier 1: Feature & Contract Coverage
 *   - Tier 2: Boundary & Corner Cases
 *   - Tier 3: Cross-Feature Interactions
 *   - Tier 4: Real-World Clinical Scenarios
 */

import { performance } from 'node:perf_hooks';
import { runUseStoreTests } from './useStore.test.ts';
import { runVesselConfigTests } from './vesselConfig.test.ts';
import { runSceneConfigTests } from './sceneConfig.test.ts';
import { runClinicalScenarioTests } from './clinicalScenarios.test.ts';

export function runAllE2ETests(): { totalPassed: number; totalFailed: number } {
  const startTime = performance.now();

  console.log('================================================================');
  console.log('  CardioVision 3D-01 E2E Test Suite (Dual Track Verification)   ');
  console.log('================================================================\n');

  const suites = [
    { name: 'Store Contracts & State Management (useStore.test.ts)', runner: runUseStoreTests },
    { name: 'Vessel Anatomy & Color Interpolation Math (vesselConfig.test.ts)', runner: runVesselConfigTests },
    { name: 'Demand Rendering & Performance Contracts (sceneConfig.test.ts)', runner: runSceneConfigTests },
    { name: 'Real-World Clinical Scenarios (clinicalScenarios.test.ts)', runner: runClinicalScenarioTests },
  ];

  let totalPassed = 0;
  let totalFailed = 0;

  for (const suite of suites) {
    console.log(`\n▶ Suite: ${suite.name}`);
    const result = suite.runner();
    result.tests.forEach((t) => console.log(t));
    totalPassed += result.passed;
    totalFailed += result.failed;
  }

  const durationMs = (performance.now() - startTime).toFixed(2);

  console.log('\n================================================================');
  console.log('                       TEST SUITE SUMMARY                       ');
  console.log('================================================================');
  console.log(`  Total Test Suites: ${suites.length}`);
  console.log(`  Total Test Cases:  ${totalPassed + totalFailed}`);
  console.log(`  Passed:            ${totalPassed}`);
  console.log(`  Failed:            ${totalFailed}`);
  console.log(`  Duration:          ${durationMs} ms`);
  console.log('================================================================');

  if (totalFailed > 0) {
    console.error('\n❌ RESULT: FAILED (One or more tests did not meet specification)');
    process.exit(1);
  } else {
    console.log('\n✅ RESULT: ALL TESTS PASSED (100% specification compliance)');
  }

  return { totalPassed, totalFailed };
}

// Auto-run when executed directly via tsx / node
runAllE2ETests();
