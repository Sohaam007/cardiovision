import React, { useState } from 'react';
import { useStore, DissectionPlane, CardiacCyclePhase } from '../store/useStore';
import { INTERNAL_HEART_STRUCTURES } from '../data/heartAnatomyData';

export const DissectionControls: React.FC = () => {
  const isCutOpen = useStore((state) => state.isCutOpen);
  const toggleCutOpen = useStore((state) => state.toggleCutOpen);
  const setIsCutOpen = useStore((state) => state.setIsCutOpen);
  const dissectionPlane = useStore((state) => state.dissectionPlane);
  const setDissectionPlane = useStore((state) => state.setDissectionPlane);
  const cutDepth = useStore((state) => state.cutDepth);
  const setCutDepth = useStore((state) => state.setCutDepth);
  const isInvertedCut = useStore((state) => state.isInvertedCut);
  const toggleInvertCut = useStore((state) => state.toggleInvertCut);
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
    <div className="absolute top-16 right-3 sm:right-4 z-20 flex flex-col items-end gap-2 pointer-events-auto">
      {/* Primary Action Buttons Row */}
      <div className="flex items-center gap-2">
        {!force2DFallback && (
          <>
            {/* Live Cardiac Beating Motion Toggle Button */}
            <div className="relative">
              <button
                onClick={toggleBeating}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shadow-md backdrop-blur-md transition-all flex items-center gap-2 border ${
                  isBeating
                    ? 'bg-primary/20 text-primary border-primary/50 shadow-primary/20 hover:bg-primary/30 ring-1 ring-primary/40'
                    : 'bg-card/90 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                }`}
                title={isBeating ? 'Pause cardiac pumping animation' : 'Start physiological cardiac pumping animation'}
              >
                {/* Heart pulse icon */}
                <svg
                  className={`w-3.5 h-3.5 ${isBeating ? 'text-primary animate-pulse' : 'text-muted-foreground'}`}
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
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping inline-block" />
                )}
              </button>

              {/* Heartbeat Rate & Speed Dropdown Toggle */}
              <button
                onClick={() => setShowSpeedControls(!showSpeedControls)}
                className="absolute -bottom-1 -right-1 w-4 h-4 bg-secondary hover:bg-muted text-secondary-foreground rounded-full flex items-center justify-center text-[9px] border border-border"
                title="Adjust heart rate & speed"
              >
                ⚙
              </button>
            </div>

            {/* Cut Open Heart / Close Cavity (Anterior Cutaway vs Exterior Whole Heart) */}
            <button
              onClick={toggleCutOpen}
              data-testid="toggle-cut-open"
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-md backdrop-blur-md transition-all flex items-center gap-2 border ${
                isCutOpen
                  ? 'bg-primary/20 text-primary border-primary/60 shadow-primary/20 hover:bg-primary/30 ring-1 ring-primary/40'
                  : 'bg-card/90 text-foreground border-border hover:bg-muted hover:text-foreground'
              }`}
              title="Toggle cutaway interior view exposing internal ventricles, valves, and septum"
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-300 ${isCutOpen ? 'text-primary rotate-45' : 'text-muted-foreground'}`}
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
              <span>{isCutOpen ? 'Close Cavity (Whole Heart)' : 'Cut Open Heart (Internal Anatomy)'}</span>
            </button>
          </>
        )}
      </div>

      {/* Heart Rate / Motion Speed Tuning Panel */}
      {!force2DFallback && showSpeedControls && (
        <div className="bg-card/95 backdrop-blur-md border border-border rounded-2xl p-3 shadow-2xl w-64 flex flex-col gap-2.5 text-xs text-card-foreground animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between border-b border-border/80 pb-1.5">
            <span className="font-bold text-[10px] uppercase tracking-wider text-primary flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Cardiac Rate & Motion
            </span>
            <button
              onClick={() => setShowSpeedControls(false)}
              className="text-muted-foreground hover:text-foreground text-xs px-1"
            >
              ✕
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
              <span>Heart Rate:</span>
              <span className="font-mono font-bold text-primary">{heartRateBpm} BPM</span>
            </div>
            <input
              type="range"
              min="40"
              max="140"
              step="2"
              value={heartRateBpm}
              onChange={(e) => setHeartRateBpm(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
              <span>40 Brady</span>
              <span>72 Resting</span>
              <span>140 Tachy</span>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">
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
                  className={`py-1 rounded-lg text-[10px] font-medium transition-all text-center border ${
                    beatingSpeed === s.speed
                      ? 'bg-primary/20 text-primary border-primary/50 shadow-sm ring-1 ring-primary/40 font-semibold'
                      : 'bg-secondary/60 text-secondary-foreground border-border/80 hover:bg-muted hover:text-foreground'
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
        <div className="bg-card/95 backdrop-blur-md border border-border rounded-2xl p-3 shadow-2xl w-72 flex flex-col gap-2.5 text-xs text-card-foreground animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-border/80 pb-1.5">
            <span className="font-bold text-[11px] uppercase tracking-wider text-primary flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Surgical Dissection HUD
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground font-mono">{(cutDepth * 100).toFixed(0)}%</span>
              <button
                type="button"
                onClick={() => setIsCutOpen(false)}
                data-testid="close-cavity-btn"
                className="px-2 py-0.5 rounded-lg bg-secondary hover:bg-destructive/20 text-muted-foreground hover:text-destructive border border-border hover:border-destructive/40 text-[10px] font-semibold transition-colors"
                title="Close internal cavity and restore exterior whole heart"
              >
                Close Cavity
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                Dissection Plane
              </label>
              <button
                type="button"
                onClick={toggleInvertCut}
                data-testid="plane-invert"
                className={`px-2 py-0.5 rounded-lg text-[10px] font-medium transition-all flex items-center gap-1 border ${
                  isInvertedCut
                    ? 'bg-primary/20 text-primary border-primary/50 shadow-sm ring-1 ring-primary/40 font-semibold'
                    : 'bg-secondary/60 text-secondary-foreground border-border/80 hover:bg-muted hover:text-foreground'
                }`}
                title="Invert surgical cut plane normal / clipping direction"
              >
                <span>⇄ Invert</span>
                <span className={`w-1.5 h-1.5 rounded-full ${isInvertedCut ? 'bg-primary' : 'bg-muted-foreground'}`} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {planes.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setDissectionPlane(p.key)}
                  data-testid={`plane-${p.key}`}
                  className={`py-1 px-1.5 rounded-lg text-[10px] font-medium transition-all text-center border ${
                    dissectionPlane === p.key
                      ? 'bg-primary/20 text-primary border-primary/50 shadow-sm ring-1 ring-primary/40 font-semibold'
                      : 'bg-secondary/60 text-secondary-foreground border-border/80 hover:bg-muted hover:text-foreground'
                  }`}
                  title={p.desc}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
              <span>Cut Depth</span>
              <span className="font-mono text-foreground">{cutDepth < 0.35 ? 'Anterior' : cutDepth > 0.65 ? 'Posterior' : 'Mid-Cavity'}</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.02"
              value={cutDepth}
              onChange={(e) => setCutDepth(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                Wiggers Cycle Phase
              </label>
              {isBeating && (
                <span className="text-[9px] text-primary font-mono uppercase tracking-wide bg-primary/20 px-1.5 py-0.5 rounded border border-primary/40">
                  {cardiacCyclePhase}
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-1">
              {phases.map((ph) => (
                <button
                  key={ph.key}
                  onClick={() => setCardiacCyclePhase(ph.key)}
                  className={`py-1 rounded-lg text-[9px] font-medium transition-all border text-center ${
                    cardiacCyclePhase === ph.key
                      ? 'bg-primary/20 text-primary border-primary/50 shadow-sm ring-1 ring-primary/40 font-semibold'
                      : 'bg-secondary/60 text-secondary-foreground border-border/80 hover:bg-muted hover:text-foreground'
                  }`}
                  title={ph.desc}
                >
                  {ph.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1 font-medium">
              Inspect Internal Structure
            </label>
            <select
              value={selectedInternalStructure ?? ''}
              onChange={(e) => setSelectedInternalStructure(e.target.value || null)}
              className="w-full bg-secondary/80 border border-border rounded-lg px-2 py-1 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
