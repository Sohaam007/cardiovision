import React, { useEffect, useState } from 'react';
import { SceneCanvas } from './scene/SceneCanvas';
import { PersonaPicker } from './components/PersonaPicker';
import { ClinicalPanel } from './components/ClinicalPanel';
import { SafetyModal } from './components/SafetyModal';
import { FloatingRiskLegend } from './components/FloatingRiskLegend';
import { WebGLErrorBoundary } from './components/WebGLErrorBoundary';
import { WebGLFallback } from './components/WebGLFallback';
import { ModelInfoDrawer } from './components/ModelInfoDrawer';
import { DissectionControls } from './components/DissectionControls';
import { DoctorInspectionDrawer } from './components/DoctorInspectionDrawer';
import { BlenderStudioModal } from './components/BlenderStudioModal';
import { BlenderTurntableEmbed } from './components/BlenderTurntableEmbed';
import { InteractiveSensitivityHUD } from './components/InteractiveSensitivityHUD';
import { DraggableToolsMenu } from './components/DraggableToolsMenu';
import { PatientFindingsHUD } from './components/PatientFindingsHUD';
import { CardiacCycleControlsHUD } from './components/CardiacCycleControlsHUD';
import { useStore } from './store/useStore';
import { checkHealth, fetchSchema, fetchDemoPatients } from './api/client';

