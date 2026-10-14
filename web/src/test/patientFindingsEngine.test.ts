import {
  evaluatePatientFindings,
  getFindingsForStructure,
} from '../clinical/patientFindingsEngine.ts';
import { assert, strictEqual } from './assert.ts';

export function runPatientFindingsEngineTests(): { passed: number; failed: number; tests: string[] } {
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

  // TIER 1: INDIVIDUAL CLINICAL FEATURE DETECTION & STRUCTURE MAPPING
  test('Tier 1: Evaluates Region RWMA and maps to left_ventricle / LAD', () => {
    const findings = evaluatePatientFindings({ 'Region RWMA': 2 });
    strictEqual(findings.length, 1);
    const rwma = findings[0];
    strictEqual(rwma.id, 'finding-rwma');
    strictEqual(rwma.targetStructureId, 'left_ventricle');
    strictEqual(rwma.supplyingVessel, 'LAD');
    strictEqual(rwma.cameraPreset, 'anterior');
    strictEqual(rwma.severity, 'abnormal');
    strictEqual(rwma.badgeLabel, 'RWMA (Grade 2)');
  });

  test('Tier 1: Evaluates VHD severity and maps to mitral_valve / Dual Supply', () => {
    const findingsMild = evaluatePatientFindings({ VHD: 'mild' });
    strictEqual(findingsMild.length, 1);
    strictEqual(findingsMild[0].id, 'finding-vhd');
    strictEqual(findingsMild[0].targetStructureId, 'mitral_valve');
    strictEqual(findingsMild[0].supplyingVessel, 'Dual Supply');
    strictEqual(findingsMild[0].cameraPreset, 'lateral');
    strictEqual(findingsMild[0].severity, 'warning');

    const findingsSev = evaluatePatientFindings({ VHD: 'Severe' });
    strictEqual(findingsSev[0].severity, 'critical');
  });

  test('Tier 1: Evaluates Systolic Murmur and maps to aortic_valve / Dual Supply', () => {
    const findings = evaluatePatientFindings({ 'Systolic Murmur': 1 });
    strictEqual(findings.length, 1);
    const murmur = findings[0];
    strictEqual(murmur.id, 'finding-systolic-murmur');
    strictEqual(murmur.targetStructureId, 'aortic_valve');
    strictEqual(murmur.supplyingVessel, 'Dual Supply');
    strictEqual(murmur.cameraPreset, 'anterior');
    strictEqual(murmur.severity, 'abnormal');
  });

  test('Tier 1: Evaluates Diastolic Murmur and maps to mitral_valve / Dual Supply', () => {
    const findings = evaluatePatientFindings({ 'Diastolic Murmur': 1 });
    strictEqual(findings.length, 1);
    const murmur = findings[0];
    strictEqual(murmur.id, 'finding-diastolic-murmur');
    strictEqual(murmur.targetStructureId, 'mitral_valve');
    strictEqual(murmur.supplyingVessel, 'Dual Supply');
    strictEqual(murmur.cameraPreset, 'lateral');
    strictEqual(murmur.severity, 'abnormal');
  });

  test('Tier 1: Evaluates reduced EF-TTE and maps to left_ventricle / LAD', () => {
    const findingsNormal = evaluatePatientFindings({ 'EF-TTE': 55 });
    strictEqual(findingsNormal.length, 0, 'Normal EF (>= 50%) produces no abnormal finding');

    const findingsLow = evaluatePatientFindings({ 'EF-TTE': 45 });
    strictEqual(findingsLow.length, 1);
    strictEqual(findingsLow[0].id, 'finding-ef');
    strictEqual(findingsLow[0].targetStructureId, 'left_ventricle');
    strictEqual(findingsLow[0].supplyingVessel, 'LAD');
    strictEqual(findingsLow[0].severity, 'warning');

    const findingsSevere = evaluatePatientFindings({ 'EF-TTE': 35 });
    strictEqual(findingsSevere[0].severity, 'critical');
  });

  test('Tier 1: Evaluates ST Elevation and maps to interventricular_septum / LAD', () => {
    const findings = evaluatePatientFindings({ 'St Elevation': 1 });
    strictEqual(findings.length, 1);
    const stElev = findings[0];
    strictEqual(stElev.id, 'finding-st-elevation');
    strictEqual(stElev.targetStructureId, 'interventricular_septum');
    strictEqual(stElev.supplyingVessel, 'LAD');
    strictEqual(stElev.cameraPreset, 'anterior');
    strictEqual(stElev.severity, 'critical');
  });

  test('Tier 1: Evaluates ST Depression and maps to left_ventricle / LCX', () => {
    const findings = evaluatePatientFindings({ 'St Depression': 1 });
    strictEqual(findings.length, 1);
    const stDepr = findings[0];
    strictEqual(stDepr.id, 'finding-st-depression');
    strictEqual(stDepr.targetStructureId, 'left_ventricle');
    strictEqual(stDepr.supplyingVessel, 'LCX');
    strictEqual(stDepr.cameraPreset, 'lateral');
    strictEqual(stDepr.severity, 'abnormal');
  });

  test('Tier 1: Evaluates Tinversion and maps to interventricular_septum / LAD', () => {
    const findings = evaluatePatientFindings({ Tinversion: 1 });
    strictEqual(findings.length, 1);
    const tinv = findings[0];
    strictEqual(tinv.id, 'finding-tinversion');
    strictEqual(tinv.targetStructureId, 'interventricular_septum');
    strictEqual(tinv.supplyingVessel, 'LAD');
    strictEqual(tinv.cameraPreset, 'anterior');
    strictEqual(tinv.severity, 'warning');
  });

  // TIER 2: MULTI-FINDING PERSONA EVALUATION & STRUCTURE QUERY HELPER
  test('Tier 2: Real-world complex patient persona produces all corresponding findings', () => {
    const patientProfile = {
      'Region RWMA': 2,
      VHD: 'mild',
      'Systolic Murmur': 1,
      'EF-TTE': 40,
      'St Elevation': 1,
    };

    const findings = evaluatePatientFindings(patientProfile);
    strictEqual(findings.length, 5);

    // Structure query helper
    const lvFindings = getFindingsForStructure('left_ventricle', patientProfile);
    strictEqual(lvFindings.length, 2, 'Left Ventricle should receive RWMA and reduced EF');
    assert(lvFindings.some((f) => f.id === 'finding-rwma'));
    assert(lvFindings.some((f) => f.id === 'finding-ef'));

    const mitralFindings = getFindingsForStructure('mitral_valve', patientProfile);
    strictEqual(mitralFindings.length, 1);
    strictEqual(mitralFindings[0].id, 'finding-vhd');

    const aorticFindings = getFindingsForStructure('aortic_valve', patientProfile);
    strictEqual(aorticFindings.length, 1);
    strictEqual(aorticFindings[0].id, 'finding-systolic-murmur');

    const septumFindings = getFindingsForStructure('interventricular_septum', patientProfile);
    strictEqual(septumFindings.length, 1);
    strictEqual(septumFindings[0].id, 'finding-st-elevation');
  });

  // TIER 3: BOUNDARY & EDGE CASE DEFENSIVE HANDLING
  test('Tier 3: Gracefully handles null, undefined, and empty patient inputs', () => {
    strictEqual(evaluatePatientFindings(null).length, 0);
    strictEqual(evaluatePatientFindings(undefined).length, 0);
    strictEqual(evaluatePatientFindings({}).length, 0);
  });

  test('Tier 3: Normal values (0, "N", false) produce zero abnormal findings', () => {
    const normalInputs = {
      'Region RWMA': 0,
      VHD: 'N',
      'Systolic Murmur': 0,
      'Diastolic Murmur': 0,
      'EF-TTE': 60,
      'St Elevation': 0,
      'St Depression': 0,
      Tinversion: 0,
    };
    const findings = evaluatePatientFindings(normalInputs);
    strictEqual(findings.length, 0, 'Completely normal inputs must produce 0 findings');
  });

  test('Tier 3: Case-insensitive and snake/space key variants resolve correctly', () => {
    const variantInputs = {
      rwma: 3,
      vhd: 'moderate',
      systolic_murmur: true,
      st_elevation: '1',
      lvef: 38,
    };
    const findings = evaluatePatientFindings(variantInputs);
    strictEqual(findings.length, 5);
  });

  return { passed, failed, tests };
}
