# 3D Scene Architecture & Implementation Strategy Report: Task 3D-01

**Working Directory**: `C:\Users\nived\cardiovision\.agents\teamwork\explorer_survey_2`  
**Date**: 2026-10-13  
**Status**: Architecture Investigation & Technical Blueprint Complete  
**Target Milestone**: `3D-01` (Interactive 3D Heart & Coronary Vessel Scene in React Three Fiber)

---

## 1. Observation

Direct inspection of the repository, documentation, dependencies, and environment yielded the following factual baseline:

### 1.1 Authoritative Specifications & Constraints
- **Zero Network Asset Downloads**: `ORIGINAL_REQUEST.md` (lines 22, 31) and `docs/05_3D_SPEC.md` (lines 6, 31) mandate:
  > "Implement a stylized procedural heart mesh (`web/src/scene/Heart.tsx`) with scalable/deformed geometry requiring zero external network downloads."  
  > "Default (no license risk, no download): procedural stylized heart in code."
- **Low-Poly Translucent Torso Shell**: `ORIGINAL_REQUEST.md` (line 23) and `docs/05_3D_SPEC.md` (line 7):
  > "Implement a low-poly translucent torso shell (`web/src/scene/Torso.tsx`) with a visibility toggle."
- **Coronary Vessels**: `ORIGINAL_REQUEST.md` (line 24) and `docs/05_3D_SPEC.md` (lines 8–15):
  > "Implement coronary vessels (`web/src/scene/Vessels.tsx`) using procedural `TubeGeometry` from `CatmullRomCurve3` curves defined in `web/src/scene/vesselConfig.ts` for LAD, LCX, RCA, and Left Main trunk."  
  > "Object names/keys exactly `LAD`, `LCX`, `RCA`."  
  > "Each vessel also has an invisible thicker proxy tube for raycasting (hover/click)."
- **Clinical Uniformity Guardrail**: `ORIGINAL_REQUEST.md` (line 33) and `docs/00_CONTEXT.md` (line 24):
  > "Strictly adhere to clinical guardrails: never imply localized lesion or blockage points along the vessel; color the whole vessel only."  
  > "Never draw 'stenosis at mid-LAD'."
- **Rendering & Performance**: `ORIGINAL_REQUEST.md` (line 25) and `docs/05_3D_SPEC.md` (line 28):
  > "Render scene with frameloop set to 'demand', calling `invalidate()` upon probability updates or camera movement. Cap DPR at 1.5, with no heavy post-processing or dynamic shadows."  
  > "Heart <= 40k tris... scene holds ~60 FPS on a laptop."
- **Reactive State & Palettes**: `ORIGINAL_REQUEST.md` (lines 28–32) and `docs/tasks/3D-01.md` (lines 6–7):
  > "Zustand store (`web/src/store/useStore.ts`) tracking prediction vessel probabilities for keys strictly named LAD, LCX, and RCA, plus a colorblind mode boolean."  
  > "Standard palette: Green (low risk) -> Amber (medium risk) -> Red (high risk). Colorblind-safe palette: Blue -> Orange -> Magenta."  
  > "Always show the number near the vessel label / in the card, never color alone." (`docs/05_3D_SPEC.md` line 18).

### 1.2 Codebase Environment & Dependencies
- `web/package.json` contains:
  - Three.js: `three@^0.170.0`, `@types/three@^0.170.0`
  - React Three Fiber: `@react-three/fiber@^8.17.10`
  - Drei: `@react-three/drei@^9.120.4`
  - Zustand: `zustand@^5.0.0`
  - React: `react@^18.3.1`, `react-dom@^18.3.1`
  - Bundler & Styling: `vite@^5.4.10`, `tailwindcss@^3.4.14`
  - Notice: `lucide-react` is **not installed**.
