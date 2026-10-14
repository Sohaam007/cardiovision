import React, { useState } from 'react';
import { useStore, DissectionPlane, CardiacCyclePhase } from '../store/useStore';
import { INTERNAL_HEART_STRUCTURES } from '../data/heartAnatomyData';

export const DissectionControls: React.FC = () => {
  const isCutOpen = useStore((state) => state.isCutOpen);
  const toggleCutOpen = useStore((state) => state.toggleCutOpen);
  const dissectionPlane = useStore((state) => state.dissectionPlane);
  const setDissectionPlane = useStore((state) => state.setDissectionPlane);
  const cutDepth = useStore((state) => state.cutDepth);
  const setCutDepth = useStore((state) => state.setCutDepth);
  const selectedInternalStructure = useStore((state) => state.selectedInternalStructure);
  const setSelectedInternalStructure = useStore((state) => state.setSelectedInternalStructure);
  const cardiacCyclePhase = useStore((state) => state.cardiacCyclePhase);
  const setCardiacCyclePhase = useStore((state) => state.setCardiacCyclePhase);
  const force2DFallback = useStore((state) => state.force2DFallback);

  // Heartbeat controls
  const isBeating = useStore((state) => state.isBeating);
  const toggleBeating = useStore((state) => state.toggleBeating);
  const heartRateBpm = useStore((state) => state.heartRateBpm);
  const setHeartRateBpm = useStore((state) => state.setHeartRateBpm);
  const beatingSpeed = useStore((state) => state.beatingSpeed);
  const setBeatingSpeed = useStore((state) => state.setBeatingSpeed);

  const [showSpeedControls, setShowSpeedControls] = useState(false);

  const planes: { key: DissectionPlane; label: string; desc: string }[] = [
    { key: 'coronal', label: 'Coronal', desc: 'Frontal 4-Chamber (1308446_o.jpg coronal cut section)' },
    { key: 'short_axis', label: 'Short-Axis', desc: 'Transverse Ventricles (Basal / Mid-Cavity / Apical)' },
    { key: 'sagittal', label: 'Sagittal', desc: 'Long-Axis Outflow Tract (RVOT & LVOT)' },
  ];

  const phases: { key: CardiacCyclePhase; label: string; desc: string }[] = [
    { key: 'diastole', label: 'Diastole', desc: 'Ventricular Filling (AV valves open, rapid laminar inflow)' },
    { key: 'isovolumetric', label: 'Isovolumetric', desc: 'Isovolumetric Contraction (All valves closed, steep dP/dt)' },
    { key: 'systole', label: 'Systole', desc: 'Ventricular Ejection (Aortic & Pulmonary valves open)' },
    { key: 'relaxation', label: 'Relaxation', desc: 'Isovolumetric Relaxation (Semilunar valves snap shut, recoil)' },
  ];

  return (
    <div className="absolute top-16 right-4 z-20 flex flex-col items-end gap-2 pointer-events-auto">
      {/* Primary Action Buttons Row */}
      <div className="flex items-center gap-2">
        {!force2DFallback && (
          <>
            {/* Live Cardiac Beating Motion Toggle Button */}
            <div className="relative">
              <button
                onClick={toggleBeating}
                className={`px-3 py-2 rounded-xl text-xs font-semibold shadow-xl backdrop-blur-md transition-all flex items-center gap-2 border ${
                  isBeating
                    ? 'bg-rose-950/90 text-rose-200 border-rose-600/80 shadow-rose-950/50 hover:bg-rose-900'
                    : 'bg-slate-900/80 text-slate-400 border-slate-700/80 hover:bg-slate-800 hover:text-slate-200'
                }`}
                title={isBeating ? 'Pause cardiac pumping animation' : 'Start physiological cardiac pumping animation'}
              >
                {/* Heart pulse icon */}
                <svg
                  className={`w-4 h-4 ${isBeating ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`}
                  viewBox="0 0 24 24"
                  fill={isBeating ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                <span>{isBeating ? `${heartRateBpm} BPM Beating` : 'Paused'}</span>
                {isBeating && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
                )}
              </button>

              {/* Heartbeat Rate & Speed Dropdown Toggle */}
              <button
                onClick={() => setShowSpeedControls(!showSpeedControls)}
                className="absolute -bottom-1 -right-1 w-4 h-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full flex items-center justify-center text-[9px] border border-slate-600"
                title="Adjust heart rate & speed"
              >
                ⚙
              </button>
            </div>

            {/* Cut Open Heart (Anterior Cutaway vs Exterior Whole Heart) */}
            <button
              onClick={toggleCutOpen}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xl backdrop-blur-md transition-all flex items-center gap-2 border ${
                isCutOpen
                  ? 'bg-rose-950/90 text-rose-200 border-rose-500 shadow-rose-950/50 hover:bg-rose-900'
                  : 'bg-slate-900/80 text-slate-300 border-slate-700/80 hover:bg-slate-800 hover:text-white'
              }`}
              title="Toggle cutaway interior view exposing internal ventricles, valves, and septum"
            >
              <svg
                className={`w-4 h-4 transition-transform duration-300 ${isCutOpen ? 'text-rose-400 rotate-45' : 'text-slate-400'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.828 2.828a2 2 0 11-2.828-2.828L9 9m3 3l-7 7"
                />
              </svg>
              <span>{isCutOpen ? 'Close Exterior (Whole Heart)' : 'Cut Open Heart (Internal Anatomy)'}</span>
            </button>
          </>
        )}
      </div>

      {/* Heart Rate / Motion Speed Tuning Panel */}
      {!force2DFallback && showSpeedControls && (
        <div className="bg-slate-950/95 backdrop-blur-xl border border-slate-800 rounded-xl p-3 shadow-2xl w-64 flex flex-col gap-2 text-xs text-slate-200 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1">
            <span className="font-bold text-[10px] uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              Cardiac Rate & Motion
            </span>
            <button
              onClick={() => setShowSpeedControls(false)}
              className="text-slate-400 hover:text-white text-xs px-1"
            >
              ✕
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
              <span>Heart Rate:</span>
              <span className="font-mono font-bold text-rose-300">{heartRateBpm} BPM</span>
            </div>
            <input
              type="range"
              min="40"
              max="140"
              step="2"
              value={heartRateBpm}
              onChange={(e) => setHeartRateBpm(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
            <div className="flex justify-between text-[9px] text-slate-500 mt-0.5">
              <span>40 Brady</span>
              <span>72 Resting</span>
              <span>140 Tachy</span>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
              Simulation Speed
            </label>
            <div className="grid grid-cols-3 gap-1">
              {[
                { speed: 0.5, label: '0.5x Slow' },
                { speed: 1.0, label: '1.0x Real' },
                { speed: 1.5, label: '1.5x Fast' },
              ].map((s) => (
                <button
                  key={s.speed}
                  onClick={() => setBeatingSpeed(s.speed)}
                  className={`py-1 rounded text-[10px] font-medium transition-all text-center border ${
                    beatingSpeed === s.speed
                      ? 'bg-rose-950 text-rose-200 border-rose-500'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Dissection Controls Sub-Panel (When Heart is Cut Open) */}
      {!force2DFallback && isCutOpen && (
        <div className="bg-slate-950/90 backdrop-blur-xl border border-slate-800 rounded-xl p-3 shadow-2xl w-72 flex flex-col gap-2.5 text-xs text-slate-200 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-[11px] uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              Surgical Dissection HUD
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Depth: {(cutDepth * 100).toFixed(0)}%</span>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1 font-medium">
              Dissection Plane
            </label>
            <div className="grid grid-cols-3 gap-1">
              {planes.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setDissectionPlane(p.key)}
                  className={`py-1 px-1.5 rounded text-[10px] font-medium transition-all text-center border ${
                    dissectionPlane === p.key
                      ? 'bg-cyan-950 text-cyan-200 border-cyan-500 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                  title={p.desc}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
              <span>Cut Depth</span>
              <span className="font-mono">{cutDepth < 0.35 ? 'Anterior' : cutDepth > 0.65 ? 'Posterior' : 'Mid-Cavity'}</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.02"
              value={cutDepth}
              onChange={(e) => setCutDepth(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                Wiggers Cycle Phase
              </label>
              {isBeating && (
                <span className="text-[9px] text-rose-400 font-mono uppercase tracking-wide bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-800/60">
                  {cardiacCyclePhase}
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-1">
              {phases.map((ph) => (
                <button
                  key={ph.key}
                  onClick={() => setCardiacCyclePhase(ph.key)}
                  className={`py-1 rounded text-[9px] font-medium transition-all border text-center ${
                    cardiacCyclePhase === ph.key
                      ? 'bg-rose-950 text-rose-200 border-rose-500 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                  title={ph.desc}
                >
                  {ph.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1 font-medium">
              Inspect Internal Structure
            </label>
            <select
              value={selectedInternalStructure ?? ''}
              onChange={(e) => setSelectedInternalStructure(e.target.value || null)}
              className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="">-- Click 3D Pin or Select --</option>
              {Object.values(INTERNAL_HEART_STRUCTURES).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};
