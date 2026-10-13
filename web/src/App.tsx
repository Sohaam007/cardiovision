import React from 'react';
import { SceneCanvas } from './scene/SceneCanvas';
import { DebugPanel } from './components/DebugPanel';
import { useStore } from './store/useStore';
import { PALETTES } from './scene/vesselConfig';

export const App: React.FC = () => {
  const selectedVessel = useStore((state) => state.selectedVessel);
  const colorblindMode = useStore((state) => state.colorblindMode);
  const prediction = useStore((state) => state.prediction);

  const activePalette = colorblindMode ? PALETTES.colorblind : PALETTES.standard;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden font-sans">
      {/* 1. Mandatory Persistent Clinical Safety Disclaimer Banner */}
      <header className="bg-amber-950/90 border-b border-amber-600/50 text-amber-200 text-xs px-4 py-2 text-center font-medium tracking-wide shadow-md z-30">
        For decision support and educational purposes only. Not a medical device. Not a substitute for formal diagnostic imaging or clinical judgment.
      </header>

      {/* 2. Application Navigation Bar */}
      <nav className="bg-slate-900/80 backdrop-blur border-b border-slate-800 px-6 py-3 flex items-center justify-between z-20">
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
                Track A: 3D Visualization
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Interactive 3D Heart & Coronary Vessel Stenosis Risk Architecture
            </p>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 bg-slate-950/80 px-3 py-1.5 rounded-full border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Demand Frameloop Active (DPR &le; 1.5)</span>
          </div>
          {selectedVessel && (
            <div className="flex items-center gap-2 text-xs bg-cyan-950 text-cyan-300 px-3 py-1.5 rounded-full border border-cyan-700">
              <span className="font-semibold">{selectedVessel} Selected</span>
              <span className="text-cyan-400 font-mono">
                {((prediction.vessels[selectedVessel]?.prob ?? 0) * 100).toFixed(0)}% Risk
              </span>
            </div>
          )}
        </div>
      </nav>

      {/* 3. Main Workspace Area: 3D Viewport with Integrated Debug Panel */}
      <main className="flex-1 relative flex flex-col lg:flex-row overflow-hidden">
        {/* 3D Canvas Viewport */}
        <div className="flex-1 relative h-[50vh] lg:h-auto">
          <SceneCanvas />

          {/* Viewport HUD Overlays */}
          {/* Interaction hints */}
          <div className="absolute top-4 left-4 pointer-events-none z-10 hidden sm:flex flex-col gap-1.5">
            <div className="bg-slate-950/75 backdrop-blur border border-slate-800 text-[11px] text-slate-300 px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-2">
              <span className="text-cyan-400 font-medium">3D Controls:</span>
              <span>Left click drag = Rotate &bull; Right click = Pan &bull; Scroll = Zoom</span>
            </div>
            <div className="bg-slate-950/75 backdrop-blur border border-slate-800 text-[11px] text-slate-400 px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-2">
              <span className="text-amber-400 font-medium">Clinical Guardrail:</span>
              <span>Whole-vessel uniform risk shading &bull; No localized lesion markers</span>
            </div>
          </div>

          {/* Color Legend HUD */}
          <div className="absolute bottom-4 left-4 pointer-events-none z-10 bg-slate-950/80 backdrop-blur border border-slate-800 text-xs text-slate-300 p-2.5 rounded-lg shadow-lg flex flex-col gap-1.5">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
              {colorblindMode ? 'Colorblind Risk Scale' : 'Standard Risk Scale'}
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

        {/* Floating / Side-docked Debug Panel */}
        <div className="p-4 lg:p-6 lg:overflow-y-auto z-10 shrink-0 flex items-start justify-center">
          <DebugPanel />
        </div>
      </main>

      {/* 4. Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 px-4 py-2.5 text-center text-xs text-slate-500 z-20">
        CardioVision &bull; Multimodal AI Hackathon 2026 &bull; Track A: Cardiovascular Risk Visualization &bull; Model v1.0
      </footer>
    </div>
  );
};

export default App;