- `web/tsconfig.json` enforces:
  - `"strict": true`, `"noUnusedLocals": true`, `"noUnusedParameters": true`, `"moduleResolution": "bundler"`.
  - No path aliases (e.g. `@/*`) exist; all imports must be relative.
- Build Status:
  - Execution of `npm run build` in `web/` succeeds in 1.44s with code 0.
  - Execution of `npm run lint` (`tsc --noEmit`) succeeds with code 0.
- Source Structure:
  - `web/src` currently contains only `App.tsx`, `main.tsx`, and `index.css`.
  - Directories `web/src/scene/`, `web/src/store/`, and `web/src/components/` do not exist yet.

---

## 2. Logic Chain & Technical Architecture Analysis

### 2.1 Procedural Heart Mesh Strategy (`web/src/scene/Heart.tsx`)

#### Architectural Rationale
External GLB models carry network latency risks, CORS issues, missing asset failures, and CC licensing attribution complexities. A 100% procedural heart constructed with Three.js primitives satisfies R1 with zero external dependencies and guarantees instant, offline-capable rendering.

#### Geometry Strategy: Compound Anatomical Hierarchy
Instead of an ambiguous single blob, we recommend a compound mesh group consisting of:
1. **Myocardium / Ventricles (Primary Mass)**:
   - Base geometry: `THREE.SphereGeometry(1.0, 48, 36)`.
   - Parametric vertex transformation:
     - Cardiac axis alignment: Apex directed inferiorly ($-Y$), anteriorly ($+Z$), and towards patient left ($+X$).
     - Tapering function: For vertex height $y \in [-1.2, 1.2]$, calculate normalized height $t = \frac{y + 1.2}{2.4}$. Scale $(x, z)$ by $s(t) = 0.28 + 0.72 \cdot \sqrt{t}$ so the lower pole tapers into a conical rounded apex.
     - Left Ventricle Bulge: For $x > 0$, expand $x \to x \cdot 1.18$ to reflect larger left ventricular muscle mass.
     - Posterior Flattening: For $z < 0$, squash $z \to z \cdot 0.82$ (posterior cardiac border resting on diaphragm).
     - Anterior Interventricular Sulcus: Apply a subtle depression indentation along the anterior boundary ($x \approx 0.25, z > 0$) where the LAD traverses.
     - Call `geometry.computeVertexNormals()` to regenerate smooth surface shading.
2. **Atria (Posterosuperior Base)**:
   - Left and Right Atria represented by squashed ellipsoids:
     - Right Atrium: `SphereGeometry(0.42, 24, 20)` positioned at `(-0.40, 0.75, -0.15)`.
     - Left Atrium: `SphereGeometry(0.40, 24, 20)` positioned at `(0.35, 0.80, -0.22)`.
3. **Ascending Aorta Root & Arch**:
   - Emerges from the left ventricular outflow tract near center base:
   - Curved tube or cylinder with 5 control points:
     `(0.05, 0.65, 0.15) -> (0.08, 1.05, 0.12) -> (0.05, 1.35, -0.05) -> (-0.05, 1.45, -0.22)`.
   - Radius: $0.22$. Serves as the natural anatomical root for the coronary ostia!
4. **Pulmonary Trunk**:
   - Crosses anterior to the ascending aorta:
   - Cylinder/tube originating at `(0.18, 0.60, 0.32)` and angling superiorly-posteriorly to `(-0.12, 1.15, 0.05)`.
   - Radius: $0.18$.
5. **Superior Vena Cava**:
   - Vertical cylinder entering the right atrium at `(-0.55, 1.20, -0.25)`. Radius: $0.14$.

#### Polygon Count & Performance
- Ventricles: $48 \times 36 \times 2 = 3,456$ triangles.
- Atria (x2): $2 \times (24 \times 20 \times 2) = 1,920$ triangles.
- Great vessels (Aorta, Pulmonary, SVC): $\approx 1,500$ triangles.
- **Total Heart Triangles**: $\approx 6,876$ triangles.
- Well under the $\le 40,000$ triangle constraint ($< 18\%$ of limit), ensuring silky performance on integrated graphics.

