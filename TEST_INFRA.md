# Test Infrastructure Specification: CardioVision Task 3D-01

**Document Version**: 1.0.0  
**Target Milestone**: 3D-01 (Interactive 3D Heart & Coronary Vessel Visualizer)  
**Track**: Dual Track E2E Testing Track (M4)  
**Author**: E2E Test Suite Writer (`teamwork_preview_test_writer`)

---

## 1. Test Philosophy

The CardioVision 3D-01 test suite is engineered around four core testing principles:

1. **Zero-Trust Clinical Verification**:
   In medical visualization, visual rendering must strictly reflect clinical data. Vessel keys, stenosis probabilities, color interpolation, and clinical guardrails (e.g. uniform vessel shading without localized stenosis hallucinations) must be authoritatively verified against mathematical formulas and interface contracts.

2. **Decoupled Architecture & Fast Execution**:
   Tests must run headlessly and deterministically without requiring a WebGL physical GPU device or live network connection. Core domain logic (3D vascular splines, color interpolation math, reactive Zustand store mutations, demand frameloop invalidation, and UI risk badge derivations) are fully decoupled from browser rendering engines.

3. **Progressive Testability & Independence**:
   Every test case is self-contained, isolated, and resets its state before and after execution. Tests never depend on execution order or side effects from prior test cases.

4. **Multi-Tiered Depth**:
   Testing is structured across four distinct verification tiers—from contract & unit feature coverage to edge boundaries, cross-feature state interactions, and clinical end-to-end patient scenarios.

---

## 2. Feature Inventory Under Test

| # | Feature | Scope | Expected Contract / Behavior | Source Reference |
|---|---------|-------|-------------------------------|------------------|
| F1 | Zustand Store Contract | `web/src/store/useStore.ts` | Tracks keys strictly named `'LAD'`, `'LCX'`, `'RCA'`. Initial defaults: LAD: 0.74, LCX: 0.31, RCA: 0.52. `colorblindMode`: false, `showTorso`: true, `heartOpacity`: 0.92. | `ORIGINAL_REQUEST.md` R2, `docs/04_API_CONTRACT.md` |
| F2 | Standard Color Palette | `web/src/scene/vesselConfig.ts` | 3-point piecewise linear RGB interpolation: Green (`#10b981`, $p=0.0$) $\to$ Amber (`#f59e0b`, $p=0.5$) $\to$ Red (`#ef4444`, $p=1.0$). | `ORIGINAL_REQUEST.md` R2, `docs/05_3D_SPEC.md` |
| F3 | Colorblind Color Palette | `web/src/scene/vesselConfig.ts` | 3-point piecewise linear RGB interpolation: Sky Blue (`#3b82f6`, $p=0.0$) $\to$ Vivid Orange (`#f97316`, $p=0.5$) $\to$ Magenta (`#d946ef`, $p=1.0$). | `ORIGINAL_REQUEST.md` R2, `docs/05_3D_SPEC.md` |
| F4 | Coronary Curve Geometry | `web/src/scene/vesselConfig.ts` | `CatmullRomCurve3` splines defined for `'LM'`, `'LAD'`, `'LCX'`, `'RCA'`. Tube & proxy parameters for hit raycasting. | `ORIGINAL_REQUEST.md` R1, `docs/05_3D_SPEC.md` |
| F5 | Demand Frameloop Contract | `web/src/scene/SceneCanvas.tsx` | Canvas configured with `frameloop="demand"`. Reactive `DemandInvalidator` calls `invalidate()` upon store mutations. Zero draw calls during idle state. | `ORIGINAL_REQUEST.md` R1, `docs/05_3D_SPEC.md` |
| F6 | DPR Capping & Performance | `web/src/scene/SceneCanvas.tsx` | Device Pixel Ratio capped at maximum 1.5 (`dpr={[1, 1.5]}`). Shadows disabled (`shadows={false}`). | `ORIGINAL_REQUEST.md` R1, `docs/05_3D_SPEC.md` |
| F7 | Whole-Vessel Uniform Tint | `web/src/scene/Vessels.tsx` | Vessels uniformly shaded by overall probability. No localized stenosis narrowing or vertex gradients along curve. | `AGENTS.md`, `docs/00_CONTEXT.md` |
| F8 | Translucent Torso Shell | `web/src/scene/Torso.tsx` | Low-poly shell with `depthWrite: false` to prevent alpha occlusion of internal myocardium/vessels. Toggleable visibility. | `docs/05_3D_SPEC.md` |
| F9 | Clinical Risk Badging | `web/src/scene/vesselConfig.ts` | Stratification: Low Risk ($p < 0.40$), Moderate Risk ($0.40 \le p < 0.70$), High Risk ($p \ge 0.70$). | `docs/05_3D_SPEC.md` |

---

## 3. Four-Tier Test Architecture

