import React from 'react';
import { useStore } from '../store/useStore.ts';
import { getVesselColorHex, PALETTES } from '../scene/vesselConfig.ts';

export const WebGLFallback: React.FC = () => {
  const predictions = useStore((state) => state.predictions);
  const colorblindMode = useStore((state) => state.colorblindMode);
  const selectedVessel = useStore((state) => state.selectedVessel);
  const setSelectedVessel = useStore((state) => state.setSelectedVessel);
  const setForce2DFallback = useStore((state) => state.setForce2DFallback);
  const setWebglError = useStore((state) => state.setWebglError);

  const ladProb = predictions?.vessels?.LAD?.prob ?? 0.74;
  const lcxProb = predictions?.vessels?.LCX?.prob ?? 0.31;
  const rcaProb = predictions?.vessels?.RCA?.prob ?? 0.52;

  const ladColor = getVesselColorHex(ladProb, colorblindMode);
  const lcxColor = getVesselColorHex(lcxProb, colorblindMode);
  const rcaColor = getVesselColorHex(rcaProb, colorblindMode);

  const activePalette = colorblindMode ? PALETTES.colorblind : PALETTES.standard;

  const handleRetry3D = () => {
    setForce2DFallback(false);
    setWebglError(false);
  };

  return (
    <div className="w-full h-full relative flex flex-col items-center justify-between p-6 bg-slate-950 text-slate-100 select-none overflow-hidden">
      {/* 1. Advisory Banner */}
      <div className="w-full max-w-xl bg-amber-950/80 border border-amber-600/60 rounded-lg p-3 text-amber-200 text-xs shadow-lg flex items-start gap-3 z-10">
        <svg
          className="w-5 h-5 text-amber-400 shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-amber-300">
              WebGL 3D Viewer Unavailable &bull; 2D Coronary Schematic Active
            </span>
            <button
              onClick={handleRetry3D}
              className="text-[10px] px-2 py-0.5 bg-amber-900/80 hover:bg-amber-800 rounded border border-amber-600 text-amber-100 transition-colors"
            >
              Retry 3D
            </button>
          </div>
          <p className="text-[11px] text-amber-200/90 mt-1 leading-snug">
            3D WebGL context is disabled or unaccelerated. Rendering calibrated 2D anatomical schematic.
            Predictions, calibrated log-odds explainability, and interactive vessel selection remain fully functional.
          </p>
        </div>
      </div>

      {/* 2. Interactive 2D Anatomical SVG Schematic */}
      <div className="flex-1 w-full max-w-lg flex items-center justify-center relative my-2">
        <svg
          viewBox="0 0 500 460"
          className="w-full h-full max-h-[380px] drop-shadow-2xl"
          style={{ filter: 'drop-shadow(0 10px 25px rgba(0,0,0,0.5))' }}
        >
          <defs>
            {/* Heart Muscle Gradient */}
            <radialGradient id="myoGrad" cx="45%" cy="40%" r="65%">
              <stop offset="0%" stopColor="#334155" stopOpacity="0.85" />
              <stop offset="60%" stopColor="#1e293b" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="1" />
            </radialGradient>
            {/* Aorta Arch Gradient */}
            <linearGradient id="aortaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
          </defs>

          {/* Heart Silhouette */}
          <path
            d="M 250 80 
               C 310 40, 390 90, 370 180 
               C 355 250, 310 320, 245 410 
               C 185 320, 130 250, 120 180 
               C 105 90, 185 40, 250 80 Z"
            fill="url(#myoGrad)"
            stroke="#475569"
            strokeWidth="2.5"
            strokeDasharray="4 2"
          />

          {/* Aortic Root / Great Vessels Outline */}
          <path
            d="M 220 80 C 220 30, 280 30, 280 80"
            fill="none"
            stroke="url(#aortaGrad)"
            strokeWidth="18"
            strokeLinecap="round"
          />

          {/* Left Main (LM) Trunk */}
          <path
            d="M 265 95 Q 285 110 305 125"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="7"
            strokeLinecap="round"
          />

          {/* LAD: Anterior Interventricular Groove */}
          <g
            className="cursor-pointer group"
            onClick={() => setSelectedVessel(selectedVessel === 'LAD' ? null : 'LAD')}
          >
            {/* Invisible Thick Click Target */}
            <path
              d="M 305 125 Q 295 190 275 260 T 245 405"
              fill="none"
              stroke="transparent"
              strokeWidth="24"
              strokeLinecap="round"
            />
            {/* Visible Vessel Tube */}
            <path
              d="M 305 125 Q 295 190 275 260 T 245 405"
              fill="none"
              stroke={ladColor}
              strokeWidth={selectedVessel === 'LAD' ? '9' : '6'}
              strokeLinecap="round"
              className="transition-all duration-300"
            />
          </g>

          {/* LCX: Left Circumflex Artery */}
          <g
            className="cursor-pointer group"
            onClick={() => setSelectedVessel(selectedVessel === 'LCX' ? null : 'LCX')}
          >
            {/* Invisible Thick Click Target */}
            <path
              d="M 305 125 Q 355 150 365 200 T 340 270"
              fill="none"
              stroke="transparent"
              strokeWidth="24"
              strokeLinecap="round"
            />
            {/* Visible Vessel Tube */}
            <path
              d="M 305 125 Q 355 150 365 200 T 340 270"
              fill="none"
              stroke={lcxColor}
              strokeWidth={selectedVessel === 'LCX' ? '9' : '6'}
              strokeLinecap="round"
              strokeDasharray="6 3"
              className="transition-all duration-300"
            />
          </g>

          {/* RCA: Right Coronary Artery */}
          <g
            className="cursor-pointer group"
            onClick={() => setSelectedVessel(selectedVessel === 'RCA' ? null : 'RCA')}
          >
            {/* Invisible Thick Click Target */}
            <path
              d="M 235 95 Q 170 140 160 210 T 190 320"
              fill="none"
              stroke="transparent"
              strokeWidth="24"
              strokeLinecap="round"
            />
            {/* Visible Vessel Tube */}
            <path
              d="M 235 95 Q 170 140 160 210 T 190 320"
              fill="none"
              stroke={rcaColor}
              strokeWidth={selectedVessel === 'RCA' ? '9' : '6'}
              strokeLinecap="round"
              className="transition-all duration-300"
            />
          </g>

          {/* Interactive Vessel Badges & Labels */}
          {/* RCA Badge (Left side anatomically) */}
          <g
            className="cursor-pointer"
            onClick={() => setSelectedVessel(selectedVessel === 'RCA' ? null : 'RCA')}
          >
            <rect
              x="50"
              y="190"
              width="100"
              height="44"
              rx="6"
              fill="#0f172a"
              stroke={selectedVessel === 'RCA' ? '#38bdf8' : '#334155'}
              strokeWidth={selectedVessel === 'RCA' ? '2' : '1'}
            />
            <circle cx="68" cy="212" r="5" fill={rcaColor} />
            <text x="80" y="208" fill="#f8fafc" fontSize="12" fontWeight="bold">
              RCA
            </text>
            <text x="80" y="224" fill="#94a3b8" fontSize="11" fontFamily="monospace">
              {(rcaProb * 100).toFixed(0)}%
            </text>
          </g>

          {/* LAD Badge (Center-right apex) */}
          <g
            className="cursor-pointer"
            onClick={() => setSelectedVessel(selectedVessel === 'LAD' ? null : 'LAD')}
          >
            <rect
              x="260"
              y="320"
              width="100"
              height="44"
              rx="6"
              fill="#0f172a"
              stroke={selectedVessel === 'LAD' ? '#38bdf8' : '#334155'}
              strokeWidth={selectedVessel === 'LAD' ? '2' : '1'}
            />
            <circle cx="278" cy="342" r="5" fill={ladColor} />
            <text x="290" y="338" fill="#f8fafc" fontSize="12" fontWeight="bold">
              LAD
            </text>
            <text x="290" y="354" fill="#94a3b8" fontSize="11" fontFamily="monospace">
              {(ladProb * 100).toFixed(0)}%
            </text>
          </g>

          {/* LCX Badge (Far right AV groove) */}
          <g
            className="cursor-pointer"
            onClick={() => setSelectedVessel(selectedVessel === 'LCX' ? null : 'LCX')}
          >
            <rect
              x="360"
              y="180"
              width="100"
              height="44"
              rx="6"
              fill="#0f172a"
              stroke={selectedVessel === 'LCX' ? '#38bdf8' : '#334155'}
              strokeWidth={selectedVessel === 'LCX' ? '2' : '1'}
            />
            <circle cx="378" cy="202" r="5" fill={lcxColor} />
            <text x="390" y="198" fill="#f8fafc" fontSize="12" fontWeight="bold">
              LCX
            </text>
            <text x="390" y="214" fill="#94a3b8" fontSize="11" fontFamily="monospace">
              {(lcxProb * 100).toFixed(0)}%
            </text>
          </g>
        </svg>
      </div>

      {/* 3. Bottom Legend Strip */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-lg p-3 flex items-center justify-between text-xs z-10">
        <span className="text-[11px] font-semibold text-slate-300">Stenosis Risk Scale:</span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activePalette.low }} />
            <span className="text-slate-400 font-mono text-[10px]">&lt; 40%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activePalette.mid }} />
            <span className="text-slate-400 font-mono text-[10px]">40–70%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activePalette.high }} />
            <span className="text-slate-400 font-mono text-[10px]">&ge; 70%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
