# Project: CardioVision Task 3D-01 (Interactive 3D Heart & Vessel Scene)

## Architecture
- **Framework**: React 18 + React Three Fiber (`@react-three/fiber` 8.17.10) + `@react-three/drei` (9.120.4) + Three.js (`three` 0.170.0).
- **State Management**: Zustand 5 (`zustand` 5.0.0) tracking prediction vessel probabilities (`LAD`, `LCX`, `RCA`), colorblindMode boolean, torso visibility, and heart opacity.
- **Rendering Architecture**:
  - `frameloop="demand"`: No idle GPU draws.
  - Invalidation triggers: Camera motion via `OrbitControls onChange`, and Zustand store state changes via reactive `DemandInvalidator` subscribing to store mutations.
  - Capped DPR: `dpr={[1, 1.5]}` max for 60 FPS performance on laptops with integrated GPUs.
  - Lightweight 3-point lighting, no heavy post-processing passes, no dynamic shadow maps.
- **Scene Anatomy**:
  - `Heart.tsx`: 100% procedural compound mesh (~6,800 triangles): tapered/deformed ventricles with anterior groove depression, squashed atria, ascending aorta root, pulmonary trunk, SVC. Zero external network downloads.
  - `Torso.tsx`: Stylized low-poly translucent shell (`depthWrite: false` mandatory to prevent alpha occlusion of internal heart/vessels, `flatShading: true`).
  - `Vessels.tsx`: Coronary artery trees using procedural `TubeGeometry` from `CatmullRomCurve3` curves for Left Main (LM), LAD, LCX, RCA. Includes invisible $2.5\times$ thicker proxy tubes for future click/hover raycasting.
  - **Clinical Guardrail**: Vessels are colored uniformly across their entire length by probability. Localized lesion/blockage points are strictly prohibited.
- **Color Interpolation**:
  - Continuous 3-point piecewise linear interpolation across $p \in [0.0, 1.0]$.
  - Standard Palette: Green (`#10b981`) -> Amber (`#f59e0b`) -> Red (`#ef4444`).
  - Colorblind-Safe Palette: Blue (`#3b82f6`) -> Orange (`#f97316`) -> Magenta (`#d946ef`).
- **Interactive UI**:
  - `DebugPanel.tsx`: Interactive sliders for LAD, LCX, RCA ($0.00$–$1.00$ step $0.01$), colorblind mode toggle, torso toggle, opacity slider, camera preset buttons.
  - `App.tsx`: Safety disclaimer header banner (mandatory clinical requirement), responsive viewport with Canvas and DebugPanel.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Git Feature Branch | Dedicated branch `feature/3d-01-scene` created; changes isolated from main | M1 | ORIGINAL_REQUEST R3 |
| 2 | Zustand Store Contract | `web/src/store/useStore.ts` tracking LAD, LCX, RCA, colorblindMode, torso, opacity | M1 | ORIGINAL_REQUEST R2, docs/05_3D_SPEC |
| 3 | Vessel Configuration | `web/src/scene/vesselConfig.ts` with CatmullRomCurve3 control points & color math | M1 | docs/05_3D_SPEC |
| 4 | Procedural Heart Mesh | `web/src/scene/Heart.tsx` compound deformed geometry, zero external downloads | M2 | ORIGINAL_REQUEST R1, docs/05_3D_SPEC |
| 5 | Translucent Torso Shell | `web/src/scene/Torso.tsx` low-poly shell with `depthWrite: false` and toggle | M2 | ORIGINAL_REQUEST R1, docs/05_3D_SPEC |
| 6 | Coronary Tube Geometry | `web/src/scene/Vessels.tsx` procedural tubes for LM, LAD, LCX, RCA with raycast proxies | M2 | ORIGINAL_REQUEST R1, docs/05_3D_SPEC |
| 7 | Demand Rendering Canvas | `web/src/scene/SceneCanvas.tsx` with `frameloop="demand"`, `dpr={[1, 1.5]}`, invalidation | M2 | ORIGINAL_REQUEST R1, docs/05_3D_SPEC |
| 8 | Whole-Vessel Uniform Shading | Uniform color per vessel, no localized stenosis markers (clinical guardrail) | M2 | ORIGINAL_REQUEST R2, AGENTS.md |
| 9 | Piecewise Color Interpolation | Standard (Green/Amber/Red) and Colorblind (Blue/Orange/Magenta) math | M1 | ORIGINAL_REQUEST R2, docs/05_3D_SPEC |
| 10 | Interactive Debug Panel | `web/src/components/DebugPanel.tsx` with sliders for LAD, LCX, RCA, and toggles | M3 | ORIGINAL_REQUEST R2, docs/tasks/3D-01 |
| 11 | App Integration | `web/src/App.tsx` layout with safety disclaimer header and 3D scene | M3 | ORIGINAL_REQUEST AC, docs/09_SAFETY_DISCLAIMER |
| 12 | Comprehensive Test Suite | Automated test suite verifying color math, store state, invalidation, build | M4 (E2E) | Dual Track, Acceptance Criteria |
| 13 | Build Verification | `npm run lint` and `npm run build` pass with zero TS and Vite errors | M3 & M5 | ORIGINAL_REQUEST AC |
| 14 | STATUS.md Completion Record | Append record `YYYY-MM-DD HH:MM \| 3D-01 \| Soumyadeep \| done \| <note>` | M5 | ORIGINAL_REQUEST AC |
| 15 | Adversarial Review & Forensic Audit | Independent reviewer zero-trust audit, challenger verification, forensic audit | M5 | ORIGINAL_REQUEST R3, Integrity Forensics |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Git Branch & State/Config Layer | Branch `feature/3d-01-scene`, `useStore.ts`, `vesselConfig.ts` with color math | None | PLANNED |
| M2 | Procedural 3D Scene Architecture | `Heart.tsx`, `Torso.tsx`, `Vessels.tsx`, `SceneCanvas.tsx` with demand rendering | M1 | PLANNED |
| M3 | UI Integration & Debug Controls | `DebugPanel.tsx`, `App.tsx` integration, build verification | M2 | PLANNED |
| M4 | E2E Testing Suite Track | Automated test suite (Tiers 1-4) for contracts, color scales, frameloop, store | M1 | IN_PROGRESS |
| M5 | Adversarial Review, Forensic Audit & PR | Independent review, challenger, auditor, STATUS.md, git commit & PR preparation | M3, M4 | PLANNED |

