import React, { useEffect, useState } from 'react';
import { PersonaPicker } from './components/PersonaPicker';
import { ClinicalPanel } from './components/ClinicalPanel';
import { SafetyModal } from './components/SafetyModal';
import { FloatingRiskLegend } from './components/FloatingRiskLegend';
import { WebGLErrorBoundary } from './components/WebGLErrorBoundary';
import { WebGLFallback } from './components/WebGLFallback';
import { ModelInfoDrawer } from './components/ModelInfoDrawer';
import { DoctorInspectionDrawer } from './components/DoctorInspectionDrawer';
import { BlenderStudioModal } from './components/BlenderStudioModal';
import { BlenderTurntableEmbed } from './components/BlenderTurntableEmbed';
import { InteractiveSensitivityHUD } from './components/InteractiveSensitivityHUD';
import { SceneCanvas } from './scene/SceneCanvas';
import { DissectionControls } from './components/DissectionControls';
import { DraggableToolsMenu } from './components/DraggableToolsMenu';
import { ECGMonitorHUD } from './components/ECGMonitorHUD';
import { RepresentationSwitcherPill } from './components/RepresentationSwitcherPill';
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
  const force2DFallback = useStore((state) => state.force2DFallback);
  const webglError = useStore((state) => state.webglError);
  const isSensitivityOpen = useStore((state) => state.isSensitivityOpen);
  const closeSensitivity = useStore((state) => state.closeSensitivity);
  const [isModelInfoOpen, setIsModelInfoOpen] = useState(false);
  const [isBlenderStudioOpen, setIsBlenderStudioOpen] = useState(false);
  const [isDisclaimerDismissed, setIsDisclaimerDismissed] = useState(false);

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

      {/* 2. Mandatory Persistent Clinical Safety Disclaimer Banner (Dismissable with Cross button) */}
      {!isDisclaimerDismissed && (
        <header className="bg-amber-950/90 border-b border-amber-600/50 text-amber-200 text-xs px-4 py-2 flex items-center justify-between font-medium tracking-wide shadow-md z-30">
          <div className="flex-1 text-center pr-2">
            For decision support and educational purposes only. Not a medical device. Not a substitute for formal diagnostic imaging or clinical judgment.
          </div>
          <button
            type="button"
            onClick={() => setIsDisclaimerDismissed(true)}
            className="p-1 rounded-md text-amber-300 hover:text-white hover:bg-amber-900/60 transition-colors shrink-0"
            title="Dismiss clinical safety banner to expand view"
            aria-label="Dismiss disclaimer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>
      )}

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
          {isDisclaimerDismissed && (
            <button
              type="button"
              onClick={() => setIsDisclaimerDismissed(false)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-amber-700 bg-amber-950/90 text-amber-300 hover:bg-amber-900 transition-all flex items-center gap-1.5 shadow-sm"
              title="Show clinical safety disclaimer banner"
            >
              <span>⚠️</span>
              <span className="hidden sm:inline">Disclaimer</span>
            </button>
          )}

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

      {/* 4. Dedicated Patient Access Bar (Relocated PersonaPicker completely outside 3D Canvas) */}
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

          {/* 0. In-Viewport Floating Representation Switcher Pill */}
          <RepresentationSwitcherPill />

          {/* 3. Consolidated Draggable Floating Tools HUD */}
          <DraggableToolsMenu />

          {/* 3b. Surgical Dissection Controls (Active for both procedural and realistic 3D representations) */}
          {(viewerMode === 'procedural' || viewerMode === 'realistic') && <DissectionControls />}

          {/* 4. Floating Risk Legend HUD (Movable & Collapsible) */}
          <FloatingRiskLegend />

          {/* 5. Systematic Real-Time ECG Oscilloscope Monitor HUD (Minimalist & Draggable) */}
          <ECGMonitorHUD />

          {/* 6. Interactive Sensitivity & What-If Studio HUD Overlay (Draggable) */}
          <InteractiveSensitivityHUD isOpen={isSensitivityOpen} onClose={closeSensitivity} />
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
