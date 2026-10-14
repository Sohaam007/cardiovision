import React, { useState } from 'react';

interface BlenderTurntableEmbedProps {
  onOpenModal: () => void;
}

type TabMode = 'turntable' | 'scrubber' | 'anterior' | 'lateral' | 'posterior';

export const BlenderTurntableEmbed: React.FC<BlenderTurntableEmbedProps> = ({ onOpenModal }) => {
  const [activeTab, setActiveTab] = useState<TabMode>('turntable');
  const [frame, setFrame] = useState<number>(1);
  const totalFrames = 24;

  const currentAngleDeg = Math.round(((frame - 1) / totalFrames) * 360);

  return (
    <div className="w-full h-full relative flex flex-col items-center justify-between p-4 bg-slate-950 text-slate-100 select-none overflow-hidden">
      {/* Top Header / Mode Bar */}
      <div className="w-full max-w-xl flex items-center justify-between gap-2 z-10">
        <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-purple-800/60 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
          <span className="text-xs font-bold text-white tracking-tight">Blender 5.2 Studio Turntable</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800/50 font-mono">
            Cycles PBR
          </span>
        </div>

        <button
          onClick={onOpenModal}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-900/50 hover:bg-purple-800/80 text-purple-200 hover:text-white border border-purple-700/60 shadow-lg transition-all flex items-center gap-1.5"
          title="Open full Blender Studio viewer with video demo, high-res renders, and Draco GLB asset download"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
          <span>Expand Full Studio</span>
        </button>
      </div>

      {/* Main Visual Display */}
      <div className="relative flex-1 w-full max-w-xl flex items-center justify-center my-2">
        <div className="relative rounded-2xl overflow-hidden border border-purple-900/50 bg-gradient-to-b from-slate-900 to-black shadow-2xl w-full aspect-square max-h-[52vh] flex items-center justify-center">
          {activeTab === 'turntable' && (
            <img
              src="/blender/blender_turntable.webp"
              alt="Blender 360 turntable cardiac animation"
              className="w-full h-full object-contain p-2"
            />
          )}

          {activeTab === 'scrubber' && (
            <img
              src={`/blender/frames/frame_${String(frame).padStart(2, '0')}.png`}
              alt={`Cardiac frame ${frame} (${currentAngleDeg} deg)`}
              className="w-full h-full object-contain p-2"
            />
          )}

          {activeTab === 'anterior' && (
            <img
              src="/blender/blender_render_anterior.png"
              alt="Blender Anterior cardiac render"
              className="w-full h-full object-contain p-2"
            />
          )}

          {activeTab === 'lateral' && (
            <img
              src="/blender/blender_render_lateral.png"
              alt="Blender Lateral cardiac render"
              className="w-full h-full object-contain p-2"
            />
          )}

          {activeTab === 'posterior' && (
            <img
              src="/blender/blender_render_posterior.png"
              alt="Blender Posterior cardiac render"
              className="w-full h-full object-contain p-2"
            />
          )}

          {/* Scrubber Angle Overlay */}
          {activeTab === 'scrubber' && (
            <div className="absolute top-3 right-3 bg-slate-950/85 backdrop-blur px-2.5 py-1 rounded-md text-[11px] font-mono text-purple-300 border border-purple-800/60 shadow">
              Frame {frame}/{totalFrames} ({currentAngleDeg}&deg;)
            </div>
          )}
        </div>
      </div>

      {/* Bottom Controls / Tabs */}
      <div className="w-full max-w-xl flex flex-col gap-2 z-10">
        {/* Scrubber slider if in scrubber mode */}
        {activeTab === 'scrubber' && (
          <div className="bg-slate-900/85 backdrop-blur-md p-2.5 rounded-lg border border-slate-800 flex items-center gap-3 shadow-lg">
            <span className="text-[11px] text-slate-300 font-medium whitespace-nowrap">Angle Orbit:</span>
            <input
              type="range"
              min={1}
              max={totalFrames}
              step={1}
              value={frame}
              onChange={(e) => setFrame(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <span className="text-xs font-mono text-purple-300 min-w-[42px] text-right">
              {currentAngleDeg}&deg;
            </span>
          </div>
        )}

        {/* Sub-view selection buttons */}
        <div className="bg-slate-900/85 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 flex items-center justify-between gap-1 text-xs shadow-lg overflow-x-auto">
          <button
            onClick={() => setActiveTab('turntable')}
            className={`px-2.5 py-1 rounded-lg transition-all font-medium whitespace-nowrap flex items-center gap-1 ${
              activeTab === 'turntable'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>🔄 360&deg; Loop</span>
          </button>

          <button
            onClick={() => setActiveTab('scrubber')}
            className={`px-2.5 py-1 rounded-lg transition-all font-medium whitespace-nowrap flex items-center gap-1 ${
              activeTab === 'scrubber'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>🖐️ Scrubber</span>
          </button>

          <button
            onClick={() => setActiveTab('anterior')}
            className={`px-2.5 py-1 rounded-lg transition-all font-medium whitespace-nowrap ${
              activeTab === 'anterior'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>Anterior</span>
          </button>

          <button
            onClick={() => setActiveTab('lateral')}
            className={`px-2.5 py-1 rounded-lg transition-all font-medium whitespace-nowrap ${
              activeTab === 'lateral'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>Lateral</span>
          </button>

          <button
            onClick={() => setActiveTab('posterior')}
            className={`px-2.5 py-1 rounded-lg transition-all font-medium whitespace-nowrap ${
              activeTab === 'posterior'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>Posterior</span>
          </button>
        </div>
      </div>
    </div>
  );
};
