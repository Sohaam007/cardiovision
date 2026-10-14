/**
 * CardioVision Deterministic Clinical Finding Logic Engine
 *
 * Evaluates active patient clinical inputs:
 * - Region RWMA (Regional Wall Motion Abnormality)
 * - VHD (Valvular Heart Disease)
 * - Systolic Murmur
 * - Diastolic Murmur
 * - EF-TTE (Left Ventricular Ejection Fraction)
 * - ST Elevation (Transmural injury current)
 * - ST Depression (Subendocardial ischemia)
 * - Tinversion (Repolarization discordance)
 *
 * Deterministically maps each detected finding to:
 * - Target cardiac anatomical structure ID (matching INTERNAL_HEART_STRUCTURES)
 * - Supplying coronary vessel territory (LAD, LCX, RCA, or Dual Supply)
 * - Optimal 3D camera preset angle (anterior, lateral, posterior)
 * - Human-readable structure name, severity, and clinical pathology note.
 */

export type FindingSeverity = 'critical' | 'abnormal' | 'warning' | 'info';

export interface PatientFinding {
  id: string;
  title: string;
  badgeLabel: string;
  severity: FindingSeverity;
  targetStructureId: string; // Key in INTERNAL_HEART_STRUCTURES
  structureName: string;
  supplyingVessel: 'LAD' | 'LCX' | 'RCA' | 'Dual Supply';
  cameraPreset: 'anterior' | 'lateral' | 'posterior';
  clinicalNote: string;
  sourceFeature: string;
  featureValue: any;
}

/**
 * Normalizes input key lookup across dataset formatting variants
 * (e.g. 'Region RWMA' vs 'RWMA', 'St Elevation' vs 'ST_Elevation').
 */
function getFeatureValue(inputs: Record<string, any>, ...keys: string[]): any {
  for (const k of keys) {
    if (k in inputs && inputs[k] !== undefined && inputs[k] !== null) {
      return inputs[k];
    }
    // Also try case-insensitive lookup
    const lower = k.toLowerCase().replace(/[\s_-]/g, '');
    for (const actualKey of Object.keys(inputs)) {
      if (actualKey.toLowerCase().replace(/[\s_-]/g, '') === lower) {
        if (inputs[actualKey] !== undefined && inputs[actualKey] !== null) {
          return inputs[actualKey];
        }
      }
    }
  }
  return undefined;
}

/**
 * Evaluates patient inputs and returns an array of structured anatomical findings.
 */