#### Material & Visual Styling
- `meshStandardMaterial`:
  - Myocardium color: Rich anatomical crimson `#881337` (Tailwind rose-900) or `#991b1b`.
  - Aorta color: Arterial red `#be123c`.
  - Pulmonary / SVC: Deep slate-indigo `#3730a3`.
  - `roughness: 0.52`, `metalness: 0.08`.
  - `transparent: true`, `opacity: heartOpacity` (controlled from store, default `0.92`).
  - `depthWrite: true` when opacity $> 0.85$ to ensure clean depth sorting.

---

### 2.2 Low-poly Translucent Torso Shell (`web/src/scene/Torso.tsx`)

#### Geometry & Low-Poly Aesthetic
- Cylinder or truncated elliptical cone framing the thoracic cage around the heart:
  - Base: `THREE.CylinderGeometry(1.75, 1.35, 3.8, 12, 4)`.
  - Lateral vs Anteroposterior aspect ratio: Human thorax is wider laterally than front-to-back:
    - Scale $x$ by $1.35$, $z$ by $0.95$.
    - Clavicle/shoulder bulge at upper pole ($y > 0.8$): $x \to x \cdot 1.12$.
    - Waist taper at lower pole ($y < -0.8$): $x \to x \cdot 0.88, z \to z \cdot 0.88$.
  - Polygon count: $12 \times 4 \times 2 = 96$ triangles!
  - `flatShading: true`: Renders distinct geometric facets, producing a stylized medical CAD / holographic aesthetic.

#### Material Configuration & Critical Depth Buffer Rule
- **CRITICAL ARCHITECTURAL RULE — `depthWrite: false`**:
  - In Three.js, translucent objects are drawn without depth buffer writing if `depthWrite: false`.
  - If `depthWrite: true` is left on the outer torso, its front-facing transparent fragments will write into the Z-buffer. When the camera rotates, heart and vessel fragments located physically behind the torso will fail the depth test and get discarded, resulting in severe flickering or clipped geometry.
  - Setting `depthWrite: false` guarantees that the heart and coronary vessels inside the chest are always 100% visible and correctly blended through the torso shell.
- Material Properties:
  - `meshStandardMaterial`:
    - `color="#38bdf8"` (cyan-500) or `#94a3b8` (cool slate)
    - `transparent={true}`
    - `opacity={0.12}`
    - `depthWrite={false}`
    - `side={THREE.DoubleSide}`
    - `flatShading={true}`
- Wireframe Edges Overlay:
  - A child `<lineSegments>` created via `new THREE.EdgesGeometry(torsoGeometry, 15)` with `color="#38bdf8"`, `transparent={true}`, `opacity={0.25}` adds high-contrast thoracic ribcage wireframe gridlines.

#### Visibility Toggle
- Bound to Zustand state `showTorso: boolean`.
- When `showTorso === false`, the component returns `null`, freeing GPU cycles and allowing an unobstructed view of the heart.

---

### 2.3 Coronary Vessels (`web/src/scene/Vessels.tsx` & `web/src/scene/vesselConfig.ts`)

#### Anatomic Trajectories in Cardiac Space
The coronary arteries originate from the aortic root and trace the sulci (grooves) on the myocardium surface:

1. **Left Main (LM) Trunk**:
   - Origin (left aortic sinus): `(0.08, 0.65, 0.22)`
   - Course: Lateral course to bifurcation: `(0.28, 0.52, 0.35)`
   - Radius: `0.055`
   - Role: Feeder trunk (non-predictive target). Shaded with `max(P(LAD), P(LCX))` or arterial crimson `#be123c`.