export const App: React.FC = () => {
  const selectedVessel = useStore((state) => state.selectedVessel);
  const colorblindMode = useStore((state) => state.colorblindMode);
  const toggleColorblindMode = useStore((state) => state.toggleColorblindMode);
  const openModelInfo = useStore((state) => state.openModelInfo);
  const prediction = useStore((state) => state.prediction);
  const setSchema = useStore((state) => state.setSchema);
  const setDemoPatients = useStore((state) => state.setDemoPatients);
  const loadPersona = useStore((state) => state.loadPersona);
  const setApiStatus = useStore((state) => state.setApiStatus);
  const setDemoMode = useStore((state) => state.setDemoMode);
  const viewerMode = useStore((state) => state.viewerMode);
  const setViewerMode = useStore((state) => state.setViewerMode);
  const force2DFallback = useStore((state) => state.force2DFallback);
  const webglError = useStore((state) => state.webglError);
  const isSensitivityOpen = useStore((state) => state.isSensitivityOpen);
  const closeSensitivity = useStore((state) => state.closeSensitivity);
  const toggleSensitivity = useStore((state) => state.toggleSensitivity);
  const [isModelInfoOpen, setIsModelInfoOpen] = useState(false);
  const [isBlenderStudioOpen, setIsBlenderStudioOpen] = useState(false);

  // Initial asset loading & health check
  useEffect(() => {
    let mounted = true;

    async function initializeApp() {
      // 1. Check live API health
      setApiStatus('waking');
      const isLive = await checkHealth();
      if (!mounted) return;
      if (isLive) {
        setApiStatus('live');
        setDemoMode(false);
      } else {
        setApiStatus('demo');
        setDemoMode(true);
      }

      // 2. Fetch schema & demo patients
      try {
        const schema = await fetchSchema();
        if (mounted && schema) setSchema(schema);
      } catch (err) {
        console.warn('Schema fetch warning:', err);
      }

      try {
        const patients = await fetchDemoPatients();
        if (mounted && patients && patients.length > 0) {
          setDemoPatients(patients);
          // Load default first persona
          loadPersona(patients[0]);
        }
      } catch (err) {
        console.warn('Demo patients fetch warning:', err);
      }

      // Handle URL query params for automated testing, deep-linking and screenshot captures
      try {
        const search = window.location.search;
        if (search) {
          const params = new URLSearchParams(search);
          const view = params.get('view');
          const vessel = params.get('vessel') as any;
          const tab = params.get('tab') as any;
          const bp = params.get('bp');

          if (view === 'anterior' || view === 'lateral' || view === 'posterior') {
            useStore.getState().setCameraPreset(view);
          }
          if (vessel && (vessel === 'LAD' || vessel === 'LCX' || vessel === 'RCA')) {
            useStore.getState().setSelectedVessel(vessel, true);
          }
          if (tab && ['explainability', 'sensitivity', 'form', '3d_debug'].includes(tab)) {
            useStore.getState().setActiveTab(tab);
          }
          if (bp) {
            useStore.getState().setPatientInput('BP', Number(bp));
          }
        }
      } catch {
        // Ignore in non-browser environment
      }
    }

    initializeApp();


    return () => {
      mounted = false;
    };
  }, [setSchema, setDemoPatients, loadPersona, setApiStatus, setDemoMode]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden font-sans">
      {/* 1. First-Load Clinical Safety Modal, Model Info, & Doctor Inspection Drawer */}
      <SafetyModal />
      <ModelInfoDrawer isOpen={isModelInfoOpen} onClose={() => { setIsModelInfoOpen(false); useStore.getState().closeModelInfo(); }} />
      <DoctorInspectionDrawer />
      <BlenderStudioModal isOpen={isBlenderStudioOpen} onClose={() => setIsBlenderStudioOpen(false)} />

      {/* 2. Mandatory Persistent Clinical Safety Disclaimer Banner */}
      <header className="bg-amber-950/90 border-b border-amber-600/50 text-amber-200 text-xs px-4 py-2 text-center font-medium tracking-wide shadow-md z-30">
        For decision support and educational purposes only. Not a medical device. Not a substitute for formal diagnostic imaging or clinical judgment.
      </header>

      {/* 3. Application Navigation Bar */}
      <nav className="bg-slate-900/90 backdrop-blur border-b border-slate-800 px-6 py-2.5 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-red-700 flex items-center justify-center shadow-lg shadow-rose-950/40">
            <svg
              className="w-4 h-4 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-white tracking-tight">CardioVision</span>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                Track A: CAD & 3D Viewer
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Multimodal Cardiac Risk Stratification with Calibrated TreeSHAP & Interactive 3D Anatomy
            </p>
          </div>
        </div>

        {/* Global Controls & Status */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsBlenderStudioOpen(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-purple-700 bg-purple-950/90 text-purple-300 hover:bg-purple-900 transition-all flex items-center gap-1.5 shadow-sm"
            title="Inspect Blender 5.2 medical studio renders, 360° turntable animation, and 3D assets"
          >
            <svg className="w-3.5 h-3.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>Blender Studio Renders</span>
          </button>

          <button
            onClick={() => {
              setIsModelInfoOpen(true);
              openModelInfo();
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-cyan-700 bg-cyan-950/90 text-cyan-300 hover:bg-cyan-900 transition-all flex items-center gap-1.5 shadow-sm"
            title="Inspect 15-fold cross-validation metrics, feature ablations, and clinical limitations"
          >
            <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Model Info &amp; Caveats</span>
          </button>

          <button
            onClick={toggleColorblindMode}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              colorblindMode
                ? 'bg-amber-950 text-amber-300 border-amber-600'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            {colorblindMode ? 'Colorblind (Okabe-Ito)' : 'Standard Palette'}
          </button>

          {selectedVessel && (
            <div className="hidden sm:flex items-center gap-2 text-xs bg-cyan-950 text-cyan-300 px-3 py-1.5 rounded-full border border-cyan-700">
              <span className="font-semibold">{selectedVessel} Selected</span>
              <span className="text-cyan-400 font-mono font-bold">
                {((prediction.vessels[selectedVessel]?.prob ?? 0) * 100).toFixed(0)}%
              </span>
            </div>
          )}
        </div>
      </nav>

      {/* 4. Top Bar: Persona Picker (8 Holdout Patients) */}
      <PersonaPicker />

      {/* 5. Main Workspace Area: 2-Column Responsive View (3D Scene + Clinical Panel) */}
      <main className="flex-1 relative flex flex-col lg:flex-row overflow-hidden">
        {/* Left Column: 3D Canvas Viewport */}
        <div className="flex-1 relative h-[50vh] lg:h-auto bg-slate-950">
          <WebGLErrorBoundary fallback={<WebGLFallback />}>
            {viewerMode === '2d' || force2DFallback || webglError ? (
              <WebGLFallback />
            ) : viewerMode === 'blender' ? (
              <BlenderTurntableEmbed onOpenModal={() => setIsBlenderStudioOpen(true)} />
            ) : (
              <SceneCanvas />
            )}
          </WebGLErrorBoundary>

          {/* Viewport Clinical HUD Overlay */}
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4 pointer-events-none z-10 hidden sm:flex items-center gap-2">
            <div className="bg-[#090d16]/90 backdrop-blur-md border border-slate-800 text-[11px] text-slate-300 px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="font-semibold text-white">
                {viewerMode === 'realistic' && '3D Beating Heart'}
                {viewerMode === 'procedural' && '3D Procedural Anatomy'}
                {viewerMode === '2d' && '2D Angiogram Suite'}
                {viewerMode === 'blender' && 'Blender Studio Turntable'}
              </span>
              <span className="text-slate-500 text-[10px] pl-2 border-l border-slate-800 hidden md:inline">
                Uniform vessel risk shading &bull; Zero localized lesions
              </span>
            </div>
          </div>

          {/* Segmented Mode Selector & Sensitivity What-If Toggle in Viewport Top-Right */}
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 pointer-events-auto z-10 flex flex-wrap items-center gap-2 max-w-full justify-end">
            <div className="flex items-center bg-[#090d16]/90 backdrop-blur-md p-1 rounded-xl border border-slate-800 shadow-2xl">
              <button
                type="button"
                onClick={() => setViewerMode('realistic')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  viewerMode === 'realistic'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-950/60 ring-1 ring-rose-400/50'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
                title="3D Photorealistic Beating Heart Model"
              >
                <span>🫀 3D Beating</span>
              </button>

              <button
                type="button"
                onClick={() => setViewerMode('procedural')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  viewerMode === 'procedural'
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/60 ring-1 ring-cyan-400/50'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
                title="3D Procedural Myocardium & Chamber Dissection Model"
              >
                <span>⚙️ 3D Procedural</span>
              </button>

              <button
                type="button"
                onClick={() => setViewerMode('2d')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  viewerMode === '2d'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-950/60 ring-1 ring-amber-400/50'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
                title="2D Clinical Angiogram & Hemodynamic Suite with Live Flow, ECG, and Cavities"
              >
                <span>🔬 2D Angiogram</span>
              </button>

              <button
                type="button"
                onClick={() => setViewerMode('blender')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  viewerMode === 'blender'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-950/60 ring-1 ring-purple-400/50'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
                title="Blender 5.2 360° Studio Turntable & Offline Renderings"
              >
                <span>🎬 Blender Studio</span>
              </button>
            </div>

            <button
              type="button"
              onClick={toggleSensitivity}
              className={`backdrop-blur-md border text-xs px-2.5 py-2 rounded-xl shadow-xl flex items-center gap-1.5 transition-all font-semibold ${
                isSensitivityOpen
                  ? 'bg-purple-600 text-white border-purple-500 shadow-purple-950/50'
                  : 'bg-[#090d16]/90 border-purple-800/70 hover:border-purple-600 text-purple-300 hover:text-white'
              }`}
              title="Toggle interactive 3D model sensitivity sliders and what-if simulation"
            >
              <svg className="w-3.5 h-3.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              <span>{isSensitivityOpen ? 'Close Sensitivity' : '⚡ 3D Sensitivity'}</span>
            </button>
          </div>

          {/* Patient Findings & Direct Structure Navigation HUD Overlay */}
          <div className="absolute top-12 left-3 right-3 sm:top-14 sm:left-4 sm:right-4 z-20 pointer-events-auto flex flex-col gap-1.5 max-w-full">
            <PatientFindingsHUD />
            <div className="self-start">
              <CardiacCycleControlsHUD />
            </div>
          </div>

          {/* Consolidated Draggable Floating Tools HUD */}
          <DraggableToolsMenu />

          {/* Surgical Dissection Controls (Active in 3D procedural mode) */}
          {viewerMode === 'procedural' && <DissectionControls />}

          {/* Interactive Sensitivity & What-If Studio HUD Overlay */}
          <InteractiveSensitivityHUD isOpen={isSensitivityOpen} onClose={closeSensitivity} />

          {/* Floating Risk Legend HUD (Anterior/Lateral/Posterior presets, percentages, opacity slider, torso toggle, selected vessel details) */}
          <div className="absolute bottom-4 left-4 z-10">
            <FloatingRiskLegend />
          </div>
        </div>


        {/* Right Column: Clinical Decision Support & Explainability Panel */}
        <ClinicalPanel />
      </main>

      {/* 6. Persistent Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 px-4 py-2 text-center text-xs text-slate-500 z-20">
        CardioVision &bull; Track A: Cardiac Risk & 3D Viewer &bull; UCI Z-Alizadeh Sani Dataset (ID 411) &bull; Model v1.0 Calibrated XGBoost &bull; Research Use Only
      </footer>
    </div>
  );
};

export default App;
