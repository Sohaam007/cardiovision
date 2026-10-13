import React, { useEffect } from 'react';
import { SceneCanvas } from './scene/SceneCanvas';
import { PersonaPicker } from './components/PersonaPicker';
import { ClinicalPanel } from './components/ClinicalPanel';
import { SafetyModal } from './components/SafetyModal';
import { useStore } from './store/useStore';
import { PALETTES } from './scene/vesselConfig';
import { checkHealth, fetchSchema, fetchDemoPatients } from './api/client';

export const App: React.FC = () => {
  const selectedVessel = useStore((state) => state.selectedVessel);
  const colorblindMode = useStore((state) => state.colorblindMode);
  const toggleColorblindMode = useStore((state) => state.toggleColorblindMode);
  const prediction = useStore((state) => state.prediction);
  const setSchema = useStore((state) => state.setSchema);
  const setDemoPatients = useStore((state) => state.setDemoPatients);
  const loadPersona = useStore((state) => state.loadPersona);
  const setApiStatus = useStore((state) => state.setApiStatus);
  const setDemoMode = useStore((state) => state.setDemoMode);

  const activePalette = colorblindMode ? PALETTES.colorblind : PALETTES.standard;

  // Initial asset loading & health check
  useEffect(() => {
    let mounted = true;

    async function initializeApp() {
      // 1. Check live API health
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
    }

    initializeApp();

    return () => {
      mounted = false;
    };
  }, [setSchema, setDemoPatients, loadPersona, setApiStatus, setDemoMode]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden font-sans">
      {/* 1. First-Load Clinical Safety Modal */}
      <SafetyModal />

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
        <div className="flex items-center gap-3">
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
          <SceneCanvas />

          {/* Viewport HUD Overlays */}
          <div className="absolute top-4 left-4 pointer-events-none z-10 hidden sm:flex flex-col gap-1.5">
            <div className="bg-slate-950/80 backdrop-blur border border-slate-800 text-[11px] text-slate-300 px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-2">
              <span className="text-cyan-400 font-medium">3D Controls:</span>
              <span>Left-drag = Rotate &bull; Right-drag = Pan &bull; Scroll = Zoom</span>
            </div>
            <div className="bg-slate-950/80 backdrop-blur border border-slate-800 text-[11px] text-slate-400 px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-2">
              <span className="text-amber-400 font-medium">Clinical Invariant:</span>
              <span>Uniform vessel risk shading &bull; Zero localized lesion markers</span>
            </div>
          </div>

          {/* Color Legend HUD */}
          <div className="absolute bottom-4 left-4 pointer-events-none z-10 bg-slate-950/85 backdrop-blur border border-slate-800 text-xs text-slate-300 p-2.5 rounded-lg shadow-lg flex flex-col gap-1.5">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
              {colorblindMode ? 'Okabe-Ito Colorblind Scale' : 'Clinical Risk Scale'}
            </span>
            <div className="flex items-center gap-3 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activePalette.low }} />
                <span>Low (&lt;40%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activePalette.mid }} />
                <span>Mod (40-70%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activePalette.high }} />
                <span>High (&ge;70%)</span>
              </div>
            </div>
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
