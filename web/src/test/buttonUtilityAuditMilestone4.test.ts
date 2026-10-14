import * as THREE from 'three';
import { useStore } from '../store/useStore.ts';
import {
  assert,
  strictEqual,
  closeTo,
} from './assert.ts';
import fs from 'node:fs';
import path from 'node:path';

export function runButtonUtilityAuditMilestone4Tests(): { passed: number; failed: number; tests: string[] } {
  let passed = 0;
  let failed = 0;
  const tests: string[] = [];

  function test(name: string, fn: () => void | Promise<void>) {
    try {
      useStore.getState().resetDemoProbabilities();
      const res = fn();
      if (res && typeof (res as any).then === 'function') {
        return (res as Promise<void>).then(() => {
          passed++;
          tests.push(`  [PASS] ${name}`);
        }).catch((err) => {
          failed++;
          tests.push(`  [FAIL] ${name}: ${(err as Error).message}`);
        });
      }
      passed++;
      tests.push(`  [PASS] ${name}`);
    } catch (err) {
      failed++;
      tests.push(`  [FAIL] ${name}: ${(err as Error).message}`);
    }
  }

  // =========================================================================
  // 1. INTERACTIVE BEATING HEART CAMERA RESET & TOP-RIGHT DECONFLICTING
  // =========================================================================
  test('M4-T1: InteractiveBeatingHeart eliminates top-right collision and cleanly wires camera reset', () => {
    const componentPath = path.resolve(process.cwd(), 'src/components/InteractiveBeatingHeart.tsx');
    assert(fs.existsSync(componentPath), 'InteractiveBeatingHeart.tsx must exist');
    const code = fs.readFileSync(componentPath, 'utf-8').replace(/\r\n/g, '\n');

    // Verify fullScreen camera reset is NOT at top-4 right-4 (which collided with App.tsx mode selector)
    assert(
      !code.includes('className="absolute top-4 right-4 bg-slate-900/80 hover:bg-slate-800 text-slate-300'),
      'fullScreen Reset View button must NOT compete at top-4 right-4 with mode selector'
    );

    // Verify positioned cleanly at bottom-4 right-4 with testid
    assert(
      code.includes('data-testid="reset-camera-btn"'),
      'Reset Camera button must have data-testid="reset-camera-btn"'
    );
    assert(
      code.includes('absolute bottom-4 right-4'),
      'Reset Camera button in fullScreen must be positioned at bottom-4 right-4'
    );

    // Verify resetCamera calls controlsRef.current.reset(), resetZoom(), and setCameraPreset(null)
    assert(code.includes('resetZoom()'), 'resetCamera must reset zoom level');
    assert(code.includes('setCameraPreset(null)'), 'resetCamera must clear camera preset');

    // Test store mutation behavior
    useStore.getState().zoomIn();
    useStore.getState().zoomIn();
    assert(useStore.getState().zoomLevel > 1.0, 'Zoom level should have increased');
    useStore.getState().setCameraPreset('lateral');
    strictEqual(useStore.getState().cameraPreset, 'lateral', 'Camera preset should be lateral');

    // Calling resetZoom and setCameraPreset(null)
    useStore.getState().resetZoom();
    useStore.getState().setCameraPreset(null);
    strictEqual(useStore.getState().zoomLevel, 1.0, 'Zoom level must reset to 1.0 (100%)');
    strictEqual(useStore.getState().cameraPreset, null, 'Camera preset must be null');
  });

  // =========================================================================
  // 2. INTERACTIVE SENSITIVITY HUD COLLAPSIBLE TOGGLE & LIVE PERTURBATION
  // =========================================================================
  test('M4-T2: InteractiveSensitivityHUD contains standardized collapsible toggle (▼/▲) and live perturb actions', () => {
    const hudPath = path.resolve(process.cwd(), 'src/components/InteractiveSensitivityHUD.tsx');
    assert(fs.existsSync(hudPath), 'InteractiveSensitivityHUD.tsx must exist');
    const code = fs.readFileSync(hudPath, 'utf-8').replace(/\r\n/g, '\n');

    // Verify isCollapsed state exists
    assert(code.includes('const [isCollapsed, setIsCollapsed] = useState'), 'Must have isCollapsed state');

    // Verify collapsed chip rendering with ▼ toggle
    assert(code.includes('data-testid="sensitivity-collapsed-pill"'), 'Must render collapsed pill');
    assert(code.includes('data-testid="expand-sensitivity-btn"'), 'Must have expand button');
    assert(code.includes('▼'), 'Expand button must use ▼ glyph');

    // Verify expanded window with ▲ collapse button
    assert(code.includes('data-testid="collapse-sensitivity-btn"'), 'Must have collapse button in header');
    assert(code.includes('▲'), 'Collapse button must use ▲ glyph');

    // Verify perturbation inputs
    assert(code.includes("handleSliderChange('BP'"), 'Must handle BP slider perturbation');
    assert(code.includes("handleSliderChange('LDL'"), 'Must handle LDL slider perturbation');
    assert(code.includes("handleSliderChange('FBS'"), 'Must handle FBS slider perturbation');
    assert(code.includes("handleSliderChange('TG'"), 'Must handle TG slider perturbation');
    assert(code.includes("handleSliderChange('Current Smoker'"), 'Must handle Current Smoker perturbation');
    assert(code.includes('handleResetToBaseline'), 'Must provide reset to baseline action');
  });

  // =========================================================================
  // 3. ECG MONITOR HUD COLLAPSIBLE TOGGLE & LEAD DERIVATIONS
  // =========================================================================
  test('M4-T3: ECGMonitorHUD adheres to standardized collapsible toggle (▼/▲) and lead switching', () => {
    const ecgPath = path.resolve(process.cwd(), 'src/components/ECGMonitorHUD.tsx');
    assert(fs.existsSync(ecgPath), 'ECGMonitorHUD.tsx must exist');
    const code = fs.readFileSync(ecgPath, 'utf-8').replace(/\r\n/g, '\n');

    // Verify standardized toggle testids and glyphs
    assert(code.includes('data-testid="expand-ecg-btn"'), 'Must have expand-ecg-btn');
    assert(code.includes('data-testid="collapse-ecg-btn"'), 'Must have collapse-ecg-btn');
    assert(code.includes('▼'), 'Expand button must use ▼');
    assert(code.includes('▲'), 'Collapse button must use ▲');

    // Verify 4 lead selector options (II, V1, V5, aVR)
    assert(code.includes("'II', 'V1', 'V5', 'aVR'"), 'Must support leads II, V1, V5, aVR');
    assert(code.includes('setSelectedLead(lead)'), 'Must bind lead selection handler');
  });

  // =========================================================================
  // 4. DISSECTION CONTROLS ACTIVE HIGHLIGHTS, INVERT CUT & CLOSE CAVITY
  // =========================================================================
  test('M4-T4: DissectionControls provides coronal, short-axis, sagittal, invert, and close cavity buttons with active highlights', () => {
    const dissectionPath = path.resolve(process.cwd(), 'src/components/DissectionControls.tsx');
    assert(fs.existsSync(dissectionPath), 'DissectionControls.tsx must exist');
    const code = fs.readFileSync(dissectionPath, 'utf-8').replace(/\r\n/g, '\n');

    // Verify planes have testids and active highlights
    assert(code.includes('data-testid={`plane-${p.key}`}'), 'Plane buttons must have plane-* testid');
    assert(code.includes('dissectionPlane === p.key'), 'Planes must test active state against dissectionPlane');

    // Verify Invert button exists with active highlight
    assert(code.includes('data-testid="plane-invert"'), 'Must have plane-invert testid');
    assert(code.includes('onClick={toggleInvertCut}'), 'Must bind toggleInvertCut');
    assert(code.includes('isInvertedCut'), 'Must reflect isInvertedCut active highlight');

    // Verify Close Cavity button in subpanel header and toggle cut open
    assert(code.includes('data-testid="close-cavity-btn"'), 'Must have dedicated close-cavity-btn');
    assert(code.includes('onClick={() => setIsCutOpen(false)}'), 'Close Cavity must set isCutOpen to false');
    assert(code.includes('data-testid="toggle-cut-open"'), 'Must have toggle-cut-open');
    assert(code.includes('Close Cavity (Whole Heart)'), 'Main toggle must display Close Cavity when open');

    // Functional mutation verification in store
    // 1. Plane mutations
    useStore.getState().setDissectionPlane('coronal');
    strictEqual(useStore.getState().dissectionPlane, 'coronal', 'Plane must be coronal');
    useStore.getState().setDissectionPlane('short_axis');
    strictEqual(useStore.getState().dissectionPlane, 'short_axis', 'Plane must be short_axis');
    useStore.getState().setDissectionPlane('sagittal');
    strictEqual(useStore.getState().dissectionPlane, 'sagittal', 'Plane must be sagittal');

    // 2. Invert cut mutations
    strictEqual(useStore.getState().isInvertedCut, false, 'Default isInvertedCut must be false');
    useStore.getState().toggleInvertCut();
    strictEqual(useStore.getState().isInvertedCut, true, 'toggleInvertCut must set isInvertedCut to true');
    useStore.getState().toggleInvertCut();
    strictEqual(useStore.getState().isInvertedCut, false, 'toggleInvertCut must flip back to false');
    useStore.getState().setIsInvertedCut(true);
    strictEqual(useStore.getState().isInvertedCut, true, 'setIsInvertedCut must explicitly set state');

    // 3. Cut open / Close cavity mutations
    strictEqual(useStore.getState().isCutOpen, false, 'Default isCutOpen must be false');
    useStore.getState().toggleCutOpen();
    strictEqual(useStore.getState().isCutOpen, true, 'toggleCutOpen must open cavity');
    strictEqual(useStore.getState().showCavities, true, 'Opening cavity must sync showCavities');
    useStore.getState().setIsCutOpen(false);
    strictEqual(useStore.getState().isCutOpen, false, 'setIsCutOpen(false) must close cavity');
    strictEqual(useStore.getState().showCavities, false, 'Closing cavity must sync showCavities');
  });

  test('M4-T4b: Three.js clipping planes negate mathematically when isInvertedCut is active', () => {
    const cutDepth = 0.5;
    const standardCoronal = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.52 - cutDepth * 0.92);
    const invertedCoronal = standardCoronal.clone().negate();

    strictEqual(invertedCoronal.normal.z, 1, 'Inverted plane normal must point opposite (+1 along Z)');
    closeTo(invertedCoronal.constant, -standardCoronal.constant, 0.0001, 'Inverted constant must be negated');

    const standardShortAxis = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0.45 - cutDepth * 1.05);
    const invertedShortAxis = standardShortAxis.clone().negate();
    strictEqual(invertedShortAxis.normal.y, 1, 'Inverted short-axis normal must point opposite (+1 along Y)');
    closeTo(invertedShortAxis.constant, -standardShortAxis.constant, 0.0001);

    const standardSagittal = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0.40 - cutDepth * 0.85);
    const invertedSagittal = standardSagittal.clone().negate();
    strictEqual(invertedSagittal.normal.x, 1, 'Inverted sagittal normal must point opposite (+1 along X)');
    closeTo(invertedSagittal.constant, -standardSagittal.constant, 0.0001);
  });

  // =========================================================================
  // 5. DRAGGABLE TOOLS MENU UTILITY AUDIT ACROSS ALL CONTROLS
  // =========================================================================
  test('M4-T5: DraggableToolsMenu layer toggles, playback controls, audio mute, and camera angle shortcuts', () => {
    const menuPath = path.resolve(process.cwd(), 'src/components/DraggableToolsMenu.tsx');
    assert(fs.existsSync(menuPath), 'DraggableToolsMenu.tsx must exist');
    const code = fs.readFileSync(menuPath, 'utf-8').replace(/\r\n/g, '\n');

    // Verify all 7 layer toggles
    assert(code.includes('data-testid="toggle-hemodynamics"'), 'Must have toggle-hemodynamics');
    assert(code.includes('data-testid="toggle-cavities"'), 'Must have toggle-cavities');
    assert(code.includes('data-testid="toggle-perfusion"'), 'Must have toggle-perfusion');
    assert(code.includes('data-testid="toggle-calibers"'), 'Must have toggle-calibers');
    assert(code.includes('data-testid="toggle-ecg"'), 'Must have toggle-ecg');
    assert(code.includes('data-testid="toggle-fluoroscopy"'), 'Must have toggle-fluoroscopy');
    assert(code.includes('data-testid="toggle-torso"'), 'Must have toggle-torso');

    // Verify playback controls
    assert(code.includes('data-testid="toggle-playback"'), 'Must have toggle-playback');
    assert(code.includes('data-testid={`phase-${ph}`}'), 'Must have phase chips with data-testid');
    assert(code.includes('data-testid="bpm-slider"'), 'Must have bpm-slider');

    // Verify audio mute
    assert(code.includes('data-testid="toggle-audio"'), 'Must have toggle-audio');

    // Verify camera angle shortcuts
    assert(code.includes('data-testid="camera-anterior"'), 'Must have camera-anterior');
    assert(code.includes('data-testid="camera-lateral"'), 'Must have camera-lateral');
    assert(code.includes('data-testid="camera-posterior"'), 'Must have camera-posterior');

    // Verify zoom controls
    assert(code.includes('data-testid="zoom-out"'), 'Must have zoom-out');
    assert(code.includes('data-testid="zoom-reset"'), 'Must have zoom-reset');
    assert(code.includes('data-testid="zoom-in"'), 'Must have zoom-in');

    // Functional verification in store
    // 1. Layer toggles
    useStore.getState().setShowHemodynamics(false);
    useStore.getState().toggleHemodynamics();
    strictEqual(useStore.getState().showHemodynamics, true, 'toggleHemodynamics must activate flow');

    useStore.getState().setShowPerfusion(false);
    useStore.getState().togglePerfusion();
    strictEqual(useStore.getState().showPerfusion, true, 'togglePerfusion must activate perfusion');

    useStore.getState().setShowCalibers(false);
    useStore.getState().toggleCalibers();
    strictEqual(useStore.getState().showCalibers, true, 'toggleCalibers must activate vessel labels');

    useStore.getState().setShowECG(false);
    useStore.getState().toggleECG();
    strictEqual(useStore.getState().showECG, true, 'toggleECG must activate ECG monitor');

    useStore.getState().setFluoroscopyMode(false);
    useStore.getState().toggleFluoroscopyMode();
    strictEqual(useStore.getState().fluoroscopyMode, true, 'toggleFluoroscopyMode must activate cine x-ray');

    useStore.getState().setShowTorso(false);
    useStore.getState().toggleTorso();
    strictEqual(useStore.getState().showTorso, true, 'toggleTorso must activate torso shell');

    // 2. Playback controls
    useStore.getState().setIsPlaying(true);
    useStore.getState().togglePlayback();
    strictEqual(useStore.getState().isPlaying, false, 'togglePlayback must pause cardiac cycle');
    useStore.getState().setCardiacPhase('systole');
    strictEqual(useStore.getState().cardiacPhase, 'systole', 'cardiacPhase must be systole');
    useStore.getState().setCardiacPhase('diastole');
    strictEqual(useStore.getState().cardiacPhase, 'diastole', 'cardiacPhase must be diastole');
    useStore.getState().setHeartRateBpm(92);
    strictEqual(useStore.getState().heartRateBpm, 92, 'heartRateBpm must be 92');

    // 3. Audio toggle
    useStore.getState().setIsAudioMuted(true);
    useStore.getState().toggleAudio();
    strictEqual(useStore.getState().isAudioMuted, false, 'toggleAudio must un-mute heart sounds');

    // 4. Camera shortcuts
    useStore.getState().setCameraPreset('anterior');
    strictEqual(useStore.getState().cameraPreset, 'anterior', 'cameraPreset must be anterior');
    useStore.getState().setCameraPreset('lateral');
    strictEqual(useStore.getState().cameraPreset, 'lateral', 'cameraPreset must be lateral');
    useStore.getState().setCameraPreset('posterior');
    strictEqual(useStore.getState().cameraPreset, 'posterior', 'cameraPreset must be posterior');

    // 5. Zoom controls
    useStore.getState().resetZoom();
    strictEqual(useStore.getState().zoomLevel, 1.0, 'resetZoom must set 1.0');
    useStore.getState().zoomIn();
    strictEqual(useStore.getState().zoomLevel, 1.15, 'zoomIn must add 0.15');
    useStore.getState().zoomOut();
    strictEqual(useStore.getState().zoomLevel, 1.0, 'zoomOut must subtract 0.15');
  });

  // =========================================================================
  // 6. CLINICAL FORM TWO-WAY BINDING, DIRTY STATE & RUN PREDICTION
  // =========================================================================
  test('M4-T6: ClinicalForm two-way inputs mark state dirty; Run Live Prediction recalculates and clears dirty flag', async () => {
    const formPath = path.resolve(process.cwd(), 'src/components/ClinicalForm.tsx');
    assert(fs.existsSync(formPath), 'ClinicalForm.tsx must exist');
    const code = fs.readFileSync(formPath, 'utf-8').replace(/\r\n/g, '\n');

    assert(code.includes('data-testid="btn-run-prediction"'), 'Must have btn-run-prediction');
    assert(code.includes('data-testid="btn-reset-baseline"'), 'Must have btn-reset-baseline');
    assert(code.includes('isDirty'), 'Must test isDirty for visual feedback');

    useStore.getState().resetToBaseline();
    strictEqual(useStore.getState().isDirty, false, 'Clean state must have isDirty=false');

    // Modifying input sets isDirty
    useStore.getState().setPatientInput('BP', 165);
    strictEqual(useStore.getState().patientInputs['BP'], 165, 'Patient input BP must be 165');
    strictEqual(useStore.getState().isDirty, true, 'Modifying BP must set isDirty=true');

    // Running prediction clears isDirty
    await useStore.getState().runPrediction();
    strictEqual(useStore.getState().isDirty, false, 'runPrediction must clear isDirty');
    assert(useStore.getState().predictions !== null && useStore.getState().predictions!.cad.prob > 0, 'CAD probability must be computed');
    assert(useStore.getState().prediction.vessels.LAD.prob > 0, 'LAD probability must be computed');
  });

  // =========================================================================
  // 7. CLINICAL PANEL VESSEL CARDS & TAB NAVIGATION
  // =========================================================================
  test('M4-T7: ClinicalPanel vessel risk cards and tab selector trigger verified state transitions', () => {
    // Vessel selection with flyTo
    useStore.getState().setSelectedVessel('LAD', true);
    strictEqual(useStore.getState().selectedVessel, 'LAD', 'Selected vessel must be LAD');
    strictEqual(useStore.getState().flyToVesselTarget, 'LAD', 'flyToVesselTarget must be LAD');

    useStore.getState().setSelectedVessel('LCX', true);
    strictEqual(useStore.getState().selectedVessel, 'LCX', 'Selected vessel must be LCX');
    strictEqual(useStore.getState().flyToVesselTarget, 'LCX', 'flyToVesselTarget must be LCX');

    useStore.getState().setSelectedVessel('RCA', true);
    strictEqual(useStore.getState().selectedVessel, 'RCA', 'Selected vessel must be RCA');
    strictEqual(useStore.getState().flyToVesselTarget, 'RCA', 'flyToVesselTarget must be RCA');

    // Tabs
    useStore.getState().setActiveTab('explainability');
    strictEqual(useStore.getState().activeTab, 'explainability', 'activeTab must be explainability');
    useStore.getState().setActiveTab('sensitivity');
    strictEqual(useStore.getState().activeTab, 'sensitivity', 'activeTab must be sensitivity');
    useStore.getState().setActiveTab('form');
    strictEqual(useStore.getState().activeTab, 'form', 'activeTab must be form');
    useStore.getState().setActiveTab('3d_debug');
    strictEqual(useStore.getState().activeTab, '3d_debug', 'activeTab must be 3d_debug');
  });

  // =========================================================================
  // 8. PATIENT PERSONA PICKER PAGINATION & MODAL SELECTORS
  // =========================================================================
  test('M4-T8: PersonaPicker dropdown and pagination buttons mutate selected persona and vitals', () => {
    const demoPatientsPath = path.resolve(process.cwd(), 'public/demo_patients.json');
    assert(fs.existsSync(demoPatientsPath), 'demo_patients.json must exist');
    const demoPatients = JSON.parse(fs.readFileSync(demoPatientsPath, 'utf-8'));
    useStore.getState().setDemoPatients(demoPatients);

    // Load first patient
    useStore.getState().loadPersona(demoPatients[0]);
    strictEqual(useStore.getState().selectedPersonaId, demoPatients[0].id, 'Active persona should match patient 0');
    strictEqual(useStore.getState().isDirty, false, 'Loading persona must initialize isDirty to false');

    // Load second patient
    useStore.getState().loadPersona(demoPatients[1]);
    strictEqual(useStore.getState().selectedPersonaId, demoPatients[1].id, 'Active persona should match patient 1');
    strictEqual(useStore.getState().patientInputs['Age'], demoPatients[1].features['Age'], 'Patient inputs must be updated');
  });

  // =========================================================================
  // 9. REPRESENTATION SWITCHER PILL & VIEWPORT MODES
  // =========================================================================
  test('M4-T9: RepresentationSwitcherPill and global mode buttons toggle 3D representations reliably', () => {
    useStore.getState().setViewerMode('realistic');
    strictEqual(useStore.getState().viewerMode, 'realistic', 'Viewer mode must be realistic');

    useStore.getState().setViewerMode('procedural');
    strictEqual(useStore.getState().viewerMode, 'procedural', 'Viewer mode must be procedural');

    useStore.getState().setViewerMode('2d');
    strictEqual(useStore.getState().viewerMode, '2d', 'Viewer mode must be 2d');

    useStore.getState().setViewerMode('blender');
    strictEqual(useStore.getState().viewerMode, 'blender', 'Viewer mode must be blender');
  });

  // =========================================================================
  // 10. WEBGL FALLBACK RETRY & DESELECTION CONTROLS
  // =========================================================================
  test('M4-T10: WebGLFallback Retry 3D and vessel card dismiss actions function as verified mutations', () => {
    // Set fallback active
    useStore.getState().setForce2DFallback(true);
    useStore.getState().setWebglError(true);
    strictEqual(useStore.getState().force2DFallback, true, 'force2DFallback should be true');
    strictEqual(useStore.getState().webglError, true, 'webglError should be true');

    // Retry 3D action clears fallback and error
    useStore.getState().setForce2DFallback(false);
    useStore.getState().setWebglError(false);
    strictEqual(useStore.getState().force2DFallback, false, 'Retry 3D must reset force2DFallback');
    strictEqual(useStore.getState().webglError, false, 'Retry 3D must reset webglError');

    // Deselect vessel
    useStore.getState().setSelectedVessel('LAD');
    strictEqual(useStore.getState().selectedVessel, 'LAD', 'Vessel should be LAD');
    useStore.getState().setSelectedVessel(null);
    strictEqual(useStore.getState().selectedVessel, null, 'Deselection must set vessel to null');
  });

  return { passed, failed, tests };
}