2. **LAD (Left Anterior Descending)**:
   - Origin: Bifurcation `(0.28, 0.52, 0.35)`
   - Anterior interventricular groove course towards apex:
     - Point 0: `(0.28, 0.52, 0.35)`
     - Point 1: `(0.32, 0.28, 0.56)`
     - Point 2: `(0.30, 0.00, 0.66)`
     - Point 3: `(0.27, -0.32, 0.62)`
     - Point 4: `(0.26, -0.65, 0.50)`
     - Point 5: `(0.25, -0.92, 0.35)`
     - Point 6 (Apex): `(0.24, -1.10, 0.22)`
   - Parameters: `tubularSegments: 64`, `radius: 0.046`, `radialSegments: 10`, `closed: false`.
   - Key: strictly `'LAD'`.
3. **LCX (Left Circumflex)**:
   - Origin: Bifurcation `(0.28, 0.52, 0.35)`
   - Left atrioventricular groove course wrapping to posterior myocardium:
     - Point 0: `(0.28, 0.52, 0.35)`
     - Point 1: `(0.52, 0.42, 0.30)`
     - Point 2: `(0.72, 0.25, 0.08)` (left lateral heart border)
     - Point 3: `(0.74, 0.06, -0.22)`
     - Point 4: `(0.56, -0.15, -0.46)` (posterior left ventricle)
     - Point 5: `(0.32, -0.32, -0.55)`
     - Point 6: `(0.12, -0.48, -0.52)`
   - Parameters: `tubularSegments: 64`, `radius: 0.042`, `radialSegments: 10`, `closed: false`.
   - Key: strictly `'LCX'`.
   - Note: Traverses the back of the heart. Directly satisfies requirement for Lateral/Posterior camera angles to inspect LCX!
4. **RCA (Right Coronary Artery)**:
   - Origin (right aortic sinus): `(-0.12, 0.62, 0.22)`
   - Right atrioventricular groove course to acute margin and posterior crux:
     - Point 0: `(-0.12, 0.62, 0.22)`
     - Point 1: `(-0.38, 0.46, 0.32)`
     - Point 2: `(-0.58, 0.22, 0.26)`
     - Point 3: `(-0.66, -0.08, 0.12)` (acute margin)
     - Point 4: `(-0.56, -0.42, -0.12)`
     - Point 5: `(-0.34, -0.66, -0.32)`
     - Point 6 (Crux): `(-0.08, -0.82, -0.38)`
   - Parameters: `tubularSegments: 64`, `radius: 0.046`, `radialSegments: 10`, `closed: false`.
   - Key: strictly `'RCA'`.

#### Tube Geometry & Raycast Proxies
- Curve Construction:
  `new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5)`
  - Tension of `0.5` prevents centripetal oscillations.
- Tube Mesh:
  `new THREE.TubeGeometry(curve, 64, radius, 10, false)`
- Invisible Proxy Tube:
  `new THREE.TubeGeometry(curve, 32, radius * 2.5, 6, false)`
  - Radius is $2.5\times$ larger ($\approx 0.115$).
  - Attached with invisible material (`transparent: true, opacity: 0`) or `visible: false` with raycast event handlers.
  - Generates effortless, forgiving mouse hover targets for clinical users.

#### Uniform Shading Guardrail
- Under clinical constraints, stenosis is predicted per vessel territory, NOT at specific coordinate lesions.
- Each vessel tube uses a single `meshStandardMaterial` with a single uniform `color`:
  `<meshStandardMaterial color={vesselColor} roughness={0.32} metalness={0.12} />`
- Absolutely no vertex gradient or localized narrowing is rendered along the vessel length.

---

### 2.4 Rendering & Performance Architecture

