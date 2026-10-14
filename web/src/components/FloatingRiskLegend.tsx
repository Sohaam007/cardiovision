import React from 'react';
import { useStore } from '../store/useStore.ts';
import { PALETTES, VESSEL_PARAMS, getVesselColorHex } from '../scene/vesselConfig.ts';

export const FloatingRiskLegend: React.FC = () => {
  const colorblindMode = useStore((state) => state.colorblindMode);
  const toggleColorblindMode = useStore((state) => state.toggleColorblindMode);
  const showTorso = useStore((state) => state.showTorso);
  const toggleTorso = useStore((state) => state.toggleTorso);
  const chamberCutaway = useStore((state) => state.chamberCutaway);
  const toggleChamberCutaway = useStore((state) => state.toggleChamberCutaway);
  const heartOpacity = useStore((state) => state.heartOpacity);
  const setHeartOpacity = useStore((state) => state.setHeartOpacity);
  const setCameraPreset = useStore((state) => state.setCameraPreset);
  const isTweening = useStore((state) => state.isTweening);
  const selectedVessel = useStore((state) => state.selectedVessel);
  const setSelectedVessel = useStore((state) => state.setSelectedVessel);
  const predictions = useStore((state) => state.predictions);

  const activePalette = colorblindMode ? PALETTES.colorblind : PALETTES.standard;

  return (
    <div className="flex flex-col gap-2 pointer-events-auto">
      {/* Selected Vessel Details Card */}
      {selectedVessel && (
        <div className="bg-slate-900/90 backdrop-blur-md border border-cyan-700/70 rounded-lg p-3 shadow-2xl text-xs max-w-sm">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full shrink-0 shadow"
                style={{
                  backgroundColor: getVesselColorHex(
                    predictions?.vessels[selectedVessel]?.prob ?? 0,
                    colorblindMode
                  ),
                }}
              />
              <span className="font-bold text-white tracking-wide">
                {VESSEL_PARAMS[selectedVessel]?.fullName || selectedVessel} ({selectedVessel})
              </span>
            </div>
            <button
              onClick={() => setSelectedVessel(null)}
              className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded hover:bg-slate-800 transition-colors"
              title="Deselect vessel"
            >
              &times; Close
            </button>
          </div>
          <div className="flex items-center justify-between py-1 bg-slate-950/60 px-2 rounded border border-slate-800/60 mb-2">
            <span className="text-[11px] text-slate-300">Predicted probability of significant stenosis:</span>
            <span className="font-mono font-bold text-cyan-300 text-sm ml-2">
              {(((predictions?.vessels[selectedVessel]?.prob ?? 0) * 100)).toFixed(0)}%
            </span>
          </div>
          <p className="text-[10px] text-slate-400 leading-snug">
            {selectedVessel === 'LAD' && 'Course: Traverses the anterior interventricular groove towards cardiac apex.'}
            {selectedVessel === 'LCX' && 'Course: Wraps the left atrioventricular groove towards the posterior crux (best viewed via Left Lateral/Posterior presets).'}
            {selectedVessel === 'RCA' && 'Course: Curves through the right atrioventricular sulcus towards the inferior crux.'}
          </p>
        </div>
      )}

      {/* 1. Camera Angle Presets Toolbar */}
      <div className="bg-slate-900/85 backdrop-blur-md border border-slate-800 rounded-lg p-2 shadow-xl flex items-center gap-1.5 text-xs">
        <span className="text-[10px] uppercase font-semibold text-slate-400 px-1 hidden sm:inline">
          View:
        </span>
        <button
          onClick={() => setCameraPreset('anterior')}
          disabled={isTweening}
          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/80 transition-all font-medium text-xs disabled:opacity-50"
          title="Frontal anterior view: LAD overview and ventricular outflow"
        >
          Anterior
        </button>
        <button
          onClick={() => setCameraPreset('lateral')}
          disabled={isTweening}
          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/80 transition-all font-medium text-xs disabled:opacity-50 flex items-center gap-1"
          title="Left lateral view: Crucial to display LCX clearly along the left AV groove"
        >
          <span>Left Lateral</span>
          <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
            LCX
          </span>
        </button>
        <button
          onClick={() => setCameraPreset('posterior')}
          disabled={isTweening}
          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/80 transition-all font-medium text-xs disabled:opacity-50"
          title="Posterior view: Distal LCX trajectory and posterior crux RCA"
        >
          Posterior
        </button>
      </div>

      {/* 2. Floating Clinical Risk Legend with Mandatory Numeric Percentages */}
      <div className="bg-slate-900/85 backdrop-blur-md border border-slate-800 rounded-lg p-3 shadow-xl text-xs flex flex-col gap-2 max-w-sm">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="font-semibold text-white tracking-tight">Clinical Risk Scale</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {colorblindMode ? 'Okabe-Ito' : 'Standard'}
          </span>
        </div>

        {/* Legend swatches with numeric percentage thresholds */}
        <div className="grid grid-cols-3 gap-2 py-0.5">
          {/* Low Risk */}
          <div className="flex flex-col gap-0.5 bg-slate-950/60 p-1.5 rounded border border-slate-800/60">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                style={{ backgroundColor: activePalette.low }}
              />
              <span className="font-semibold text-slate-200 text-[11px]">Low</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono font-bold">
              &lt; 40%
            </span>
          </div>

          {/* Moderate Risk */}
          <div className="flex flex-col gap-0.5 bg-slate-950/60 p-1.5 rounded border border-slate-800/60">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                style={{ backgroundColor: activePalette.mid }}
              />
              <span className="font-semibold text-slate-200 text-[11px]">Moderate</span>
            </div>
            <span className="text-[10px] text-amber-400 font-mono font-bold">
              40% – 70%
            </span>
          </div>

          {/* High Risk */}
          <div className="flex flex-col gap-0.5 bg-slate-950/60 p-1.5 rounded border border-slate-800/60">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                style={{ backgroundColor: activePalette.high }}
              />
              <span className="font-semibold text-slate-200 text-[11px]">High</span>
            </div>
            <span className="text-[10px] text-rose-400 font-mono font-bold">
              &ge; 70%
            </span>
          </div>
        </div>

        <div className="text-[10px] text-slate-400 leading-snug">
          Vessels colored uniformly by predicted probability of significant stenosis. Never color alone: numeric percentages shown per territory.
        </div>

        {/* 3. Integrated Controls: Opacity & Torso & Colorblind Toggle */}
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/80">
          {/* Heart Opacity Slider */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-300 font-medium whitespace-nowrap">
              Heart Opacity:
            </span>
            <div className="flex items-center gap-2 flex-1 max-w-[140px]">
              <input
                type="range"
                min="0.10"
                max="1.00"
                step="0.05"
                value={heartOpacity}
                onChange={(e) => setHeartOpacity(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
              />
              <span className="font-mono text-[10px] text-slate-400 w-7 text-right">
                {(heartOpacity * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Toggles Row */}
          <div className="flex items-center justify-between gap-1.5 pt-1">
            {/* Cutaway Toggle */}
            <button
              onClick={toggleChamberCutaway}
              className={`flex-1 px-2 py-1 rounded text-[11px] font-medium border transition-colors flex items-center justify-center gap-1.5 ${
                chamberCutaway
                  ? 'bg-purple-950/80 text-purple-300 border-purple-700/60'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
              title="Toggle anatomical cutaway revealing interior ventricular cavities, septum, and chordae tendineae"
            >
              <span>Cutaway</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  chamberCutaway ? 'bg-purple-400' : 'bg-slate-600'
                }`}
              />
            </button>

            {/* Torso Toggle */}
            <button
              onClick={toggleTorso}
              className={`flex-1 px-2 py-1 rounded text-[11px] font-medium border transition-colors flex items-center justify-center gap-1.5 ${
                showTorso
                  ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              <span>Torso</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  showTorso ? 'bg-cyan-400' : 'bg-slate-600'
                }`}
              />
            </button>

            {/* Colorblind Toggle */}
            <button
              onClick={toggleColorblindMode}
              className={`flex-1 px-2 py-1 rounded text-[11px] font-medium border transition-colors flex items-center justify-center gap-1.5 ${
                colorblindMode
                  ? 'bg-amber-950/80 text-amber-300 border-amber-700/60'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              <span>Colorblind</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  colorblindMode ? 'bg-amber-400' : 'bg-slate-600'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
