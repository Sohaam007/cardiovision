# Original User Request

## 2026-10-13T15:44:03Z

This is a single self-contained task: implement 3D-01 (interactive 3D heart scene with vessels and probability recoloring). Use multiple agents if needed, including an independent code reviewer who reviews the code without trusting the claims of other agents, and ensure changes are committed to a feature branch with a PR prepared (never push directly to main).

Build an interactive 3D heart and coronary artery visualization scene for CardioVision (Track A: Cardiovascular Risk Visualization) in React Three Fiber, dynamically recoloring vessels (LAD, LCX, RCA) according to stenosis probabilities with real-time debug controls.

Working directory: C:\Users\nived\cardiovision
Integrity mode: development

References:
- AGENTS.md
- docs/00_CONTEXT.md
- docs/tasks/3D-01.md
- docs/05_3D_SPEC.md
- docs/04_API_CONTRACT.md

## Requirements

### R1. 3D Anatomical Scene Architecture
- Implement a stylized procedural heart mesh (web/src/scene/Heart.tsx) with scalable/deformed geometry requiring zero external network downloads.
- Implement a low-poly translucent torso shell (web/src/scene/Torso.tsx) with a visibility toggle.
- Implement coronary vessels (web/src/scene/Vessels.tsx) using procedural TubeGeometry from CatmullRomCurve3 curves defined in web/src/scene/vesselConfig.ts for LAD, LCX, RCA, and Left Main trunk.
- Render scene with frameloop set to "demand", calling invalidate() upon probability updates or camera movement. Cap DPR at 1.5, with no heavy post-processing or dynamic shadows.

### R2. Reactive State & Dynamic Vessel Coloring
- Create a Zustand store (web/src/store/useStore.ts) tracking prediction vessel probabilities for keys strictly named LAD, LCX, and RCA, plus a colorblind mode boolean.
- Color entire vessels uniformly according to their stenosis probability:
  - Standard palette: Green (low risk) -> Amber (medium risk) -> Red (high risk).
  - Colorblind-safe palette: Blue -> Orange -> Magenta.
- Provide a debug panel with interactive sliders for LAD, LCX, and RCA to adjust probabilities dynamically in real-time.
- Strictly adhere to clinical guardrails: never imply localized lesion or blockage points along the vessel; color the whole vessel only. Out of scope: API integration and full dashboard cards (reserved for INT-01 and UI-01).

### R3. Git Feature Branch & Independent Adversarial Review
- Isolate all changes on a dedicated feature branch (e.g. feature/3d-01-scene). Do not push directly to main.
- Deploy an independent reviewer agent that performs a zero-trust audit of the code, types, performance constraints, and verification results without relying on the author's self-certification before finalizing the PR.

## Acceptance Criteria

### Verification & Build
- [ ] cd web && npm run build completes successfully with zero TypeScript and zero build errors.
- [ ] Frameloop is configured to "demand" and triggers invalidate() on probability or view change.
- [ ] Device pixel ratio (DPR) is capped at 1.5.

### Behavioral & Visual
- [ ] Vessels recolor smoothly in real time when adjusting the probability sliders in the debug panel.
- [ ] Colorblind toggle switches vessel color palette dynamically between standard and accessible scales.
- [ ] Vessel identifiers strictly match LAD, LCX, and RCA.
- [ ] Completion record appended to docs/STATUS.md in the format: YYYY-MM-DD HH:MM | 3D-01 | Soumyadeep | done | <note>.
- [ ] Code is verified on feature branch and prepared for pull request.