#### Demand Frameloop (`frameloop="demand"`)
- Standard R3F runs continuous `requestAnimationFrame` (60–120 Hz), causing constant 15–30% CPU load and laptop fan noise on idle scenes.
- In `frameloop="demand"`, Three.js renders **only when `invalidate()` is explicitly called**.
- Two sources of invalidation must be handled:
  1. **Camera Interaction (OrbitControls)**:
     - Drei's `<OrbitControls makeDefault onChange={() => invalidate()} />`.
     - When dragging or when damping is active (`enableDamping={true}`), `OrbitControls` emits `'change'` events on every frame of camera motion. Calling `invalidate()` ensures smooth camera rotation and stops rendering the instant the camera rests.
  2. **Reactive Store Mutations (Sliders, Toggles)**:
     - Because the Debug Panel and UI sliders exist in standard React DOM outside the R3F `<Canvas>`, store mutations must trigger canvas repainting.
     - Solution: An inside-canvas subscriber component:
       ```tsx
       export const DemandInvalidator: React.FC = () => {
         const invalidate = useThree((state) => state.invalidate);
         useEffect(() => {
           // Subscribe directly to Zustand state changes outside React lifecycle
           const unsubscribe = useStore.subscribe(() => {
             invalidate();
           });
           return unsubscribe;
         }, [invalidate]);
         return null;
       };
       ```
       Whenever a slider moves, `useStore.subscribe` immediately executes `invalidate()`, triggering an instantaneous, smooth repaint.
       When the user stops dragging, render calls halt completely (0% idle CPU).

#### DPR Capping
- Configure `<Canvas dpr={[1, 1.5]} frameloop="demand" ...>`
- Clamps pixel ratio to 1.5 maximum on Retina/4K displays.
- Cuts fragment processing load by $> 50\%$ compared to native 2.0x/3.0x DPR, ensuring 60 FPS on integrated Intel/AMD GPUs.

#### Lighting & Shadow Exclusion
- Disable shadows: `shadows={false}` on `<Canvas>`.
- Use lightweight balanced 3-point lighting:
  - `<ambientLight intensity={0.75} />`
  - `<directionalLight position={[6, 8, 6]} intensity={1.2} />` (key light)
  - `<directionalLight position={[-6, -4, -6]} intensity={0.4} />` (fill light)
  - `<pointLight position={[0, -3, 2]} intensity={0.3} color="#fca5a5" />` (subtle rim light)
- No `postprocessing` / `EffectComposer` overhead.

---

### 2.5 Zustand Store & Debug Panel Architecture

#### Store State Contract (`web/src/store/useStore.ts`)
```typescript
import { create } from 'zustand';

export type VesselKey = 'LAD' | 'LCX' | 'RCA';

export interface VesselData {
  prob: number;
  label?: number;
}

export interface AppState {
  // Vessel predictions matching API contract
  prediction: {
    vessels: Record<VesselKey, VesselData>;
  };

  // UI & 3D state
  colorblindMode: boolean;
  showTorso: boolean;
  heartOpacity: number;
  selectedVessel: VesselKey | null;
  hoveredVessel: VesselKey | null;

  // Actions
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

export const useStore = create<AppState>()((set) => ({
  prediction: {
    vessels: {
      LAD: { prob: 0.74, label: 1 },
      LCX: { prob: 0.31, label: 0 },
      RCA: { prob: 0.52, label: 1 },
    },
  },
  colorblindMode: false,
  showTorso: true,
  heartOpacity: 0.92,
  selectedVessel: null,
  hoveredVessel: null,

  setVesselProbability: (vessel, prob) =>
    set((state) => ({
      prediction: {
        ...state.prediction,
        vessels: {
          ...state.prediction.vessels,
          [vessel]: {
            ...state.prediction.vessels[vessel],
            prob: Math.max(0, Math.min(1, prob)),
          },
        },
      },
    })),

  setColorblindMode: (colorblindMode) => set({ colorblindMode }),
  toggleColorblindMode: () => set((s) => ({ colorblindMode: !s.colorblindMode })),

  setShowTorso: (showTorso) => set({ showTorso }),
  toggleTorso: () => set((s) => ({ showTorso: !s.showTorso })),

  setHeartOpacity: (heartOpacity) => set({ heartOpacity }),
  setSelectedVessel: (selectedVessel) => set({ selectedVessel }),
  setHoveredVessel: (hoveredVessel) => set({ hoveredVessel }),

  resetDemoProbabilities: () =>
    set({
      prediction: {
        vessels: {
          LAD: { prob: 0.74, label: 1 },
          LCX: { prob: 0.31, label: 0 },
          RCA: { prob: 0.52, label: 1 },
        },
      },
      colorblindMode: false,
      showTorso: true,
      heartOpacity: 0.92,
      selectedVessel: null,
    }),
}));
```

