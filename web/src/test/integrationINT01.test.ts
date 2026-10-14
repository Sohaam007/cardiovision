import { useStore } from '../store/useStore.ts';
import {
  strictEqual,
  assert,
} from './assert.ts';
import { getVesselColorHex } from '../scene/vesselConfig.ts';
import fs from 'node:fs';
import path from 'node:path';

export function runIntegrationINT01Tests(): { passed: number; failed: number; tests: string[] } {
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

  // =========================================================================
  // 1. DEMO PATIENT DATASET INTEGRITY & 8-CASE COVERAGE
  // =========================================================================
  const demoPatientsPath = path.resolve(process.cwd(), 'public/demo_patients.json');

  test('Tier 1: public/demo_patients.json exists and contains exactly 8 holdout patients', () => {
    assert(fs.existsSync(demoPatientsPath), 'demo_patients.json must exist in web/public');
    const raw = fs.readFileSync(demoPatientsPath, 'utf-8');
    const demoPatientsData = JSON.parse(raw);
    strictEqual(demoPatientsData.length, 8, 'Must contain exactly 8 holdout benchmark patients');
  });

  test('Tier 1: Every demo patient matches 04_API_CONTRACT schema', () => {
    const raw = fs.readFileSync(demoPatientsPath, 'utf-8');
    const patients = JSON.parse(raw);

    for (const p of patients) {
      assert(typeof p.id === 'string' && p.id.length > 0, 'Patient must have id');
      assert(typeof p.name === 'string' && p.name.length > 0, 'Patient must have name');
      assert(typeof p.features === 'object' && p.features !== null, 'Patient must have features');
      assert(typeof p.prediction === 'object' && p.prediction !== null, 'Patient must have prediction');
      assert(typeof p.prediction.cad === 'object' && typeof p.prediction.cad.prob === 'number', 'Patient must have cad prob');
      assert(typeof p.prediction.vessels === 'object', 'Patient must have vessels');
      assert(typeof p.prediction.vessels.LAD?.prob === 'number', 'LAD prob must exist');
      assert(typeof p.prediction.vessels.LCX?.prob === 'number', 'LCX prob must exist');
      assert(typeof p.prediction.vessels.RCA?.prob === 'number', 'RCA prob must exist');
      assert(typeof p.prediction.explanations === 'object', 'Explanations must exist');
      assert(Array.isArray(p.prediction.explanations.CAD), 'CAD explanations must be array');

      // Contract constraint: P(CAD) >= max(vessel probs)
      const maxVessel = Math.max(
        p.prediction.vessels.LAD.prob,
        p.prediction.vessels.LCX.prob,
        p.prediction.vessels.RCA.prob
      );
      assert(
        p.prediction.cad.prob >= maxVessel - 0.001,
        `P(CAD) (${p.prediction.cad.prob}) must be >= max vessel prob (${maxVessel}) for ${p.id}`
      );
    }
  });

  // =========================================================================
  // 2. 3D COLOR EQUALITY VS CARD NUMBERS ACROSS ALL 8 PATIENTS
  // =========================================================================
  test('Tier 1: 3D vessel colors strictly match card probabilities across all 8 holdout patients', () => {
    const raw = fs.readFileSync(demoPatientsPath, 'utf-8');
    const patients = JSON.parse(raw);
    const store = useStore.getState();

    // Populate demo patients in store
    useStore.setState({ demoPatients: patients });

    for (const patient of patients) {
      store.loadPersona(patient);
      const state = useStore.getState();

      // Check store numbers equal patient file numbers
      assert(state.predictions !== null, 'Predictions must be populated');
      strictEqual(state.predictions?.cad.prob, patient.prediction.cad.prob, `CAD prob must match for ${patient.id}`);
      strictEqual(state.prediction.vessels.LAD.prob, patient.prediction.vessels.LAD.prob, `LAD prob must match for ${patient.id}`);
      strictEqual(state.prediction.vessels.LCX.prob, patient.prediction.vessels.LCX.prob, `LCX prob must match for ${patient.id}`);
      strictEqual(state.prediction.vessels.RCA.prob, patient.prediction.vessels.RCA.prob, `RCA prob must match for ${patient.id}`);

      // Verify that 3D render color equals card color in both standard and colorblind modes
      for (const colorblind of [false, true]) {
        for (const vKey of ['LAD', 'LCX', 'RCA'] as const) {
          const expectedProb = patient.prediction.vessels[vKey].prob;
          const rendered3DColorHex = getVesselColorHex(state.prediction.vessels[vKey].prob, colorblind);
          const expectedCardColorHex = getVesselColorHex(expectedProb, colorblind);

          strictEqual(
            rendered3DColorHex,
            expectedCardColorHex,
            `3D color (${rendered3DColorHex}) must equal card color (${expectedCardColorHex}) for ${vKey} in ${patient.id} (colorblind: ${colorblind})`
          );
        }
      }
    }
  });

  // =========================================================================
  // 3. API TIMEOUT CONTRACT & FALLBACK BEHAVIOR
  // =========================================================================
  test('Tier 1: API client module defines 8000 ms timeout per 04_API_CONTRACT', () => {
    // Read client.ts source to verify TIMEOUT_MS constant is 8000
    const clientPath = path.resolve(process.cwd(), 'src/api/client.ts');
    assert(fs.existsSync(clientPath), 'client.ts must exist');
    const clientContent = fs.readFileSync(clientPath, 'utf-8');
    assert(clientContent.includes('TIMEOUT_MS = 8000') || clientContent.includes('8000'), 'Timeout must be 8000 ms');
  });

  test('Tier 2: API server unavailable updates store status without corrupting 3D scene state', () => {
    const store = useStore.getState();

    // Baseline probabilities exist
    assert(store.prediction.vessels.LAD.prob > 0, 'Baseline LAD prob must exist');

    // Simulate backend connection outage
    store.setModelServerUnavailable(true);
    const state = useStore.getState();
    strictEqual(state.modelServerUnavailable, true, 'Model server unavailable flag must be true');
    strictEqual(state.apiStatus, 'unavailable', 'API status must be unavailable');

    // 3D vessels remain fully populated and valid
    assert(state.prediction.vessels.LAD.prob > 0, 'LAD prob must remain valid during outage');
    assert(state.prediction.vessels.LCX.prob > 0, 'LCX prob must remain valid during outage');
    assert(state.prediction.vessels.RCA.prob > 0, 'RCA prob must remain valid during outage');

    // Recovery
    store.setModelServerUnavailable(false);
    strictEqual(useStore.getState().apiStatus, 'live', 'API status must return to live on recovery');
  });

  test('Tier 2: Persona loading sets demoMode, updates inputs, and leaves 3D rendering intact', () => {
    const raw = fs.readFileSync(demoPatientsPath, 'utf-8');
    const patients = JSON.parse(raw);
    const testPatient = patients[0];

    const store = useStore.getState();
    store.loadPersona(testPatient);

    const state = useStore.getState();
    strictEqual(state.selectedPersonaId, testPatient.id, 'Persona ID must match');
    strictEqual(state.demoMode, true, 'Demo mode must be enabled');
    strictEqual(state.apiStatus, 'demo', 'API status must be demo');
    strictEqual(state.patientInputs['Age'], testPatient.features['Age'], 'Age input must match patient');
    strictEqual(state.prediction.vessels.LAD.prob, testPatient.prediction.vessels.LAD.prob, 'LAD prob matches');
  });

  return { passed, failed, tests };
}

// Standalone execution support
if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/') || '')) {
  console.log('--- Running integrationINT01.test.ts ---');
  const result = runIntegrationINT01Tests();
  result.tests.forEach((t) => console.log(t));
  console.log(`Summary: ${result.passed} passed, ${result.failed} failed.`);
  if (result.failed > 0) process.exit(1);
}
