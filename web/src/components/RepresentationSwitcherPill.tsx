import React from 'react';
import { useStore } from '../store/useStore';

export const RepresentationSwitcherPill: React.FC = () => {
  const viewerMode = useStore((state) => state.viewerMode);
  const setViewerMode = useStore((state) => state.setViewerMode);

  // In-viewport representation switcher is active for 3D cardiac modes
  if (viewerMode !== 'realistic' && viewerMode !== 'procedural') {
    return null;
  }

  return (
    <div
      className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto select-none"
      data-testid="representation-switcher-pill"
    >
      <div className="flex items-center bg-[#090d16]/85 backdrop-blur-xl p-1 rounded-full border border-slate-700/80 shadow-2xl">
        <button
          type="button"
          onClick={() => setViewerMode('realistic')}
          data-testid="pill-realistic-btn"
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
            viewerMode === 'realistic'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-950/60 ring-1 ring-rose-400/50'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
          title="Switch to photorealistic Blender beating heart model (beating_heart.glb)"
        >
          <span>🫀 Blender Photorealistic</span>
        </button>

        <button
          type="button"
          onClick={() => setViewerMode('procedural')}
          data-testid="pill-procedural-btn"
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
            viewerMode === 'procedural'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/60 ring-1 ring-cyan-400/50'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
          title="Switch to procedural 3D heart with surgical dissection and internal anatomy"
        >
          <span>⚙️ Procedural Anatomy</span>
        </button>
      </div>
    </div>
  );
};