#### Color Interpolation Math & Colorblind Palettes
```typescript
import * as THREE from 'three';

export interface PaletteStop {
  low: string;    // p = 0.0
  mid: string;    // p = 0.5
  high: string;   // p = 1.0
}

export const PALETTES: { standard: PaletteStop; colorblind: PaletteStop } = {
  standard: {
    low: '#10b981',   // Emerald Green
    mid: '#f59e0b',   // Amber Yellow
    high: '#ef4444',  // Crimson Red
  },
  colorblind: {
    low: '#3b82f6',   // Royal Blue
    mid: '#f97316',   // Vivid Orange
    high: '#d946ef',  // Magenta
  },
};

export function getVesselColorThree(prob: number, colorblind: boolean): THREE.Color {
  const p = Math.max(0, Math.min(1, prob));
  const palette = colorblind ? PALETTES.colorblind : PALETTES.standard;

  const low = new THREE.Color(palette.low);
  const mid = new THREE.Color(palette.mid);
  const high = new THREE.Color(palette.high);
  const result = new THREE.Color();

  if (p <= 0.5) {
    const t = p / 0.5;
    result.lerpColors(low, mid, t);
  } else {
    const t = (p - 0.5) / 0.5;
    result.lerpColors(mid, high, t);
  }
  return result;
}

export function getVesselColorHex(prob: number, colorblind: boolean): string {
  return '#' + getVesselColorThree(prob, colorblind).getHexString();
}

export function getRiskTier(prob: number): { label: string; badgeClass: string } {
  if (prob < 0.4) return { label: 'Low Risk', badgeClass: 'bg-emerald-950 text-emerald-400 border-emerald-800' };
  if (prob < 0.7) return { label: 'Moderate Risk', badgeClass: 'bg-amber-950 text-amber-400 border-amber-800' };
  return { label: 'High Risk', badgeClass: 'bg-rose-950 text-rose-400 border-rose-800' };
}
```

#### Debug Panel UI (`web/src/components/DebugPanel.tsx`)
- Placed in right drawer / overlay or beside canvas.
- Features:
  1. Interactive range sliders for `LAD`, `LCX`, `RCA`:
     - Vessel code & full anatomical name.
     - Live percentage badge (`74%`) colored with current hex color.
     - Range input `[0, 1]` with step `0.01`.
     - Risk tier pill (`Low < 40%`, `Mod 40-70%`, `High >= 70%`).
  2. Colorblind Mode Toggle:
     - Toggle switch with visual color chips (`Blue / Orange / Magenta` vs `Green / Amber / Red`).
  3. Torso Shell Toggle:
     - Checkbox / switch with eye icon.
  4. Heart Wall Opacity slider:
     - `0.2` to `1.0`, enabling translucent x-ray view to posterior vessels.
  5. Camera Preset Buttons:
     - Anterior View (Front)
     - Left Lateral View (Side - LCX focus)
     - Posterior View (Back - LCX & RCA crux focus)
  6. Preset Quick-buttons:
     - "Demo Patient (0.74, 0.31, 0.52)"
     - "All Low Risk (0.15, 0.20, 0.18)"
     - "Triple Vessel Disease (0.88, 0.82, 0.91)"
     - "Reset"

---

## 3. Caveats

