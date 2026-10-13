# Survey & Codebase Investigation Report: Task 3D-01

## 1. Observation

### 1.1 Git Status & Branch Configuration
- **Command**: `git status; git branch -a; git remote -v`
- **Output**:
  ```text
  On branch main
  Your branch is up to date with 'origin/main'.

  Untracked files:
    (use "git add <file>..." to include in what will be committed)
    .agents/

  nothing added to commit but untracked files present (use "git add" to track)
  * main
    remotes/origin/HEAD -> origin/main
    remotes/origin/main
  origin	https://github.com/Sohaam007/cardiovision.git (fetch)
  origin	https://github.com/Sohaam007/cardiovision.git (push)
  ```
- **Commit History** (`git log -n 5 --oneline`):
  ```text
  052ebdb chore: bootstrap repo and docs pack
  ```
- **Finding**: Currently on `main`. No feature branches exist yet. Working tree is clean except for the local `.agents/` directory.

---

### 1.2 Web Directory & Configuration Inspection

#### Package Configuration (`web/package.json`)
- File path: `C:\Users\nived\cardiovision\web\package.json` (lines 12–31)
- **Dependencies**:
  - `"@react-three/drei"`: `"^9.120.4"`
  - `"@react-three/fiber"`: `"^8.17.10"`
  - `"react"`: `"^18.3.1"`
  - `"react-dom"`: `"^18.3.1"`
  - `"recharts"`: `"^2.13.0"`
  - `"three"`: `"^0.170.0"`
  - `"zustand"`: `"^5.0.0"`
- **DevDependencies**:
  - `"@types/react"`: `"^18.3.12"`
  - `"@types/react-dom"`: `"^18.3.1"`
  - `"@types/three"`: `"^0.170.0"`
  - `"@vitejs/plugin-react"`: `"^4.3.3"`
  - `"autoprefixer"`: `"^10.4.20"`
  - `"postcss"`: `"^8.4.47"`
  - `"tailwindcss"`: `"^3.4.14"`
  - `"typescript"`: `"^5.6.3"`
  - `"vite"`: `"^5.4.10"`
- **Scripts**:
  - `"dev"`: `"vite"`
  - `"build"`: `"tsc && vite build"`
  - `"lint"`: `"tsc --noEmit"`
  - `"preview"`: `"vite preview"`
- **Package Notes**:
  - `lucide-react` is **not installed** in `package.json`. Search across the codebase (`grep_search` for `lucide`) returned 0 matches.
  - Three.js is pinned at `^0.170.0` with `@types/three` at `^0.170.0`.
  - React Three Fiber is `^8.17.10` and Drei is `^9.120.4`.
  - Zustand is `^5.0.0` (latest major version with modern store creation API).

#### TypeScript Configuration (`web/tsconfig.json`)
- File path: `C:\Users\nived\cardiovision\web\tsconfig.json` (lines 1–23)
- Key compiler options:
  - `"target": "ES2020"`
  - `"moduleResolution": "bundler"`
  - `"strict": true`
  - `"noUnusedLocals": true`
  - `"noUnusedParameters": true`
  - `"noFallthroughCasesInSwitch": true`
  - `"include": ["src"]`
- **Notice**: No path alias (such as `@/*`) is configured in `tsconfig.json`. All source imports must use relative paths (e.g. `../scene/...`, `../store/useStore`).

#### Vite Configuration (`web/vite.config.ts`)
- File path: `C:\Users\nived\cardiovision\web\vite.config.ts` (lines 1–12)
- Minimal configuration with `react()` plugin and dev server on port 5173 (`host: true`). No path aliases or custom bundler plugins configured.

---

### 1.3 Web/src Structure & Existing Code

#### Existing Files in `web/src/`
- Directory listing of `web/src/` shows exactly 3 files and 0 subdirectories:
  1. `web/src/App.tsx` (32 lines, 1407 bytes)
  2. `web/src/index.css` (14 lines, 220 bytes)
  3. `web/src/main.tsx` (11 lines, 260 bytes)

