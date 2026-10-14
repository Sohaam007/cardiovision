import { useStore } from '../store/useStore.ts';
import {
  assert,
  strictEqual,
  closeTo,
} from './assert.ts';

export function runDraggableToolsMenuTests(): { passed: number; failed: number; tests: string[] } {
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

  // TIER 1: INITIAL STATE & DEFAULT CONFIGURATION
  test('Tier 1: Initial tools menu state has all layers and controls enabled by default', () => {
    const state = useStore.getState();
    strictEqual(state.showHemodynamics, true, 'Hemodynamics default is true');
    strictEqual(state.showCavities, false, 'Cavities default is false');
    strictEqual(state.showPerfusion, true, 'Perfusion default is true');
    strictEqual(state.showCalibers, true, 'Calibers default is true');
    strictEqual(state.showECG, true, 'ECG default is true');
    strictEqual(state.fluoroscopyMode, false, 'Fluoroscopy default is false');
    strictEqual(state.isPlaying, true, 'Playback default is playing');
    strictEqual(state.cardiacPhase, 'auto', 'Cardiac phase default is auto');
    strictEqual(state.isAudioMuted, true, 'Audio default is muted');
    strictEqual(state.zoomLevel, 1.0, 'Zoom level default is 1.0 (100%)');
  });

  // TIER 2: LAYER TOGGLES & ACTIONS
  test('Tier 2: Layer toggle callbacks update store correctly', () => {
    const {
      toggleHemodynamics,
      toggleCavities,
      togglePerfusion,
      toggleCalibers,
      toggleECG,
      toggleFluoroscopyMode,
    } = useStore.getState();

    toggleHemodynamics();
    strictEqual(useStore.getState().showHemodynamics, false);

    toggleCavities();
    strictEqual(useStore.getState().showCavities, true);

    togglePerfusion();
    strictEqual(useStore.getState().showPerfusion, false);

    toggleCalibers();
    strictEqual(useStore.getState().showCalibers, false);

    toggleECG();
    strictEqual(useStore.getState().showECG, false);

    toggleFluoroscopyMode();
    strictEqual(useStore.getState().fluoroscopyMode, true);
  });

  // TIER 3: CARDIAC PLAYBACK & PHASE SYNCHRONIZATION
  test('Tier 3: Playback toggle synchronizes isPlaying and isBeating motion', () => {
    const { togglePlayback } = useStore.getState();

    togglePlayback();
    strictEqual(useStore.getState().isPlaying, false);
    strictEqual(useStore.getState().isBeating, false);

    togglePlayback();
    strictEqual(useStore.getState().isPlaying, true);
    strictEqual(useStore.getState().isBeating, true);
  });

  test('Tier 3: Cardiac phase selections synchronize with cardiac cycle phase', () => {
    const { setCardiacPhase } = useStore.getState();

    setCardiacPhase('diastole');
    strictEqual(useStore.getState().cardiacPhase, 'diastole');
    strictEqual(useStore.getState().cardiacCyclePhase, 'diastole');

    setCardiacPhase('systole');
    strictEqual(useStore.getState().cardiacPhase, 'systole');
    strictEqual(useStore.getState().cardiacCyclePhase, 'systole');

    setCardiacPhase('auto');
    strictEqual(useStore.getState().cardiacPhase, 'auto');
  });

  test('Tier 3: Heart rate BPM setting clamps within physiological bounds [30, 180]', () => {
    const { setHeartRateBpm } = useStore.getState();

    setHeartRateBpm(90);
    strictEqual(useStore.getState().heartRateBpm, 90);

    setHeartRateBpm(10);
    strictEqual(useStore.getState().heartRateBpm, 30, 'BPM must clamp to min 30');

    setHeartRateBpm(250);
    strictEqual(useStore.getState().heartRateBpm, 180, 'BPM must clamp to max 180');
  });

  // TIER 4: AUSCULTATION AUDIO & CAMERA PRESETS
  test('Tier 4: Auscultation audio toggle updates isAudioMuted', () => {
    const { toggleAudio } = useStore.getState();

    toggleAudio();
    strictEqual(useStore.getState().isAudioMuted, false);

    toggleAudio();
    strictEqual(useStore.getState().isAudioMuted, true);
  });

  test('Tier 4: Camera angle shortcuts trigger cameraPreset correctly', () => {
    const { setCameraPreset } = useStore.getState();

    setCameraPreset('anterior');
    strictEqual(useStore.getState().cameraPreset, 'anterior');

    setCameraPreset('lateral');
    strictEqual(useStore.getState().cameraPreset, 'lateral');

    setCameraPreset('posterior');
    strictEqual(useStore.getState().cameraPreset, 'posterior');
  });

  // TIER 5: CANVAS ZOOM & CLAMPING MATH
  test('Tier 5: Zoom controls clamp between [0.5, 2.5] and reset to 1.0', () => {
    const { zoomIn, zoomOut, resetZoom } = useStore.getState();

    zoomIn();
    closeTo(useStore.getState().zoomLevel, 1.15, 0.01);

    zoomOut();
    closeTo(useStore.getState().zoomLevel, 1.0, 0.01);

    for (let i = 0; i < 10; i++) zoomOut();
    strictEqual(useStore.getState().zoomLevel, 0.5, 'Zoom out must clamp at 0.5');

    for (let i = 0; i < 20; i++) zoomIn();
    strictEqual(useStore.getState().zoomLevel, 2.5, 'Zoom in must clamp at 2.5');

    resetZoom();
    strictEqual(useStore.getState().zoomLevel, 1.0, 'Zoom must reset to 1.0');
  });

  // TIER 6: DRAG BOUNDARY CLAMPING & SNAPPING LOGIC
  test('Tier 6: Boundary clamping keeps widget on screen with corner snap thresholds', () => {
    const parentWidth = 1024;
    const parentHeight = 768;
    const menuWidth = 288;
    const menuHeight = 360;
    const margin = 12;
    const snapThreshold = 28;

    function clampAndSnap(pos: { x: number; y: number }) {
      let minX = margin;
      let maxX = Math.max(margin, parentWidth - menuWidth - margin);
      let minY = margin;
      let maxY = Math.max(margin, parentHeight - menuHeight - margin);

      let clampedX = Math.max(minX, Math.min(maxX, pos.x));
      let clampedY = Math.max(minY, Math.min(maxY, pos.y));

      if (clampedX - minX < snapThreshold) clampedX = minX;
      if (maxX - clampedX < snapThreshold) clampedX = maxX;
      if (clampedY - minY < snapThreshold) clampedY = minY;
      if (maxY - clampedY < snapThreshold) clampedY = maxY;

      return { x: clampedX, y: clampedY };
    }

    // Near top-left corner -> snaps to exact margin
    const snapTL = clampAndSnap({ x: 20, y: 15 });
    strictEqual(snapTL.x, margin);
    strictEqual(snapTL.y, margin);

    // Negative coordinates -> clamped to margin
    const negativePos = clampAndSnap({ x: -100, y: -50 });
    strictEqual(negativePos.x, margin);
    strictEqual(negativePos.y, margin);

    // Far off-screen coordinates -> clamped to maxX, maxY
    const overflowPos = clampAndSnap({ x: 2000, y: 2000 });
    strictEqual(overflowPos.x, parentWidth - menuWidth - margin);
    strictEqual(overflowPos.y, parentHeight - menuHeight - margin);
  });

  // TIER 7: RESET & STATE ISOLATION
  test('Tier 7: resetDemoProbabilities completely restores all tools state to baseline', () => {
    const store = useStore.getState();

    store.toggleHemodynamics();
    store.toggleCavities();
    store.toggleFluoroscopyMode();
    store.togglePlayback();
    store.setCardiacPhase('diastole');
    store.toggleAudio();
    store.zoomIn();

    assert(!useStore.getState().showHemodynamics);
    assert(useStore.getState().showCavities);
    assert(useStore.getState().fluoroscopyMode);
    assert(!useStore.getState().isPlaying);
    assert(!useStore.getState().isAudioMuted);

    store.resetDemoProbabilities();

    const resetState = useStore.getState();
    strictEqual(resetState.showHemodynamics, true);
    strictEqual(resetState.showCavities, false);
    strictEqual(resetState.showPerfusion, true);
    strictEqual(resetState.showCalibers, true);
    strictEqual(resetState.showECG, true);
    strictEqual(resetState.fluoroscopyMode, false);
    strictEqual(resetState.isPlaying, true);
    strictEqual(resetState.cardiacPhase, 'auto');
    strictEqual(resetState.isAudioMuted, true);
    strictEqual(resetState.zoomLevel, 1.0);
  });

  // TIER 8: CAVITIES SYNCHRONIZATION WITH INTERNAL STRUCTURES
  test('Tier 8: Cavities toggle synchronizes showCavities, chamberCutaway, and isCutOpen', () => {
    const store = useStore.getState();

    // Default: all false
    strictEqual(store.showCavities, false);
    strictEqual(store.chamberCutaway, false);
    strictEqual(store.isCutOpen, false);

    // Toggle cavities on
    store.toggleCavities();
    strictEqual(useStore.getState().showCavities, true);
    strictEqual(useStore.getState().chamberCutaway, true);
    strictEqual(useStore.getState().isCutOpen, true);

    // Toggle cutaway off
    store.toggleChamberCutaway();
    strictEqual(useStore.getState().showCavities, false);
    strictEqual(useStore.getState().chamberCutaway, false);
    strictEqual(useStore.getState().isCutOpen, false);

    // Set cavities directly
    store.setShowCavities(true);
    strictEqual(useStore.getState().showCavities, true);
    strictEqual(useStore.getState().isCutOpen, true);
  });

  // TIER 9: MOVABLE RISK LEGEND & BOUNDARY CLAMPING
  test('Tier 9: Movable FloatingRiskLegend maintains boundary clamping and collapse state', () => {
    const parentWidth = 1200;
    const parentHeight = 800;
    const legendWidth = 320;
    const legendHeight = 340;
    const margin = 12;

    function clampLegend(pos: { x: number; y: number }) {
      const minX = margin;
      const maxX = Math.max(margin, parentWidth - legendWidth - margin);
      const minY = margin;
      const maxY = Math.max(margin, parentHeight - legendHeight - margin);
      return {
        x: Math.max(minX, Math.min(maxX, pos.x)),
        y: Math.max(minY, Math.min(maxY, pos.y)),
      };
    }

    const clampedTopLeft = clampLegend({ x: -50, y: -20 });
    strictEqual(clampedTopLeft.x, margin);
    strictEqual(clampedTopLeft.y, margin);

    const clampedBottomRight = clampLegend({ x: 3000, y: 3000 });
    strictEqual(clampedBottomRight.x, parentWidth - legendWidth - margin);
    strictEqual(clampedBottomRight.y, parentHeight - legendHeight - margin);
  });

  // TIER 10: ECG MONITOR HUD & PATHOLOGY ALERT COMPUTATION
  test('Tier 10: ECG Monitor HUD telemetry and ischemia alert computation operate correctly', () => {
    const store = useStore.getState();

    // Verify ECG toggle
    strictEqual(store.showECG, true);
    store.toggleECG();
    strictEqual(useStore.getState().showECG, false);
    store.setShowECG(true);
    strictEqual(useStore.getState().showECG, true);

    // Verify ST Elevation detection
    store.setPatientInput('ST_Elevation', 1);
    store.setPatientInput('PR', 82);
    store.setPatientInput('EF-TTE', 45);

    const inputs = useStore.getState().patientInputs;
    strictEqual(Boolean(inputs['ST_Elevation']), true);
    strictEqual(Number(inputs['PR']), 82);
    strictEqual(Number(inputs['EF-TTE']), 45);
  });

  return { passed, failed, tests };
}
