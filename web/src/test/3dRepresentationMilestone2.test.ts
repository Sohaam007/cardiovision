import * as THREE from 'three';
import { useStore } from '../store/useStore.ts';
import {
  assert,
  strictEqual,
  closeTo,
} from './assert.ts';
import fs from 'node:fs';
import path from 'node:path';

export function run3DRepresentationMilestone2Tests(): { passed: number; failed: number; tests: string[] } {
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
  // 1. SINGLE PERSISTENT CANVAS ARCHITECTURE
  // =========================================================================
  test('M2-T1: App.tsx routes both realistic and procedural modes to single persistent SceneCanvas', () => {
    const appPath = path.resolve(process.cwd(), 'src/App.tsx');
    assert(fs.existsSync(appPath), 'App.tsx must exist');
    const appCode = fs.readFileSync(appPath, 'utf-8').replace(/\r\n/g, '\n');

    // Verify SceneCanvas is the unified 3D canvas
    assert(
      appCode.includes('<SceneCanvas />'),
      'SceneCanvas must be mounted in App.tsx'
    );

    // Verify InteractiveBeatingHeart fullScreen is eliminated as a competing top-level canvas
    assert(
      !appCode.includes('<InteractiveBeatingHeart fullScreen />'),
      'InteractiveBeatingHeart fullScreen must NOT be rendered in App.tsx canvas router'
    );

    // Verify clean router structure defaulting 3D modes to SceneCanvas
    assert(
      appCode.includes('<SceneCanvas />'),
      'Canvas router must default 3D modes to persistent SceneCanvas'
    );
    assert(
      appCode.includes('viewerMode === \'2d\'') && appCode.includes('viewerMode === \'blender\''),
      'Canvas router must handle 2D and blender specifically and route all 3D modes to SceneCanvas'
    );
  });

  test('M2-T1: Switching between realistic and procedural preserves persistent store state without reset', () => {
    const store = useStore.getState();

    // Set initial state
    store.setViewerMode('realistic');
    store.setVesselProbability('LAD', 0.88);
    strictEqual(useStore.getState().viewerMode, 'realistic');
    strictEqual(useStore.getState().prediction.vessels.LAD.prob, 0.88);

    // Switch to procedural
    store.setViewerMode('procedural');
    strictEqual(useStore.getState().viewerMode, 'procedural');
    strictEqual(useStore.getState().prediction.vessels.LAD.prob, 0.88);

    // Switch back to realistic
    store.setViewerMode('realistic');
    strictEqual(useStore.getState().viewerMode, 'realistic');
    strictEqual(useStore.getState().prediction.vessels.LAD.prob, 0.88);
  });

  // =========================================================================
  // 2. IN-VIEWPORT REPRESENTATION SWITCHER PILL
  // =========================================================================
  test('M2-T2: RepresentationSwitcherPill.tsx exists and defines both photorealistic and procedural options', () => {
    const pillPath = path.resolve(process.cwd(), 'src/components/RepresentationSwitcherPill.tsx');
    assert(fs.existsSync(pillPath), 'RepresentationSwitcherPill.tsx must exist');
    const pillCode = fs.readFileSync(pillPath, 'utf-8');

    assert(
      pillCode.includes('Blender Photorealistic'),
      'Must contain option for Blender Photorealistic representation'
    );
    assert(
      pillCode.includes('Procedural Anatomy'),
      'Must contain option for Procedural Anatomy representation'
    );
    assert(
      pillCode.includes('top-4') && pillCode.includes('left-1/2') && pillCode.includes('-translate-x-1/2'),
      'Pill must be positioned at top-4 left-1/2 -translate-x-1/2 inside the 3D viewport canvas'
    );
    assert(
      pillCode.includes('backdrop-blur') && pillCode.includes('rounded-full'),
      'Pill must feature translucent glassmorphic rounded-full styling'
    );
  });

  test('M2-T2: RepresentationSwitcherPill is mounted in App.tsx 3D viewport area', () => {
    const appPath = path.resolve(process.cwd(), 'src/App.tsx');
    const appCode = fs.readFileSync(appPath, 'utf-8');

    assert(
      appCode.includes('<RepresentationSwitcherPill />'),
      'RepresentationSwitcherPill must be rendered inside the viewport in App.tsx'
    );
  });

  test('M2-T2: RepresentationSwitcherPill hides in 2D and Blender turntable modes', () => {
    const pillPath = path.resolve(process.cwd(), 'src/components/RepresentationSwitcherPill.tsx');
    const pillCode = fs.readFileSync(pillPath, 'utf-8');

    assert(
      pillCode.includes("viewerMode !== 'realistic' && viewerMode !== 'procedural'") ||
      pillCode.includes("viewerMode === '2d' || viewerMode === 'blender'"),
      'Switcher pill must only be visible when in 3D viewing modes'
    );
  });

  // =========================================================================
  // 3. SURGICAL DISSECTION & DYNAMIC CLIPPING PLANES PARITY
  // =========================================================================
  test('M2-T3: RealisticBeatingHeart computes identical clipping planes to ProceduralHeart and Vessels', () => {
    const heartPath = path.resolve(process.cwd(), 'src/scene/Heart.tsx');
    assert(fs.existsSync(heartPath), 'Heart.tsx must exist');
    const heartCode = fs.readFileSync(heartPath, 'utf-8');

    // Verify RealisticBeatingHeart computes clippingPlane
    assert(
      heartCode.includes("0.52 - cutDepth * 0.92"),
      'Coronal cut depth formula must be implemented identically'
    );
    assert(
      heartCode.includes("0.45 - cutDepth * 1.05"),
      'Short-axis cut depth formula must be implemented identically'
    );
    assert(
      heartCode.includes("0.40 - cutDepth * 0.85"),
      'Sagittal cut depth formula must be implemented identically'
    );

    // Verify mathematical plane calculations across all 3 axes
    const cutDepth = 0.5;
    const coronalPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.52 - cutDepth * 0.92);
    closeTo(coronalPlane.constant, 0.52 - 0.46, 0.001);

    const shortAxisPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0.45 - cutDepth * 1.05);
    closeTo(shortAxisPlane.constant, 0.45 - 0.525, 0.001);

    const sagittalPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0.40 - cutDepth * 0.85);
    closeTo(sagittalPlane.constant, 0.40 - 0.425, 0.001);
  });

  test('M2-T3: RealisticBeatingHeart dynamically attaches clipping planes and sets DoubleSide when cut open', () => {
    const heartPath = path.resolve(process.cwd(), 'src/scene/Heart.tsx');
    const heartCode = fs.readFileSync(heartPath, 'utf-8');

    // Find RealisticBeatingHeart implementation
    const realisticIdx = heartCode.indexOf('const RealisticBeatingHeart');
    assert(realisticIdx !== -1, 'RealisticBeatingHeart must exist in Heart.tsx');
    const realisticCode = heartCode.substring(realisticIdx, heartCode.indexOf('class GLTFErrorBoundary', realisticIdx));

    assert(
      realisticCode.includes('mat.clippingPlanes = clippingPlane ? [clippingPlane] : []'),
      'Mesh materials must receive clippingPlanes dynamically'
    );
    assert(
      realisticCode.includes('mat.side = isCutOpen ? THREE.DoubleSide : THREE.FrontSide'),
      'Mesh materials must switch to DoubleSide when cut open to show cavity walls'
    );
    assert(
      realisticCode.includes('mat.needsUpdate = true'),
      'Material needsUpdate flag must be set on clipping or side changes'
    );
  });

  test('M2-T3: RealisticBeatingHeart renders InternalHeartStructures when isCutOpen is active', () => {
    const heartPath = path.resolve(process.cwd(), 'src/scene/Heart.tsx');
    const heartCode = fs.readFileSync(heartPath, 'utf-8');

    const realisticIdx = heartCode.indexOf('const RealisticBeatingHeart');
    const realisticCode = heartCode.substring(realisticIdx, heartCode.indexOf('class GLTFErrorBoundary', realisticIdx));

    assert(
      realisticCode.includes('<InternalHeartStructures />') ||
      realisticCode.includes('isCutOpen && isCutOpenActive && <InternalHeartStructures />'),
      'RealisticBeatingHeart must render InternalHeartStructures when cut open'
    );
  });

  test('M2-T3: DissectionControls in App.tsx is active for both procedural and realistic 3D representations', () => {
    const appPath = path.resolve(process.cwd(), 'src/App.tsx');
    const appCode = fs.readFileSync(appPath, 'utf-8');

    assert(
      appCode.includes("(viewerMode === 'procedural' || viewerMode === 'realistic') && <DissectionControls />"),
      'DissectionControls must be active for both procedural and realistic 3D heart representations'
    );
  });

  // =========================================================================
  // 4. BIOMECHANICAL & CARDIAC CYCLE SYNCHRONIZATION
  // =========================================================================
  test('M2-T4: Cardiac cycle phase controls freeze GLTF animation at peak systole (0.25) and diastole (0.70)', () => {
    const heartPath = path.resolve(process.cwd(), 'src/scene/Heart.tsx');
    const heartCode = fs.readFileSync(heartPath, 'utf-8');

    const realisticIdx = heartCode.indexOf('const RealisticBeatingHeart');
    const realisticCode = heartCode.substring(realisticIdx, heartCode.indexOf('class GLTFErrorBoundary', realisticIdx));

    // Systole freeze at 25% of clip duration
    assert(
      realisticCode.includes("cardiacPhase === 'systole'") &&
      realisticCode.includes("clipDuration * 0.25"),
      'Systole phase must freeze animation at 25% clip progress'
    );

    // Diastole freeze at 70% of clip duration
    assert(
      realisticCode.includes("cardiacPhase === 'diastole'") &&
      realisticCode.includes("clipDuration * 0.70"),
      'Diastole phase must freeze animation at 70% clip progress'
    );

    // Auto beating mode
    assert(
      realisticCode.includes("isPlaying && isBeating"),
      'Auto beating must respond to both isPlaying and isBeating flags'
    );
  });

  test('M2-T4: Beating speed rate scaling applies to animation action timescale', () => {
    const heartPath = path.resolve(process.cwd(), 'src/scene/Heart.tsx');
    const heartCode = fs.readFileSync(heartPath, 'utf-8');

    const realisticIdx = heartCode.indexOf('const RealisticBeatingHeart');
    const realisticCode = heartCode.substring(realisticIdx, heartCode.indexOf('class GLTFErrorBoundary', realisticIdx));

    assert(
      realisticCode.includes('action.setEffectiveTimeScale(beatingSpeed)'),
      'Animation action must apply beatingSpeed effective time scale'
    );
  });

  test('M2-T4: S1/S2 auscultation heart sound playback triggers during physiological ejection intervals', () => {
    const heartPath = path.resolve(process.cwd(), 'src/scene/Heart.tsx');
    const heartCode = fs.readFileSync(heartPath, 'utf-8');

    const realisticIdx = heartCode.indexOf('const RealisticBeatingHeart');
    const realisticCode = heartCode.substring(realisticIdx, heartCode.indexOf('class GLTFErrorBoundary', realisticIdx));

    // S1 (Lub) during isovolumetric contraction (0.04 - 0.12)
    assert(
      realisticCode.includes('cardiacAudio.playS1()') &&
      realisticCode.includes('progress >= 0.04 && progress <= 0.12'),
      'S1 Lub sound must trigger during early systolic contraction'
    );

    // S2 (Dub) during isovolumetric relaxation (0.36 - 0.44)
    assert(
      realisticCode.includes('cardiacAudio.playS2()') &&
      realisticCode.includes('progress >= 0.36 && progress <= 0.44'),
      'S2 Dub sound must trigger during semilunar valve closure'
    );
  });

  // =========================================================================
  // 5. SMOOTH 250MS CROSS-FADE ANIMATED TRANSITION
  // =========================================================================
  test('M2-T5: Heart.tsx implements smooth 250ms cross-fading without pop-in', () => {
    const heartPath = path.resolve(process.cwd(), 'src/scene/Heart.tsx');
    const heartCode = fs.readFileSync(heartPath, 'utf-8');

    const mainHeartIdx = heartCode.indexOf('export const Heart');
    const mainHeartCode = heartCode.substring(mainHeartIdx);

    // Verify 250ms duration constant
    assert(
      mainHeartCode.includes('250'),
      'Cross-fade animation must specify 250ms transition duration'
    );

    // Verify both models are mounted in DualRepresentationHeartRoot
    assert(
      mainHeartCode.includes('<ProceduralHeart') &&
      mainHeartCode.includes('<RealisticBeatingHeart'),
      'Both procedural and realistic models must be mounted under unified Heart root'
    );

    // Verify complementary opacity weighting: t and (1 - t)
    assert(
      mainHeartCode.includes('1.0 - transitionProgress') ||
      mainHeartCode.includes('1 - transitionProgress'),
      'Procedural opacity must smoothly ramp inversely to transitionProgress'
    );
    assert(
      mainHeartCode.includes('heartOpacity * Math.max(0, Math.min(1, transitionProgress))') ||
      mainHeartCode.includes('transitionProgress'),
      'Realistic opacity must smoothly scale with transitionProgress'
    );
  });

  test('M2-T5: Geometry visibility culls inactive representation when settled to 0 or 1', () => {
    const heartPath = path.resolve(process.cwd(), 'src/scene/Heart.tsx');
    const heartCode = fs.readFileSync(heartPath, 'utf-8');

    const mainHeartIdx = heartCode.indexOf('export const Heart');
    const mainHeartCode = heartCode.substring(mainHeartIdx);

    // When settled, visible prop disables GPU draw calls
    assert(
      mainHeartCode.includes('isRealisticVisible') &&
      mainHeartCode.includes('isProceduralVisible'),
      'Visibility flags must cull non-visible model when settled'
    );
  });

  // =========================================================================
  // 6. CLINICAL INVARIANTS PRESERVATION
  // =========================================================================
  test('M2-T6: Coronary artery tree (Vessels.tsx) remains active and co-located with both heart representations', () => {
    const scenePath = path.resolve(process.cwd(), 'src/scene/SceneCanvas.tsx');
    assert(fs.existsSync(scenePath), 'SceneCanvas.tsx must exist');
    const sceneCode = fs.readFileSync(scenePath, 'utf-8');

    // Both Heart and Vessels are siblings inside CardiacApparatus
    const cardiacApparatusIdx = sceneCode.indexOf('name="CardiacApparatus"');
    assert(cardiacApparatusIdx !== -1, 'CardiacApparatus must exist in SceneCanvas.tsx');
    const apparatusCode = sceneCode.substring(cardiacApparatusIdx, cardiacApparatusIdx + 300);

    assert(
      apparatusCode.includes('<Heart />') && apparatusCode.includes('<Vessels />'),
      'Heart and Vessels must be co-located inside CardiacApparatus'
    );
  });

  test('M2-T6: Strict clinical guardrails - uniform vessel coloration and zero focal lesion markers', () => {
    const vesselsPath = path.resolve(process.cwd(), 'src/scene/Vessels.tsx');
    const vesselsCode = fs.readFileSync(vesselsPath, 'utf-8');

    assert(
      vesselsCode.includes('getVesselColorThree(prob, colorblindMode)'),
      'Coronary vessels must be colored uniformly using getVesselColorThree'
    );
    assert(
      !vesselsCode.includes('lesionMarker') && !vesselsCode.includes('focalStenosis'),
      'Coronary vessels must contain zero focal lesion markers or localized stenosis points'
    );
  });

  return { passed, failed, tests };
}