#### Analysis of `web/src/App.tsx`
- Contains a minimal landing view:
  - Header: Persistent safety disclaimer banner (`For decision support and educational purposes only. Not a medical device. Not a substitute for formal diagnostic imaging or clinical judgment.`).
  - Main: Title (`CardioVision`), subtitle, status pill (`Repo scaffolded & ready`).
  - Footer: Attributions.
- Currently does **not** import or render any 3D scene, Canvas, or state store.

#### Analysis of Missing Modules for 3D-01
- `web/src/scene/`: Directory does **not exist**. Needs to be created with:
  - `Heart.tsx` (procedural stylized heart geometry)
  - `Torso.tsx` (low-poly translucent shell with visibility toggle)
  - `Vessels.tsx` (coronary vessels using procedural TubeGeometry)
  - `vesselConfig.ts` (CatmullRomCurve3 curves for LAD, LCX, RCA, Left Main)
- `web/src/store/`: Directory does **not exist**. Needs to be created with:
  - `useStore.ts` (Zustand store with vessel probabilities LAD, LCX, RCA, colorblind toggle, torso toggle, selected vessel)
- `web/src/components/`: Directory does **not exist**. Debug controls / sliders for LAD, LCX, RCA and toggles will need to be placed here or in a dedicated view component.

---

### 1.4 Dependency Installation & Build Execution

- **`node_modules`**: Present in `web/node_modules/` (verified via directory listing).
- **Build Command**: `npm run build` in `C:\Users\nived\cardiovision\web`
  - **Result**: Exit code 0.
  - **Output verbatim**:
    ```text
    > cardiovision-web@0.1.0 build
    > tsc && vite build

    vite v5.4.21 building for production...
    transforming...
    ✓ 31 modules transformed.
    rendering chunks...
    computing gzip size...
    dist/index.html                   0.54 kB │ gzip:  0.35 kB
    dist/assets/index-BaVAFl9H.css    7.05 kB │ gzip:  2.09 kB
    dist/assets/index-D5J1L8M8.js   143.77 kB │ gzip: 46.36 kB
    ✓ built in 1.44s
    ```
- **Lint Command**: `npm run lint` (`tsc --noEmit`) in `C:\Users\nived\cardiovision\web`
  - **Result**: Exit code 0. Clean compilation with zero TypeScript errors or warnings.

---

## 2. Logic Chain

1. **Baseline Health**:
   - Because `web/package.json` has all required core dependencies (`three`, `@react-three/fiber`, `@react-three/drei`, `zustand`, `tailwindcss`, `typescript`) installed in `web/node_modules`, and both `npm run build` and `npm run lint` succeed with exit code 0, the project baseline is clean, fully operational, and reproducible.

2. **Branching Requirement (R3)**:
   - Git status confirms the current branch is `main` with only 1 remote commit. Requirement R3 in `ORIGINAL_REQUEST.md` mandates: *"Isolate all changes on a dedicated feature branch (e.g. feature/3d-01-scene). Do not push directly to main."*
   - Therefore, the implementation phase must execute `git checkout -b feature/3d-01-scene` before adding or committing any code.

