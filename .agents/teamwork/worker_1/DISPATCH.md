# Dispatch: Implementation Worker 1

Objective: Implement Task 3D-01 full interactive 3D heart and coronary vessel scene with Zustand store and real-time debug controls on dedicated feature branch `feature/3d-01-scene`.

Exclusive File Ownership:
- Git branch: create and switch to `feature/3d-01-scene` (never commit directly to main!)
- `web/src/store/useStore.ts`
- `web/src/scene/vesselConfig.ts`
- `web/src/scene/Heart.tsx`
- `web/src/scene/Torso.tsx`
- `web/src/scene/Vessels.tsx`
- `web/src/scene/SceneCanvas.tsx`
- `web/src/components/DebugPanel.tsx`
- `web/src/App.tsx`
- `docs/STATUS.md`

Integrity Warning:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Key Requirements:
1. Feature Branch: `git checkout -b feature/3d-01-scene`. Verify `git branch --show-current`.
2. Procedural Heart (`Heart.tsx`): 100% procedural compound mesh (ventricles, atria, aorta root, pulmonary trunk) <= 40k tris. Zero external downloads.
3. Torso (`Torso.tsx`): Low-poly translucent shell, `depthWrite: false` (to prevent alpha occlusion of internal heart/vessels), visibility toggle from store.
4. Vessels (`Vessels.tsx`, `vesselConfig.ts`): Procedural TubeGeometry from CatmullRomCurve3 for Left Main, LAD, LCX, RCA. Invisible $2.5x$ radius proxy tubes. Uniform coloring for whole vessel (clinical guardrail: never localize lesions).
5. Zustand Store (`useStore.ts`): Strictly keys `LAD`, `LCX`, `RCA`, plus `colorblindMode`, `showTorso`, `heartOpacity`, `selectedVessel`.
6. Color Interpolation: Standard (Green #10b981 -> Amber #f59e0b -> Red #ef4444) and Colorblind (Blue #3b82f6 -> Orange #f97316 -> Magenta #d946ef) via 3-point piecewise linear interpolation across [0, 1].
7. Rendering & Performance: `frameloop="demand"`, `dpr={[1, 1.5]}`, shadows disabled, DemandInvalidator subscribing to store and calling `invalidate()`, OrbitControls calling `invalidate()`.
8. Debug Panel (`DebugPanel.tsx`): Range sliders for LAD, LCX, RCA, colorblind toggle, torso toggle, opacity slider, camera preset buttons.
9. App Integration (`App.tsx`): Retain persistent clinical safety disclaimer banner at the top, mount 3D SceneCanvas and DebugPanel.
10. Verification: Run `npm run lint` and `npm run build` in `web/`. Both must succeed with exit code 0.
11. Update `docs/STATUS.md`: Append `YYYY-MM-DD HH:MM | 3D-01 | Soumyadeep | done | <note>`.
12. Commit changes to `feature/3d-01-scene` with a clear commit message.

Handoff Report: Write to `C:\Users\nived\cardiovision\.agents\teamwork\worker_1\handoff.md`.

## 2026-10-13T15:55:44Z
Dispatcher message:
Implement Task 3D-01 full interactive 3D heart and coronary vessel scene with Zustand store and real-time debug controls on dedicated feature branch feature/3d-01-scene.
Exclusive write ownership:
- Git branch: Immediately execute `git checkout -b feature/3d-01-scene`. Never push or commit directly to main.
- web/src/store/useStore.ts
- web/src/scene/vesselConfig.ts
- web/src/scene/Heart.tsx
- web/src/scene/Torso.tsx
- web/src/scene/Vessels.tsx
- web/src/scene/SceneCanvas.tsx
- web/src/components/DebugPanel.tsx
- web/src/App.tsx
- docs/STATUS.md

## 2026-10-13T16:10:30Z
Parent status check message:
**Context**: Milestone M1-M3 Implementation Status Check
**Content**: Checking in on your progress. E2E test suite (TEST_READY.md) has completed and passed. How is your build verification, git branch status, and handoff report coming along?
**Action**: Complete your build verification, git commit to feature/3d-01-scene, write handoff.md, and report status.