export function evaluatePatientFindings(inputs: Record<string, any> | undefined | null): PatientFinding[] {
  if (!inputs || typeof inputs !== 'object') {
    return [];
  }

  const findings: PatientFinding[] = [];

  // -------------------------------------------------------------------------
  // 1. Region RWMA (Regional Wall Motion Abnormality)
  // -------------------------------------------------------------------------
  const rawRwma = getFeatureValue(inputs, 'Region RWMA', 'RWMA', 'Region with RWMA');
  if (rawRwma !== undefined && rawRwma !== '') {
    const rwmaNum = Number(rawRwma);
    if (!isNaN(rwmaNum) && rwmaNum > 0) {
      const severity: FindingSeverity = rwmaNum >= 3 ? 'critical' : rwmaNum >= 2 ? 'abnormal' : 'warning';
      findings.push({
        id: 'finding-rwma',
        title: 'Regional Wall Motion Abnormality',
        badgeLabel: `RWMA (Grade ${rwmaNum})`,
        severity,
        targetStructureId: 'left_ventricle',
        structureName: 'Left Ventricle Cavity & Free Wall',
        supplyingVessel: 'LAD',
        cameraPreset: 'anterior',
        clinicalNote: `Echocardiogram detects regional wall motion abnormality (Grade ${rwmaNum}). Hypokinesis or akinesis observed across anterior and apical LV segments supplied by the Left Anterior Descending (LAD) coronary artery.`,
        sourceFeature: 'Region RWMA',
        featureValue: rwmaNum,
      });
    }
  }

  // -------------------------------------------------------------------------
  // 2. VHD (Valvular Heart Disease)
  // -------------------------------------------------------------------------
  const rawVhd = getFeatureValue(inputs, 'VHD', 'vhd');
  if (rawVhd !== undefined && rawVhd !== null) {
    const vhdStr = String(rawVhd).trim();
    const lowerVhd = vhdStr.toLowerCase();
    const isNormal =
      lowerVhd === 'n' ||
      lowerVhd === 'none' ||
      lowerVhd === 'normal' ||
      lowerVhd === '0' ||
      lowerVhd === 'no' ||
      lowerVhd === '';

    if (!isNormal) {
      const severity: FindingSeverity = lowerVhd.includes('sev')
        ? 'critical'
        : lowerVhd.includes('mod')
        ? 'abnormal'
        : 'warning';

      findings.push({
        id: 'finding-vhd',
        title: `Valvular Heart Disease (${vhdStr})`,
        badgeLabel: `VHD (${vhdStr})`,
        severity,
        targetStructureId: 'mitral_valve',
        structureName: 'Mitral (Bicuspid) Valve Complex',
        supplyingVessel: 'Dual Supply',
        cameraPreset: 'lateral',
        clinicalNote: `Echocardiographic valvular heart disease documented (${vhdStr} severity). Affects leaflet coaptation geometry, transvalvular pressure gradients, and annular remodeling.`,
        sourceFeature: 'VHD',
        featureValue: vhdStr,
      });
    }
  }

  // -------------------------------------------------------------------------
  // 3. Systolic Murmur
  // -------------------------------------------------------------------------
  const rawSysMurmur = getFeatureValue(inputs, 'Systolic Murmur', 'systolic_murmur', 'SystolicMurmur');
  if (rawSysMurmur !== undefined && rawSysMurmur !== null) {
    const isPresent =
      rawSysMurmur === 1 ||
      rawSysMurmur === '1' ||
      rawSysMurmur === true ||
      String(rawSysMurmur).toLowerCase() === 'yes';

    if (isPresent) {
      findings.push({
        id: 'finding-systolic-murmur',
        title: 'Systolic Ejection Murmur',
        badgeLabel: 'Systolic Murmur',
        severity: 'abnormal',
        targetStructureId: 'aortic_valve',
        structureName: 'Aortic Valve & Sinuses of Valsalva',
        supplyingVessel: 'Dual Supply',
        cameraPreset: 'anterior',
        clinicalNote: 'Audible harsh systolic ejection murmur heard loudest at right upper sternal border. Indicative of turbulent outflow across aortic valve or LVOT acceleration during ventricular ejection.',
        sourceFeature: 'Systolic Murmur',
        featureValue: rawSysMurmur,
      });
    }
  }

  // -------------------------------------------------------------------------
  // 4. Diastolic Murmur
  // -------------------------------------------------------------------------
  const rawDiaMurmur = getFeatureValue(inputs, 'Diastolic Murmur', 'diastolic_murmur', 'DiastolicMurmur');
  if (rawDiaMurmur !== undefined && rawDiaMurmur !== null) {
    const isPresent =
      rawDiaMurmur === 1 ||
      rawDiaMurmur === '1' ||
      rawDiaMurmur === true ||
      String(rawDiaMurmur).toLowerCase() === 'yes';

    if (isPresent) {
      findings.push({
        id: 'finding-diastolic-murmur',
        title: 'Diastolic Inflow Murmur',
        badgeLabel: 'Diastolic Murmur',
        severity: 'abnormal',
        targetStructureId: 'mitral_valve',
        structureName: 'Mitral (Bicuspid) Valve Complex',
        supplyingVessel: 'Dual Supply',
        cameraPreset: 'lateral',
        clinicalNote: 'Low-pitched rumbling diastolic murmur. Corresponds to impaired ventricular filling resistance (mitral stenosis) or semilunar incompetence with retrograde regurgitation during diastole.',
        sourceFeature: 'Diastolic Murmur',
        featureValue: rawDiaMurmur,
      });
    }
  }

  // -------------------------------------------------------------------------
  // 5. EF-TTE (Left Ventricular Ejection Fraction)
  // -------------------------------------------------------------------------
  const rawEf = getFeatureValue(inputs, 'EF-TTE', 'EF', 'ef', 'LVEF');
  if (rawEf !== undefined && rawEf !== null && rawEf !== '') {
    const efNum = Number(rawEf);
    if (!isNaN(efNum) && efNum < 50) {
      const severity: FindingSeverity = efNum < 40 ? 'critical' : 'warning';
      findings.push({
        id: 'finding-ef',
        title: `Reduced Ejection Fraction (${efNum}%)`,
        badgeLabel: `Low EF (${efNum}%)`,
        severity,
        targetStructureId: 'left_ventricle',
        structureName: 'Left Ventricle Cavity & Free Wall',
        supplyingVessel: 'LAD',
        cameraPreset: 'anterior',
        clinicalNote: `Transthoracic echocardiogram shows depressed left ventricular systolic pump function (LVEF ${efNum}% vs normal >= 50%). Reduced radial myocardial thickening and stroke volume excursion.`,
        sourceFeature: 'EF-TTE',
        featureValue: efNum,
      });
    }
  }

  // -------------------------------------------------------------------------
  // 6. ST Elevation (Transmural Injury Current)
  // -------------------------------------------------------------------------
  const rawStElev = getFeatureValue(inputs, 'St Elevation', 'ST Elevation', 'ST_Elevation', 'st_elevation');
  if (rawStElev !== undefined && rawStElev !== null) {
    const isPresent =
      rawStElev === 1 ||
      rawStElev === '1' ||
      rawStElev === true ||
      String(rawStElev).toLowerCase() === 'yes';

    if (isPresent) {
      findings.push({
        id: 'finding-st-elevation',
        title: 'ST-Segment Elevation (Transmural Injury)',
        badgeLabel: 'ST-Elevation',
        severity: 'critical',
        targetStructureId: 'interventricular_septum',
        structureName: 'Interventricular Septum (IVS)',
        supplyingVessel: 'LAD',
        cameraPreset: 'anterior',
        clinicalNote: 'Acute transmural myocardial injury current on 12-lead ECG. Points toward critical proximal LAD occlusion affecting anterior wall and interventricular septum.',
        sourceFeature: 'St Elevation',
        featureValue: rawStElev,
      });
    }
  }

  // -------------------------------------------------------------------------
  // 7. ST Depression (Subendocardial Ischemia)
  // -------------------------------------------------------------------------
  const rawStDepr = getFeatureValue(inputs, 'St Depression', 'ST Depression', 'ST_Depression', 'st_depression');
  if (rawStDepr !== undefined && rawStDepr !== null) {
    const isPresent =
      rawStDepr === 1 ||
      rawStDepr === '1' ||
      rawStDepr === true ||
      String(rawStDepr).toLowerCase() === 'yes';

    if (isPresent) {
      findings.push({
        id: 'finding-st-depression',
        title: 'ST-Segment Depression (Subendocardial Ischemia)',
        badgeLabel: 'ST-Depression',
        severity: 'abnormal',
        targetStructureId: 'left_ventricle',
        structureName: 'Left Ventricle Cavity & Free Wall',
        supplyingVessel: 'LCX',
        cameraPreset: 'lateral',
        clinicalNote: 'Horizontal or downsloping ST-segment depression indicative of subendocardial myocardial ischemia or reciprocal lateral wall strain.',
        sourceFeature: 'St Depression',
        featureValue: rawStDepr,
      });
    }
  }

  // -------------------------------------------------------------------------
  // 8. Tinversion (T-Wave Inversion)
  // -------------------------------------------------------------------------
  const rawTinv = getFeatureValue(inputs, 'Tinversion', 'T Inversion', 'T_Inversion', 'tinversion');
  if (rawTinv !== undefined && rawTinv !== null) {
    const isPresent =
      rawTinv === 1 ||
      rawTinv === '1' ||
      rawTinv === true ||
      String(rawTinv).toLowerCase() === 'yes';

    if (isPresent) {
      findings.push({
        id: 'finding-tinversion',
        title: 'T-Wave Inversion (Ischemic Repolarization)',
        badgeLabel: 'T-Inversion',
        severity: 'warning',
        targetStructureId: 'interventricular_septum',
        structureName: 'Interventricular Septum (IVS)',
        supplyingVessel: 'LAD',
        cameraPreset: 'anterior',
        clinicalNote: 'Symmetrical inverted T waves reflecting delayed or disordered ventricular repolarization secondary to coronary insufficiency.',
        sourceFeature: 'Tinversion',
        featureValue: rawTinv,
      });
    }
  }

  return findings;
}

/**
 * Returns all findings mapped to a given anatomical structure ID.
 * Used by DoctorInspectionDrawer to display active patient findings for that structure.
 */
export function getFindingsForStructure(
  structureId: string,
  inputs: Record<string, any> | undefined | null
): PatientFinding[] {
  const allFindings = evaluatePatientFindings(inputs);
  return allFindings.filter((f) => f.targetStructureId === structureId);
}
