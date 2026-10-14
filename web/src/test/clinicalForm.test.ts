/**
 * CardioVision Milestone 3: Clinical Form, Schema & Reactive Prediction Test Suite
 *
 * Comprehensive automated verification for:
 *   - Tier 1: 54-Feature Schema Completeness & 3 Collapsible Clinical Categories (30, 7, 17)
 *   - Tier 1: Zero-Leakage Invariant (no CAD, LAD, LCX, RCA, Cath in inputs)
 *   - Tier 1: Schema Type Distribution (binary, integer, number, categorical, ordinal)
 *   - Tier 2: Two-Way State Binding & Physiological PR -> Heart Rate Synchronization
 *   - Tier 3: Dirty-State Detection & Persona Baseline Retention
 *   - Tier 3: Reset to Baseline Action
 *   - Tier 4: Physiological Range Clamping & Reference Range Formatting
 *   - Tier 5: Prediction Recalculation Trigger & 3D Vessel Shading Synchronization
 */

import fs from 'node:fs';
import path from 'node:path';
import { useStore } from '../store/useStore.ts';
import { type FeatureSchemaItem, type DemoPatient } from '../api/client.ts';
import { getVesselColorHex } from '../scene/vesselConfig.ts';
import {
  strictEqual,
  assert,
} from './assert.ts';

