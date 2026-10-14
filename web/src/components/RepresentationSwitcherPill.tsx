import React from 'react';
import { useStore } from '../store/useStore';

export const RepresentationSwitcherPill: React.FC = () => {
  const viewerMode = useStore((state) => state.viewerMode);
  const setViewerMode = useStore((state) => state.setViewerMode);
  const isSensitivityOpen = useStore((state) => state.isSensitivityOpen);
  const toggleSensitivity = useStore((state) => state.toggleSensitivity);

  // Unified mode switcher bar supporting realistic, procedural, 2D, and Blender modes
  // (Ensures accessibility across views without hiding: viewerMode !== 'realistic' && viewerMode !== 'procedural')

  return (
    <div
      className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto select-none max-w-[96vw]"
      data-testid="representation-switcher-pill"
    >
      <div className="flex items-center gap-1 bg-card/90 backdrop-blur-xl p-1 rounded-full border border-border shadow-2xl overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setViewerMode('realistic')}
          data-testid="pill-realistic-btn"
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
            viewerMode === 'realistic'
              ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30 ring-1 ring-primary/40'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
          }`}
          title="Switch to photorealistic Blender beating heart model (beating_heart.glb)"
        >
          <span>🫀 Blender Photorealistic</span>
        </button>

        <button
          type="button"
          onClick={() => setViewerMode('procedural')}
          data-testid="pill-procedural-btn"
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
            viewerMode === 'procedural'
              ? 'bg-accent text-accent-foreground shadow-md shadow-accent/30 ring-1 ring-accent/40'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
          }`}
          title="Switch to procedural 3D heart with surgical dissection and internal anatomy"
        >
          <span>⚙️ Procedural Anatomy</span>
        </button>

        <button
          type="button"
          onClick={() => setViewerMode('2d')}
          data-testid="pill-2d-btn"
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
            viewerMode === '2d'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-950/60 ring-1 ring-amber-400/50'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
          }`}
          title="Switch to 2D clinical angiogram and hemodynamics view"
        >
          <span>🔬 2D Angiogram</span>
        </button>

        <button
          type="button"
          onClick={() => setViewerMode('blender')}
          data-testid="pill-blender-btn"
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
            viewerMode === 'blender'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-950/60 ring-1 ring-purple-400/50'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
          }`}
          title="Switch to Blender 5.2 360° studio turntable and offline renders"
        >
          <span>🎬 Blender Studio</span>
        </button>

        <div className="h-4 w-px bg-border mx-1 shrink-0" />

        <button
          type="button"
          onClick={toggleSensitivity}
          data-testid="pill-sensitivity-btn"
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
            isSensitivityOpen
              ? 'bg-purple-600 text-white shadow-md shadow-purple-950/60 ring-1 ring-purple-400/50'
              : 'text-purple-300 hover:text-white hover:bg-purple-950/60'
          }`}
          title="Toggle interactive 3D model sensitivity sliders and what-if simulation"
        >
          <span>⚡ 3D Sensitivity</span>
        </button>
      </div>
    </div>
  );
};