## Interface Contracts
### `web/src/store/useStore.ts`
- **Keys**: strictly `'LAD' | 'LCX' | 'RCA'`.
- **State**:
  ```typescript
  export type VesselKey = 'LAD' | 'LCX' | 'RCA';
  export interface VesselData { prob: number; label?: number; }
  export interface AppState {
    prediction: { vessels: Record<VesselKey, VesselData>; };
    colorblindMode: boolean;
    showTorso: boolean;
    heartOpacity: number;
    selectedVessel: VesselKey | null;
    hoveredVessel: VesselKey | null;
    setVesselProbability: (vessel: VesselKey, prob: number) => void;
    setColorblindMode: (enabled: boolean) => void;
    toggleColorblindMode: () => void;
    setShowTorso: (show: boolean) => void;
    toggleTorso: () => void;
    setHeartOpacity: (opacity: number) => void;
    setSelectedVessel: (vessel: VesselKey | null) => void;
    setHoveredVessel: (vessel: VesselKey | null) => void;
    resetDemoProbabilities: () => void;
  }
  ```

### `web/src/scene/vesselConfig.ts`
- **Exports**:
  - `VESSEL_CURVES`: Record<string, THREE.CatmullRomCurve3> for `'LM'`, `'LAD'`, `'LCX'`, `'RCA'`.
  - `VESSEL_PARAMS`: Record<string, { radius: number; proxyRadius: number; tubularSegments: number; radialSegments: number; fullName: string }>.
  - `getVesselColorThree(prob: number, colorblind: boolean): THREE.Color`
  - `getVesselColorHex(prob: number, colorblind: boolean): string`
  - `PALETTES`: standard (`#10b981`, `#f59e0b`, `#ef4444`) and colorblind (`#3b82f6`, `#f97316`, `#d946ef`).

### `web/src/scene/SceneCanvas.tsx`
- **Props**: none (reads from Zustand store).
- **Behavior**: `<Canvas frameloop="demand" dpr={[1, 1.5]} shadows={false}>` with `<DemandInvalidator />` subscribing to store changes and triggering `invalidate()`.

## Code Layout
- `web/src/store/useStore.ts`: Zustand 5 reactive store
- `web/src/scene/vesselConfig.ts`: 3D curve paths and color mapping utilities
- `web/src/scene/Heart.tsx`: Procedural stylized heart geometry
- `web/src/scene/Torso.tsx`: Low-poly translucent torso shell
- `web/src/scene/Vessels.tsx`: TubeGeometry coronary vessels with proxies
- `web/src/scene/SceneCanvas.tsx`: R3F Canvas container with demand invalidator and OrbitControls
- `web/src/components/DebugPanel.tsx`: Interactive sliders and controls
- `web/src/App.tsx`: Top-level application layout
- `web/src/test/`: Automated test suite
- `docs/STATUS.md`: Project status register