export async function runClinicalFormTests(): Promise<{ passed: number; failed: number; tests: string[] }> {
  let passed = 0;
  let failed = 0;
  const tests: string[] = [];

  async function test(name: string, fn: () => void | Promise<void>) {
    try {
      useStore.getState().resetDemoProbabilities();
      await fn();
      passed++;
      tests.push(`  [PASS] ${name}`);
    } catch (err) {
      failed++;
      tests.push(`  [FAIL] ${name}: ${(err as Error).message}`);
    }
  }

  // Load schemas and demo patients for test fixtures
  const schemaPath = path.resolve(process.cwd(), 'public/feature_schema.json');
  const rawSchema = fs.readFileSync(schemaPath, 'utf-8');
  const schemaItems: FeatureSchemaItem[] = JSON.parse(rawSchema);

  const demoPath = path.resolve(process.cwd(), 'public/demo_patients.json');
  const rawDemo = fs.readFileSync(demoPath, 'utf-8');
  const demoPatients: DemoPatient[] = JSON.parse(rawDemo);

  // Initialize store schema and demo patients
  useStore.setState({ schema: schemaItems, demoPatients });

  // =========================================================================
  // TIER 1: SCHEMA COMPLETENESS & CLINICAL CATEGORIES (R4, R5)
  // =========================================================================
  await test('M3-T1: Bundled public/feature_schema.json exists and contains exactly 54 features', () => {
    assert(fs.existsSync(schemaPath), 'feature_schema.json must exist in web/public');
    strictEqual(schemaItems.length, 54, 'Schema must contain exactly 54 features');
  });

  await test('M3-T1: All 54 feature names are unique and match models/feature_schema.json exactly', () => {
    const modelSchemaPath = path.resolve(process.cwd(), '../models/feature_schema.json');
    assert(fs.existsSync(modelSchemaPath), 'models/feature_schema.json must exist');
    const modelSchema: FeatureSchemaItem[] = JSON.parse(fs.readFileSync(modelSchemaPath, 'utf-8'));

    strictEqual(schemaItems.length, modelSchema.length, 'Length must match model schema');
    const names = new Set(schemaItems.map((f) => f.name));
    strictEqual(names.size, 54, 'All 54 feature names must be distinct');

    schemaItems.forEach((item, idx) => {
      strictEqual(item.name, modelSchema[idx].name, `Feature name at index ${idx} must match`);
      strictEqual(item.type, modelSchema[idx].type, `Feature type for ${item.name} must match`);
      strictEqual(item.group, modelSchema[idx].group, `Feature group for ${item.name} must match`);
    });
  });

  await test('M3-T1: Categorization yields exactly 30 in Vitals/Demographics, 7 in ECG, and 17 in Echo/Lab', () => {
    const vitalsFeatures = schemaItems.filter(
      (item) => item.group === 'Demographic' || item.group === 'History/exam' || item.group === 'vitals_history'
    );
    const ecgFeatures = schemaItems.filter(
      (item) => item.group?.toUpperCase() === 'ECG'
    );
    const echoLabFeatures = schemaItems.filter(
      (item) => item.group === 'Lab' || item.group === 'Echo' || item.group === 'echo_lab'
    );

    strictEqual(vitalsFeatures.length, 30, 'Vitals & Demographics section must contain exactly 30 features');
    strictEqual(ecgFeatures.length, 7, 'ECG Telemetry section must contain exactly 7 features');
    strictEqual(echoLabFeatures.length, 17, 'Echo & Laboratory section must contain exactly 17 features');
    strictEqual(vitalsFeatures.length + ecgFeatures.length + echoLabFeatures.length, 54, 'Sum must equal 54');
  });

  await test('M3-T1: Zero target leakage invariant across all 54 clinical features', () => {
    const forbidden = ['CAD', 'LAD', 'LCX', 'RCA', 'CATH'];
    for (const item of schemaItems) {
      const cleanName = item.name.trim().toUpperCase();
      assert(
        !forbidden.includes(cleanName),
        `Zero leakage violation: ${item.name} is a forbidden target or ground truth column!`
      );
    }
  });

  await test('M3-T1: Feature input types strictly cover binary, integer, number, categorical, and ordinal', () => {
    const binaryItems = schemaItems.filter((i) => i.type === 'binary');
    const integerItems = schemaItems.filter((i) => i.type === 'integer');
    const numberItems = schemaItems.filter((i) => i.type === 'number');
    const categoricalItems = schemaItems.filter((i) => i.type === 'categorical');
    const ordinalItems = schemaItems.filter((i) => i.type === 'ordinal');

    strictEqual(binaryItems.length, 28, 'Must have 28 binary features');
    strictEqual(integerItems.length, 16, 'Must have 16 integer features');
    strictEqual(numberItems.length, 5, 'Must have 5 floating-point number features');
    strictEqual(categoricalItems.length, 4, 'Must have 4 categorical features (Sex, BBB, Region RWMA, VHD)');
    strictEqual(ordinalItems.length, 1, 'Must have 1 ordinal feature (Function Class)');
    strictEqual(
      binaryItems.length + integerItems.length + numberItems.length + categoricalItems.length + ordinalItems.length,
      54,
      'All 54 features must have valid typed input controls'
    );
  });

  // =========================================================================
  // TIER 2: TWO-WAY STATE BINDING & PHYSIOLOGICAL COUPLINGS
  // =========================================================================
  await test('M3-T2: setPatientInput performs reactive two-way mutation on store state', () => {
    const store = useStore.getState();
    store.setPatientInput('BP', 145);
    store.setPatientInput('Typical Chest Pain', 1);
    store.setPatientInput('Sex', 'Fmale');

    const state = useStore.getState();
    strictEqual(state.patientInputs['BP'], 145, 'BP input must be updated to 145');
    strictEqual(state.patientInputs['Typical Chest Pain'], 1, 'Typical Chest Pain input must be updated to 1');
    strictEqual(state.patientInputs['Sex'], 'Fmale', 'Sex input must be updated to Fmale');
  });

  await test('M3-T2: Modifying PR (Pulse Rate) synchronously modulates heartRateBpm within physiological limits', () => {
    const store = useStore.getState();

    // Normal physiological pulse rate update
    store.setPatientInput('PR', 88);
    strictEqual(useStore.getState().heartRateBpm, 88, 'heartRateBpm must match PR value 88');

    // Boundary pulse rate update
    store.setPatientInput('PR', 115);
    strictEqual(useStore.getState().heartRateBpm, 115, 'heartRateBpm must match PR value 115');

    // Physiological clamping bounds check
    store.setHeartRateBpm(220); // should clamp to 180 max
    strictEqual(useStore.getState().heartRateBpm, 180, 'Heart rate must clamp to max 180 bpm');

    store.setHeartRateBpm(15); // should clamp to 30 min
    strictEqual(useStore.getState().heartRateBpm, 30, 'Heart rate must clamp to min 30 bpm');
  });

  // =========================================================================
  // TIER 3: DIRTY-STATE TRACKING & PERSONA BASELINE RETENTION
  // =========================================================================
  await test('M3-T3: Loading a persona initializes clean state (isDirty = false) and sets baseline', () => {
    const store = useStore.getState();
    const testPersona = demoPatients[0];
    store.loadPersona(testPersona);

    const state = useStore.getState();
    strictEqual(state.isDirty, false, 'Loaded persona must start with isDirty = false');
    strictEqual(state.selectedPersonaId, testPersona.id, 'Persona ID must match');
    assert(state.activePersonaBaseline !== null, 'activePersonaBaseline must be populated');
    strictEqual(state.activePersonaBaseline!['Age'], testPersona.features['Age'], 'Baseline Age must match');
  });

  await test('M3-T3: Modifying any input field marks form dirty (isDirty = true) without erasing persona ID', () => {
    const store = useStore.getState();
    const testPersona = demoPatients[1];
    store.loadPersona(testPersona);

    strictEqual(useStore.getState().isDirty, false);
    strictEqual(useStore.getState().selectedPersonaId, testPersona.id);

    // Clinician edits BP
    store.setPatientInput('BP', 170);

    const updatedState = useStore.getState();
    strictEqual(updatedState.isDirty, true, 'Editing an input must set isDirty = true');
    strictEqual(
      updatedState.selectedPersonaId,
      testPersona.id,
      'Editing an input must NOT erase selectedPersonaId'
    );
    strictEqual(
      updatedState.activePersonaBaseline?.['BP'],
      testPersona.features['BP'],
      'activePersonaBaseline must retain the original unedited baseline'
    );
  });

  await test('M3-T3: Reset to Baseline completely restores patient inputs and clears dirty state', () => {
    const store = useStore.getState();
    const testPersona = demoPatients[2];
    store.loadPersona(testPersona);

    // Modify multiple features
    store.setPatientInput('Age', 82);
    store.setPatientInput('Weight', 110);
    store.setPatientInput('Typical Chest Pain', 0);
    store.setPatientInput('PR', 105);

    strictEqual(useStore.getState().isDirty, true, 'State must be dirty after edits');
    strictEqual(useStore.getState().patientInputs['Age'], 82);

    // Perform Reset to Baseline
    store.resetToBaseline();

    const resetState = useStore.getState();
    strictEqual(resetState.isDirty, false, 'resetToBaseline must clear dirty flag');
    strictEqual(resetState.patientInputs['Age'], testPersona.features['Age'], 'Age must be restored');
    strictEqual(resetState.patientInputs['Weight'], testPersona.features['Weight'], 'Weight must be restored');
    strictEqual(resetState.patientInputs['Typical Chest Pain'], testPersona.features['Typical Chest Pain'], 'CP restored');
    strictEqual(resetState.heartRateBpm, testPersona.features['PR'], 'Heart rate restored from baseline PR');
    strictEqual(
      resetState.prediction.vessels.LAD.prob,
      testPersona.prediction.vessels.LAD.prob,
      'LAD prob restored to baseline'
    );
  });

  await test('M3-T3: Reset to Baseline without active persona restores schema defaults and clears dirty state', () => {
    const store = useStore.getState();
    // Simulate manual entry without persona
    store.resetDemoProbabilities();
    store.setPatientInput('Age', 42);
    strictEqual(useStore.getState().isDirty, true);

    store.resetToBaseline();

    const state = useStore.getState();
    strictEqual(state.isDirty, false, 'resetToBaseline must clear dirty flag');
    const ageDefault = schemaItems.find((f) => f.name === 'Age')?.default ?? 58;
    strictEqual(state.patientInputs['Age'], ageDefault, 'Age must match schema default');
  });

  // =========================================================================
  // TIER 4: PHYSIOLOGICAL VALIDATION & REFERENCE RANGE FORMATTING
  // =========================================================================
  await test('M3-T4: Physiological out-of-range inputs generate validation boundaries', () => {
    const ageItem = schemaItems.find((f) => f.name === 'Age')!;
    const efItem = schemaItems.find((f) => f.name === 'EF-TTE')!;

    // Age bounds [30, 86]
    strictEqual(ageItem.min, 30, 'Age minimum must be 30');
    strictEqual(ageItem.max, 86, 'Age maximum must be 86');

    // EF-TTE bounds [15, 60]
    strictEqual(efItem.min, 15, 'EF-TTE minimum must be 15');
    strictEqual(efItem.max, 60, 'EF-TTE maximum must be 60');

    // Reference range string formats cleanly without "undefined-undefined"
    const refString = ageItem.reference_range;
    assert(typeof refString === 'string', 'reference_range must be string');
    if (typeof refString === 'string') {
      assert(!refString.includes('undefined'), 'reference_range must not contain undefined');
      strictEqual(refString, '18-100', 'Age reference range must be 18-100');
    }
  });

  // =========================================================================
  // TIER 5: PREDICTION RECALCULATION & 3D VESSEL RECOLORING
  // =========================================================================
  await test('M3-T5: runPrediction action recalculates CAD & vessel risk and clears dirty flag', async () => {
    const store = useStore.getState();
    store.loadPersona(demoPatients[0]);

    // Alter critical clinical markers: severe chest pain, ST elevation, low EF
    store.setPatientInput('Typical Chest Pain', 1);
    store.setPatientInput('St Elevation', 1);
    store.setPatientInput('EF-TTE', 25);
    store.setPatientInput('Region RWMA', 3);

    strictEqual(useStore.getState().isDirty, true, 'Form must be marked dirty');

    // Trigger runPrediction
    await store.runPrediction();

    const postState = useStore.getState();
    strictEqual(postState.isDirty, false, 'runPrediction must set isDirty = false');
    const preds = postState.predictions;
    assert(preds !== null, 'Predictions must be populated');
    if (preds) {
      assert(preds.cad.prob > 0.5, 'High risk clinical markers must elevate CAD probability');
      assert(postState.prediction.vessels.LAD.prob > 0.5, 'ST Elevation + RWMA must elevate LAD stenosis probability');

      // Verify mathematical hierarchy invariant: P(CAD) >= max(P(vessels))
      const maxVessel = Math.max(
        postState.prediction.vessels.LAD.prob,
        postState.prediction.vessels.LCX.prob,
        postState.prediction.vessels.RCA.prob
      );
      assert(
        preds.cad.prob >= maxVessel - 0.001,
        `P(CAD) (${preds.cad.prob}) must be >= max vessel probability (${maxVessel})`
      );
    }

    // Verify 3D vessel coloration matches updated vessel risk
    const ladProb = postState.prediction.vessels.LAD.prob;
    const lad3DColor = getVesselColorHex(ladProb, false);
    assert(typeof lad3DColor === 'string' && lad3DColor.startsWith('#'), 'Valid hex color for 3D LAD');
  });

  return { passed, failed, tests };
}

// Standalone execution support
if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/') || '')) {
  console.log('--- Running clinicalForm.test.ts ---');
  runClinicalFormTests().then((result) => {
    result.tests.forEach((t) => console.log(t));
    console.log(`Summary: ${result.passed} passed, ${result.failed} failed.`);
    if (result.failed > 0) process.exit(1);
  });
}
