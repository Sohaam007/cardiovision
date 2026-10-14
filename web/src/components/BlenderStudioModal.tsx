import React, { useState, useEffect } from 'react';

interface BlenderStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'turntable' | 'scrubber' | 'anterior' | 'lateral' | 'posterior';

export const BlenderStudioModal: React.FC<BlenderStudioModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('turntable');
  const [scrubberFrame, setScrubberFrame] = useState<number>(1);
  const totalFrames = 24;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="bg-slate-900 border border-purple-800/60 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl shadow-purple-950/50 overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-700 flex items-center justify-center shadow-md">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">Blender 5.2 Medical Studio Viewer</h2>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-700/60">
                  PBR Offline Rendering
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Photorealistic 3D myocardium with subsurface scattering and 3-point medical lighting
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close modal (Esc)"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-800 bg-slate-900/40 text-xs font-medium overflow-x-auto">
          <button
            onClick={() => setActiveTab('turntable')}
            className={`px-3 py-2 rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'turntable'
                ? 'border-purple-500 text-purple-300 bg-purple-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🔄 360° Turntable Loop</span>
          </button>
          <button
            onClick={() => setActiveTab('scrubber')}
            className={`px-3 py-2 rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'scrubber'
                ? 'border-purple-500 text-purple-300 bg-purple-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🖐️ Interactive 360° Scrub</span>
          </button>
          <button
            onClick={() => setActiveTab('anterior')}
            className={`px-3 py-2 rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'anterior'
                ? 'border-purple-500 text-purple-300 bg-purple-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Anterior (LAD 94%)</span>
          </button>
          <button
            onClick={() => setActiveTab('lateral')}
            className={`px-3 py-2 rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'lateral'
                ? 'border-purple-500 text-purple-300 bg-purple-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Left Lateral (LCX 24%)</span>
          </button>
          <button
            onClick={() => setActiveTab('posterior')}
            className={`px-3 py-2 rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'posterior'
                ? 'border-purple-500 text-purple-300 bg-purple-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Posterior Crux (RCA 28%)</span>
          </button>
        </div>

        {/* Modal Body / Active Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center">
          {activeTab === 'turntable' && (
            <div className="w-full flex flex-col items-center gap-4">
              <div className="relative rounded-xl overflow-hidden border border-purple-900/60 shadow-xl bg-black max-w-2xl w-full aspect-video flex items-center justify-center">
                <img
                  src="/blender/blender_turntable.webp"
                  alt="Blender 3D Procedural Cardiac Turntable 360-degree animation"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="text-center max-w-lg">
                <p className="text-xs text-slate-300 font-medium">
                  360° Looping Turntable Animation (24 key angles, 116 KB WebP asset)
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Features high-contrast PBR shaders with continuous linear risk color interpolation calibrated to Patient #002.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'scrubber' && (
            <div className="w-full flex flex-col items-center gap-4">
              <div className="relative rounded-xl overflow-hidden border border-purple-900/60 shadow-xl bg-black max-w-2xl w-full aspect-video flex items-center justify-center select-none">
                <img
                  src={`/blender/frames/frame_${String(scrubberFrame).padStart(2, '0')}.png`}
                  alt={`Turntable Frame ${scrubberFrame}`}
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded text-[11px] font-mono text-purple-300 border border-purple-800">
                  Angle: {Math.round((scrubberFrame / totalFrames) * 360)}° (Frame {scrubberFrame}/{totalFrames})
                </div>
              </div>

              {/* Slider Control */}
              <div className="w-full max-w-md flex flex-col gap-1.5 px-4">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Anterior (0°)</span>
                  <span>Lateral (90°)</span>
                  <span>Posterior (180°)</span>
                  <span>Anterior (360°)</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={totalFrames}
                  value={scrubberFrame}
                  onChange={(e) => setScrubberFrame(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-ew-resize accent-purple-500"
                />
                <p className="text-center text-[11px] text-slate-400 mt-1">
                  Drag the slider to manually rotate the heart and inspect vessel trajectories from any perspective.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'anterior' && (
            <div className="w-full flex flex-col items-center gap-3">
              <div className="relative rounded-xl overflow-hidden border border-slate-800 shadow-xl bg-black max-w-2xl w-full aspect-video flex items-center justify-center">
                <img
                  src="/blender/blender_render_anterior.png"
                  alt="Anterior Clinical Render - LAD 94% Crimson"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="text-center max-w-lg">
                <span className="inline-block px-2.5 py-0.5 rounded text-xs font-semibold bg-rose-950 text-rose-300 border border-rose-700/60 mb-1">
                  LAD: 94% (High Risk)
                </span>
                <p className="text-xs text-slate-300">
                  Anterior view highlights the Left Anterior Descending artery descending the anterior interventricular groove to the apex.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'lateral' && (
            <div className="w-full flex flex-col items-center gap-3">
              <div className="relative rounded-xl overflow-hidden border border-slate-800 shadow-xl bg-black max-w-2xl w-full aspect-video flex items-center justify-center">
                <img
                  src="/blender/blender_render_lateral.png"
                  alt="Left Lateral Clinical Render - LCX 24% Emerald"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="text-center max-w-lg">
                <span className="inline-block px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-700/60 mb-1">
                  LCX: 24% (Low Risk)
                </span>
                <p className="text-xs text-slate-300">
                  Left lateral view showcases the Left Circumflex artery curving along the left atrioventricular groove.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'posterior' && (
            <div className="w-full flex flex-col items-center gap-3">
              <div className="relative rounded-xl overflow-hidden border border-slate-800 shadow-xl bg-black max-w-2xl w-full aspect-video flex items-center justify-center">
                <img
                  src="/blender/blender_render_posterior.png"
                  alt="Posterior Crux Clinical Render - RCA 28% Emerald"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="text-center max-w-lg">
                <span className="inline-block px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-700/60 mb-1">
                  RCA: 28% (Low Risk)
                </span>
                <p className="text-xs text-slate-300">
                  Posterior view visualizes the crux cordis and the distal segments of the Right Coronary Artery.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer & Actions */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="text-amber-400 font-medium">Clinical Invariant:</span>
            <span>Uniform vessel-level coloration &bull; Zero focal lesion claims</span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/blender/cardiac_model.glb"
              download="cardiac_model.glb"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors font-medium"
            >
              <svg className="w-3.5 h-3.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Download 3D Asset (.glb, 318 KB)</span>
            </a>

            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
