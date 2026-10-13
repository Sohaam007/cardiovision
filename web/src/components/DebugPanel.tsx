import React from 'react';
import { useStore, VesselKey } from '../store/useStore';
import {
  VESSEL_PARAMS,
  getVesselColorHex,
  getRiskTier,
  PALETTES,
} from '../scene/vesselConfig';

export const DebugPanel: React.FC = () => {
  const prediction = useStore((state) => state.prediction);
  const colorblindMode = useStore((state) => state.colorblindMode);
  const showTorso = useStore((state) => state.showTorso);
  const heartOpacity = useStore((state) => state.heartOpacity);
  const selectedVessel = useStore((state) => state.selectedVessel);

  const setVesselProbability = useStore((state) => state.setVesselProbability);
  const toggleColorblindMode = useStore((state) => state.toggleColorblindMode);
  const toggleTorso = useStore((state) => state.toggleTorso);
  const setHeartOpacity = useStore((state) => state.setHeartOpacity);
  const setSelectedVessel = useStore((state) => state.setSelectedVessel);
  const setCameraPreset = useStore((state) => state.setCameraPreset);
  const resetDemoProbabilities = useStore((state) => state.resetDemoProbabilities);

  const vesselKeys: VesselKey[] = ['LAD', 'LCX', 'RCA'];

  const setScenario = (lad: number, lcx: number, rca: number) => {
    setVesselProbability('LAD', lad);
    setVesselProbability('LCX', lcx);
    setVesselProbability('RCA', rca);
  };

  return (
    <div className="w-full lg:w-96 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-4 flex flex-col gap-4 shadow-2xl text-slate-100 max-h-[calc(100vh-6rem)] overflow-y-auto">
      {/* Header */}
      <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
            Diagnostic Controls
          </h2>
          <p className="text-xs text-slate-400">Real-time risk simulation & 3D controls</p>
        </div>
        <button
          onClick={resetDemoProbabilities}
          className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          title="Reset to default baseline"
        >
          Reset
        </button>
      </div>

      {/* Vessel Sliders */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs font-medium text-slate-400 uppercase tracking-wider">
          <span>Stenosis Probability by Territory</span>
          <span className="text-[10px] text-slate-500 font-normal">Uniform per-vessel</span>
        </div>

        {vesselKeys.map((key) => {
          const prob = prediction.vessels[key]?.prob ?? 0.5;
          const param = VESSEL_PARAMS[key];
          const colorHex = getVesselColorHex(prob, colorblindMode);
          const risk = getRiskTier(prob);
          const isSelected = selectedVessel === key;

          return (
            <div
              key={key}
              onClick={() => setSelectedVessel(isSelected ? null : key)}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-800/80 border-cyan-500/50 shadow-sm'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-inner shrink-0"
                    style={{ backgroundColor: colorHex }}
                  />
                  <div>
                    <span className="font-semibold text-sm text-white mr-1.5">{key}</span>
                    <span className="text-[11px] text-slate-400 hidden sm:inline">
                      {param.fullName}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${risk.badgeClass}`}>
                    {risk.label}
                  </span>
                  <span
                    className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-slate-800/80"
                    style={{ color: colorHex }}
                  >
                    {(prob * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Slider */}
              <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                <span className="text-[10px] font-mono text-slate-500">0%</span>
                <input
                  type="range"
                  min="0.00"
                  max="1.00"
                  step="0.01"
                  value={prob}
                  onChange={(e) => setVesselProbability(key, parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
                />
                <span className="text-[10px] font-mono text-slate-500">100%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Scenarios */}
      <div className="flex flex-col gap-1.5 pt-1">
        <label className="text-xs font-medium text-slate-400">Quick Clinical Presets</label>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => setScenario(0.74, 0.31, 0.52)}
            className="px-2 py-1.5 text-xs rounded bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 transition-colors"
          >
            Demo Patient
          </button>
          <button
            onClick={() => setScenario(0.15, 0.20, 0.18)}
            className="px-2 py-1.5 text-xs rounded bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 transition-colors"
          >
            All Low Risk
          </button>
          <button
            onClick={() => setScenario(0.88, 0.82, 0.91)}
            className="px-2 py-1.5 text-xs rounded bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 transition-colors"
          >
            Triple Vessel
          </button>
        </div>
      </div>

      {/* Camera Angle Presets */}
      <div className="flex flex-col gap-1.5 pt-1">
        <label className="text-xs font-medium text-slate-400">Camera Perspectives</label>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => setCameraPreset('anterior')}
            className="px-2 py-1.5 text-xs rounded bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 transition-colors flex items-center justify-center gap-1"
          >
            Anterior
          </button>
          <button
            onClick={() => setCameraPreset('lateral')}
            className="px-2 py-1.5 text-xs rounded bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 transition-colors flex items-center justify-center gap-1"
            title="Inspect LCX along left lateral border"
          >
            Left Lateral
          </button>
          <button
            onClick={() => setCameraPreset('posterior')}
            className="px-2 py-1.5 text-xs rounded bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 transition-colors flex items-center justify-center gap-1"
            title="Inspect distal LCX & posterior crux RCA"
          >
            Posterior
          </button>
        </div>
      </div>

      {/* Display & Accessibility Controls */}
      <div className="flex flex-col gap-3 pt-2 border-t border-slate-800">
        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          Accessibility & Appearance
        </label>

        {/* Colorblind Toggle */}
        <div className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
          <div>
            <div className="text-xs font-medium text-white">Colorblind Palette</div>
            <div className="text-[11px] text-slate-400">Blue &bull; Orange &bull; Magenta</div>
          </div>
          <div className="flex items-center gap-2">
            {/* Color chips preview */}
            <div className="flex items-center gap-1 mr-1">
              {colorblindMode ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PALETTES.colorblind.low }} />
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PALETTES.colorblind.mid }} />
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PALETTES.colorblind.high }} />
                </>
              ) : (
                <>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PALETTES.standard.low }} />
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PALETTES.standard.mid }} />
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PALETTES.standard.high }} />
                </>
              )}
            </div>

            <button
              onClick={toggleColorblindMode}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                colorblindMode ? 'bg-cyan-500' : 'bg-slate-700'
              }`}
              role="switch"
              aria-checked={colorblindMode}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  colorblindMode ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Torso Shell Toggle */}
        <div className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
          <div>
            <div className="text-xs font-medium text-white">Thoracic Shell</div>
            <div className="text-[11px] text-slate-400">Low-poly translucent torso</div>
          </div>
          <button
            onClick={toggleTorso}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              showTorso ? 'bg-cyan-500' : 'bg-slate-700'
            }`}
            role="switch"
            aria-checked={showTorso}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                showTorso ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Heart Opacity Slider */}
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-white">Heart Wall Opacity</span>
            <span className="font-mono text-slate-400">{(heartOpacity * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0.10"
            max="1.00"
            step="0.05"
            value={heartOpacity}
            onChange={(e) => setHeartOpacity(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
};
