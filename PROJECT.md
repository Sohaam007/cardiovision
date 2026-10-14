# Project: CardioVision Clinical Visualization Refinement

## Architecture
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Zustand, Three.js / React Three Fiber / Drei.
- **Backend / ML**: FastAPI, scikit-learn, XGBoost, zero-leakage pipeline.
- **3D Cardiac Scene**: Persistent `<SceneCanvas />` hosting co-located Blender photorealistic beating heart (`beating_heart.glb`) and 3D procedural React heart (`Heart.tsx`), synchronized with CatmullRomCurve3 coronary vessels (`Vessels.tsx`).
- **Interactive Layout**: Dual top-bar architecture (Global Navigation Bar + Dedicated Secondary Patient Access Bar) freeing the 3D canvas, complemented by non-overlapping, draggable, collapsible floating HUDs.
- **Clinical Form & State**: Reactive Zustand store with 54-feature clinical schema, two-way state binding, physiological range validation, dirty-state tracking, and manual prediction recalculation triggering dynamic vessel recoloring.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Dedicated Top Bar & PersonaPicker Relocation | Move PersonaPicker out of 3D canvas into a secondary top bar below the main header | M1 | ORIGINAL_REQUEST R2 |
| 2 | Viewport HUD Decluttering & Clamping | Non-overlapping initial positions, boundary clamping, and standardized `▼`/`▲` collapse toggles for Tools Menu, ECG HUD, Findings, and Risk Scale | M1 | ORIGINAL_REQUEST R2 |
| 3 | Single Persistent 3D Canvas | Consolidate 3D rendering under `<SceneCanvas />` in `App.tsx` to eliminate canvas unmount/remount stutter | M2 | ORIGINAL_REQUEST R1 |
| 4 | In-Viewport 3D Representation Switcher | Floating translucent glass pill `[🫀 Blender Photorealistic | ⚙️ Procedural Anatomy]` with smooth 250ms cross-fade | M2 | ORIGINAL_REQUEST R1 |
| 5 | Surgical Dissection & Cycle Parity | Apply dynamic clipping planes to `beating_heart.glb`, synchronize Wiggers cycle states, valve indicators, and heart sounds across both models | M2 | ORIGINAL_REQUEST R1 |
| 6 | 54-Feature Clinical Form Integration | Correct category filtering (`Demographic`, `History/exam`, `ECG`, `Lab`, `Echo`), type checks, reference ranges, and offline fallback schema | M3 | ORIGINAL_REQUEST R4 |
| 7 | Dirty-State Tracking & Prediction Trigger | Visual dirty indicator ("● Unsaved Changes"), "Run Prediction" recalculation updating CAD/vessel risk cards and 3D coloration, and reliable Reset to Baseline | M3 | ORIGINAL_REQUEST R4 |
| 8 | Master Button & Control Utility Audit | Verify working handlers for all 85+ interactive elements, remove duplicate Reset View, standardize collapsible toggles | M4 | ORIGINAL_REQUEST R3 |
| 9 | Comprehensive Verification & Clinical Invariants | Enforce uniform vessel coloration, zero localized lesion markers, zero target leakage, and 100% pass across all test suites | M5 | ORIGINAL_REQUEST R5 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Dedicated Top Bar Layout & Viewport Decluttering | `App.tsx`, `PersonaPicker.tsx`, HUD positions | none | DONE |
| M2 | 3D Representation Switcher & Surgical Dissection Parity | `App.tsx`, `SceneCanvas.tsx`, `Heart.tsx`, `RepresentationSwitcherPill.tsx` | M1 | DONE |
| M3 | 54-Feature Interactive Clinical Form & Prediction Trigger | `ClinicalForm.tsx`, `useStore.ts`, `client.ts`, `public/feature_schema.json` | none | DONE |
| M4 | Button Utility Audit & Control Polish | `InteractiveBeatingHeart.tsx`, `InteractiveSensitivityHUD.tsx`, `ECGMonitorHUD.tsx`, `DissectionControls.tsx` | M1, M2, M3 | DONE |
| M5 | Comprehensive Test Suite & Invariant Verification | `web/src/test/clinicalForm.test.ts`, npm test, npm run lint, npm run build, pytest | M1, M2, M3, M4 | DONE |

## Code Layout
- `web/src/App.tsx`: Main layout, dual top bar, persistent canvas host.
- `web/src/components/PersonaPicker.tsx`: Patient persona selector in dedicated top bar.
- `web/src/components/RepresentationSwitcherPill.tsx`: In-viewport glass pill representation switcher.
- `web/src/components/DraggableToolsMenu.tsx`: Floating dock with layer, cycle, audio, and camera controls.
- `web/src/components/PatientFindingsHUD.tsx`: Floating top-center findings badges.
- `web/src/components/ECGMonitorHUD.tsx`: Floating bottom-right ECG oscilloscope strip.
- `web/src/components/FloatingRiskLegend.tsx`: Floating bottom-left collapsible risk scale.
- `web/src/components/ClinicalForm.tsx`: 54-feature clinical form with two-way binding & dirty state.
- `web/src/scene/SceneCanvas.tsx`: Persistent 3D R3F Canvas.
- `web/src/scene/Heart.tsx`: Co-located Blender and procedural heart meshes with clipping and cross-fading.
- `web/src/store/useStore.ts`: Global state management.
- `web/src/test/clinicalForm.test.ts`: Automated test suite for clinical form.

## Interface Contracts
### Persona Selection & Baseline Reset
- `useStore.ts`:
  - `activePersonaBaseline`: stores the active persona's baseline feature dictionary `Record<string, any> | null`.
  - `isDirty`: boolean flag tracking if current `patientInputs` differ from baseline.
  - `resetToBaseline()`: restores `patientInputs` to `activePersonaBaseline ?? defaultSchemaInputs` and marks `isDirty = false`.
  - `runPrediction()`: triggers calculation / API call, updates CAD and vessel risk states, triggers 3D vessel recoloring, and clears `isDirty = false`.

### 3D Representation Switcher
- `useStore.ts`:
  - `viewerMode`: `'realistic' | 'procedural' | '2d' | 'blender'`.
  - `setViewerMode(mode)`: updates mode. When switching between `'realistic'` and `'procedural'`, `<SceneCanvas />` remains continuously mounted.