```
┌──────────────────────────────────────────────────────────────┐
│             TIER 4: Real-World Clinical Scenarios            │
│  - Sample Patient Baseline (LAD:0.74, LCX:0.31, RCA:0.52)    │
│  - Triple Vessel Disease (LAD:0.88, LCX:0.82, RCA:0.91)     │
│  - Low-Risk Screening (LAD:0.15, LCX:0.20, RCA:0.18)         │
│  - Critical Single Vessel ("Widow Maker" LAD:0.95)           │
├──────────────────────────────────────────────────────────────┤
│             TIER 3: Cross-Feature Interactions               │
│  - Colorblind Mode Toggle with Live Probability Sliders      │
│  - Torso Shell Visibility Toggle with Camera Invalidation    │
│  - Multi-Vessel Independent Updates without State Bleed      │
│  - Complete Reset State Reversion                            │
├──────────────────────────────────────────────────────────────┤
│             TIER 2: Boundary & Corner Cases                  │
│  - Exact Mathematical Anchors (p = 0.0, 0.5, 1.0)            │
│  - Out-of-Range Clamping (p < 0.0 -> 0.0, p > 1.0 -> 1.0)    │
│  - Extreme/NaN Floating-Point Resistance                     │
│  - Rapid Sequential Slider Dragging (Stress/Race Conditions) │
│  - Opacity Bounds Clamping ([0.1, 1.0])                      │
├──────────────────────────────────────────────────────────────┤
│             TIER 1: Feature & Contract Coverage              │
│  - Zustand Store Key Structure (strictly LAD, LCX, RCA)      │
│  - Standard Color Scale Interpolation (Green -> Amber -> Red)│
│  - Colorblind Color Scale Interpolation (Blue->Orange->Mag.) │
│  - CatmullRomCurve3 Vascular Path Splines (LM, LAD, LCX, RCA)│
│  - Demand Frameloop Invalidation Subscriber Contract         │
│  - DPR Capping (<= 1.5) & Lighting Budget Constraints        │
└──────────────────────────────────────────────────────────────┘
```

### Tier 1: Feature & Contract Coverage
- **Store Keys**: Validates that store prediction dictionary strictly exposes uppercase `'LAD'`, `'LCX'`, and `'RCA'`. Non-standard keys or casing are rejected.
- **Color Scales**: Validates exact RGB values at $p=0.0$, $p=0.5$, and $p=1.0$ for both standard and colorblind palettes.
- **Continuous Interpolation**: Validates midpoint lerp values (e.g. $p=0.25$ and $p=0.75$) in linear RGB space.
- **Anatomical Splines**: Validates that `VESSEL_CURVES` contains 4 `CatmullRomCurve3` curves with valid 3D points traversing the expected anatomical directions.
- **Rendering Constraints**: Validates that canvas specifications require `frameloop="demand"`, `dpr={[1, 1.5]}`, and `depthWrite: false` on torso material.

### Tier 2: Boundary & Corner Cases
- **Anchor Invariance**: $p=0.0$ strictly returns Low-Risk hex `#10b981` (Standard) or `#3b82f6` (Colorblind); $p=0.5$ strictly returns `#f59e0b` / `#f97316`; $p=1.0$ strictly returns `#ef4444` / `#d946ef`.
- **Underflow & Overflow Clamping**: Values like $-0.01$, $-100.0$, $1.001$, $999.0$ are clamped to $[0.0, 1.0]$.
- **State Robustness**: Rapid dispatch of 50+ consecutive probability updates correctly arrives at the terminal value without deadlocks or corrupted state.
- **Opacity Clamping**: Opacity is constrained to $[0.1, 1.0]$.

### Tier 3: Cross-Feature Interactions
- **Mode Switching under Active Sliders**: Changing probability from $0.20$ to $0.85$ under standard mode, then toggling `colorblindMode` must cleanly transition to the high-risk colorblind color (`#d946ef`) without resetting probability.
- **Torso Visibility & Invalidation**: Dispatches `toggleTorso()` or `setShowTorso(false)` and confirms that store listeners fire.
- **Isolated State Mutation**: Updating `LAD` does not alter `LCX` or `RCA` probability values.
- **Demo Reset Function**: Invoking `resetDemoProbabilities()` resets all vessel probabilities, toggles, and opacities back to default initial values.

### Tier 4: Real-World Clinical Scenarios
- **Scenario A: API Contract Sample Patient**:
  - LAD: 0.74 $\to$ High Risk, Red (`#f27d30` in piecewise linear transition towards `#ef4444`).
  - LCX: 0.31 $\to$ Low Risk, Green (`#9ba939` in transition).
  - RCA: 0.52 $\to$ Moderate Risk, Amber (`#f49b13`).
  - Colorblind palette yields corresponding Blue/Orange/Magenta transitions.
- **Scenario B: Triple Vessel Disease**:
  - LAD: 0.88, LCX: 0.82, RCA: 0.91 $\to$ All vessels classified as High Risk, vivid crimson alert in standard mode.
- **Scenario C: Low-Risk Screening Patient**:
  - LAD: 0.15, LCX: 0.20, RCA: 0.18 $\to$ All vessels classified as Low Risk, emerald green calm in standard mode.
- **Scenario D: Critical Single Vessel ("Widow Maker")**:
  - LAD: 0.95, LCX: 0.10, RCA: 0.15 $\to$ High visual contrast highlighting LAD occlusion risk while LCX/RCA remain in baseline green.

---

## 4. Pass / Fail Semantics

- **Assertion Policy**: All assertions are strict equality or epsilon-bounded floats ($\epsilon = 0.005$ for RGB channel values).
- **Execution Policy**:
  - A test run is considered **PASS** if and only if **100% of test assertions across Tiers 1–4 execute with zero errors**.
  - Any failed assertion immediately generates an exit code `1` with a formatted error message detailing the expected value vs actual value and the failing tier/file.
- **Network Independence**: The entire test suite executes offline with zero remote requests.
- **Build Verification**: All test files in `web/src/test/` must pass `npm run lint` (`tsc --noEmit`) with 0 TypeScript compilation errors.

---

## 5. Execution Instructions

The test suite is executable via the unified runner:

```bash
# In directory C:\Users\nived\cardiovision\web:
node --experimental-strip-types src/test/e2e_runner.mjs
```

Or via individual test files:
```bash
node --experimental-strip-types src/test/useStore.test.ts
node --experimental-strip-types src/test/vesselConfig.test.ts
node --experimental-strip-types src/test/sceneConfig.test.ts
node --experimental-strip-types src/test/clinicalScenarios.test.ts
```

Output includes individual tier breakdowns, test summaries, and an overall PASS/FAIL banner.