1. **No External Asset Downloading**:
   - `web/public` does not contain `heart.glb`, nor should implementation attempt to download or fetch remote 3D models. The procedural approach is the primary, resilient design.
2. **Clinical Guardrails**:
   - The AI dataset has no localized stenosis markers. Never introduce gradient or point-based lesions along a vessel. Color the whole tube uniformly.
3. **No `lucide-react`**:
   - `lucide-react` is not installed in `package.json`. Implementers must use inline SVG or standard Tailwind icons to avoid broken module imports.
4. **Zustand 5 Syntax**:
   - Zustand is v5.0.0. Use `create<AppState>()((set) => ({ ... }))` curried syntax.
5. **Demand Invalidation Liveness**:
   - Failing to subscribe to store mutations inside Canvas will cause demand rendering to freeze when sliders are moved. The `DemandInvalidator` component pattern must be implemented.

---

## 4. Conclusion & Implementation Blueprint

The technical architecture for 3D-01 is complete, verified, and ready for immediate implementation.

### Recommended File Blueprint:
1. `web/src/store/useStore.ts`:
   - Zustand store with `prediction.vessels` (`LAD`, `LCX`, `RCA`), `colorblindMode`, `showTorso`, `heartOpacity`, `selectedVessel`.
2. `web/src/scene/vesselConfig.ts`:
   - CatmullRomCurve3 curves for LM, LAD, LCX, RCA.
   - Color interpolation math (`getVesselColorThree`, `getVesselColorHex`).
3. `web/src/scene/Heart.tsx`:
   - Compound procedural heart: Ventricles (deformed sphere), Atria (spheres), Aorta root (curved tube), Pulmonary trunk.
4. `web/src/scene/Torso.tsx`:
   - Low-poly translucent torso shell (`depthWrite={false}`, `flatShading={true}`, wireframe edges).
5. `web/src/scene/Vessels.tsx`:
   - Tubes for LM, LAD, LCX, RCA with raycast proxies and uniform material coloring.
6. `web/src/scene/SceneCanvas.tsx`:
   - `<Canvas frameloop="demand" dpr={[1, 1.5]} shadows={false}>` with `DemandInvalidator`, `OrbitControls`, camera presets, and lights.
7. `web/src/components/DebugPanel.tsx`:
   - Interactive sliders for LAD, LCX, RCA, colorblind toggle, torso toggle, opacity slider, camera buttons.
8. `web/src/App.tsx`:
   - Main layout integrating persistent safety disclaimer banner, 3D viewport, and debug controls.

---

## 5. Verification Method

To independently verify the implementation:

1. **Feature Branch Check**:
   ```bash
   git branch --show-current
   # Must be feature/3d-01-scene
   ```

2. **TypeScript & Build Verification**:
   ```bash
   cd C:\Users\nived\cardiovision\web
   npm run lint
   npm run build
   # Must complete with exit code 0 and zero warnings/errors
   ```

3. **Demand Frameloop & Performance Verification**:
   - Inspect `SceneCanvas.tsx`: Confirm `frameloop="demand"` and `dpr={[1, 1.5]}`.
   - Confirm `useStore.subscribe` invokes `invalidate()`.
   - Confirm Torso material specifies `depthWrite: false`.

4. **Visual & Behavioral Verification in Browser**:
   ```bash
   npm run dev
   ```
   - Move LAD, LCX, RCA sliders: Verify whole vessels smoothly recolor in real time.
   - Toggle Colorblind mode: Verify palette switches from Green/Amber/Red to Blue/Orange/Magenta.
   - Toggle Torso: Verify shell appears/disappears without occluding internal heart.
   - Move OrbitControls: Verify smooth rotation and zero CPU usage when idle.

5. **Completion Record Check**:
   - Verify `docs/STATUS.md` contains:
     `YYYY-MM-DD HH:MM | 3D-01 | Soumyadeep | done | <note>`