3. **Architecture & Scope Alignment (R1, R2, docs/05_3D_SPEC.md, docs/tasks/3D-01.md)**:
   - Currently, `web/src` lacks `scene/`, `store/`, and `components/`.
   - `docs/05_3D_SPEC.md` and `docs/DECISIONS.md` explicitly mandate:
     - Procedural stylized heart mesh (decision #1: no download dependency, CC-license compliant).
     - Procedural coronary vessels via `TubeGeometry` and `CatmullRomCurve3` in `src/scene/vesselConfig.ts`.
     - Vessel keys strictly `LAD`, `LCX`, `RCA`.
     - Entire vessel uniformly colored by probability (never localized lesion markers, per clinical guardrails in `AGENTS.md` and `docs/00_CONTEXT.md`).
     - Standard palette: Green (low risk) -> Amber (medium risk) -> Red (high risk).
     - Colorblind palette: Blue -> Orange -> Magenta.
     - Frameloop set to `"demand"`, calling `invalidate()` from `@react-three/fiber` on slider updates or camera movements.
     - DPR capped at 1.5 (`dpr={[1, 1.5]}`).

4. **Dependency & Type Safety Considerations**:
   - `lucide-react` is not installed. To avoid introducing missing dependency errors or npm install overhead, any icons (such as eye toggle for torso, reset, or colorblind mode) should be rendered using clean inline SVG or Tailwind CSS styling.
   - Zustand is version 5.0.0. The store implementation should use Zustand 5 syntax (`create<StoreState>()((set) => ({ ... }))`).
   - `tsconfig.json` enforces `"noUnusedLocals": true` and `"noUnusedParameters": true`. Any helper imports or parameters in Three.js hooks must be strictly used or omitted.
   - No path alias exists; all imports between `src/scene`, `src/store`, and `src/App.tsx` must be explicit relative paths.

---

## 3. Caveats

- **BodyParts3D Mesh**: `docs/05_3D_SPEC.md` notes that external GLB mesh is optional and time-boxed, whereas procedural stylized heart in code is the designated default (zero network downloads, zero external licensing risks). The survey confirms `web/public` does not contain any `.glb` files; procedural generation is the correct path.
- **Backend API Integration**: Out of scope for 3D-01 as stated in `docs/tasks/3D-01.md` and `ORIGINAL_REQUEST.md`. Predictions for 3D-01 are driven by Zustand with real-time fake/debug sliders.
- **No Jest / Vitest Runner**: The frontend currently does not have an automated unit test framework configured in `package.json`. Verification is performed through `tsc --noEmit`, `vite build`, and behavioral/visual validation.

---

## 4. Conclusion

The repository is in a healthy, verified starting state:
1. **Branch status**: Ready to create and switch to feature branch `feature/3d-01-scene` from `main`.
2. **Environment & Build**: Node modules are already installed; `npm run build` and `npm run lint` compile cleanly in under 2 seconds.
3. **Target Structure Identified**:
   - Create `web/src/store/useStore.ts` with Zustand 5 (LAD, LCX, RCA probabilities, colorblind toggle, torso toggle, invalidate callback).
   - Create `web/src/scene/vesselConfig.ts` with 3D CatmullRomCurve3 paths for LAD, LCX, RCA, and Left Main.
   - Create `web/src/scene/Heart.tsx`, `web/src/scene/Torso.tsx`, `web/src/scene/Vessels.tsx`, and `web/src/scene/SceneCanvas.tsx`.
   - Create `web/src/components/DebugPanel.tsx` with probability sliders, colorblind toggle, torso toggle, and camera reset.
   - Integrate into `web/src/App.tsx` maintaining the safety disclaimer header banner and clean responsive layout.
4. **Key Constraints to Enforce**:
   - `frameloop="demand"` with `invalidate()` on every store/camera update.
   - `dpr={[1, 1.5]}` max.
   - Strict adherence to clinical rule: color whole vessel, no localized stenosis markers.
   - No `lucide-react` import (use inline SVGs).
   - Append completion entry to `docs/STATUS.md` upon completion.

---

## 5. Verification Method

To independently verify the survey findings:

1. **Verify Git Status and Branches**:
   ```bash
   cd C:\Users\nived\cardiovision
   git status
   git branch -a
   ```
   *Expected*: On branch `main`, clean tree with untracked `.agents/`.

2. **Verify Dependencies and Package Setup**:
   ```bash
   cd C:\Users\nived\cardiovision\web
   type package.json
   ```
   *Expected*: Shows `@react-three/fiber` 8.17.10, `@react-three/drei` 9.120.4, `three` 0.170.0, `zustand` 5.0.0.

3. **Verify Build and Typecheck**:
   ```bash
   cd C:\Users\nived\cardiovision\web
   npm run lint
   npm run build
   ```
   *Expected*: Both commands exit with code 0.

4. **Verify Directory Structure**:
   ```bash
   dir C:\Users\nived\cardiovision\web\src
   ```
   *Expected*: Exactly 3 files (`App.tsx`, `index.css`, `main.tsx`) and 0 subdirectories.
