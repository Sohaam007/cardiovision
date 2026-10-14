import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useStore } from '../store/useStore.ts';
import { getVesselColorHex, VESSEL_PARAMS } from '../scene/vesselConfig.ts';

// ---------------------------------------------------------------------------
// Web Audio API Synthesizer for Synchronized Physiological Heart Sounds (S1/S2)
// ---------------------------------------------------------------------------
class CardiacAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = true;

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (!muted && !this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended' && !muted) {
      this.ctx.resume();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // S1: "Lub" - Mitral/Tricuspid valve closure (resonant ~80Hz with gentle decay)
  public playS1() {
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
      // Audio playback fails gracefully if context locked
    }
  }

  // S2: "Dub" - Aortic/Pulmonary valve closure (~115Hz, shorter, crisper)
  public playS2() {
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(115, now);
      osc.frequency.exponentialRampToValueAtTime(65, now + 0.09);

      gain.gain.setValueAtTime(0.20, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // Audio playback fails gracefully
    }
  }
}

// Global audio synthesizer instance
const audioSynth = new CardiacAudioSynthesizer();

export const WebGLFallback: React.FC = () => {
  // Global Store Bindings
  const predictions = useStore((state) => state.predictions);
  const colorblindMode = useStore((state) => state.colorblindMode);
  const selectedVessel = useStore((state) => state.selectedVessel);
  const setSelectedVessel = useStore((state) => state.setSelectedVessel);
  const setForce2DFallback = useStore((state) => state.setForce2DFallback);
  const force2DFallback = useStore((state) => state.force2DFallback);
  const webglError = useStore((state) => state.webglError);
  const setWebglError = useStore((state) => state.setWebglError);
  const cameraPreset = useStore((state) => state.cameraPreset) || 'anterior';
  const setCameraPreset = useStore((state) => state.setCameraPreset);
  const patientInputs = useStore((state) => state.patientInputs);

  // Local State: Options & Controls
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [cardiacPhase, setCardiacPhase] = useState<'auto' | 'diastole' | 'systole'>('auto');
  const [showHemodynamics, setShowHemodynamics] = useState<boolean>(true);
  const [showChambers, setShowChambers] = useState<boolean>(false);
  const [showTerritories, setShowTerritories] = useState<boolean>(true);
  const [showECG, setShowECG] = useState<boolean>(true);
  const [showCalibers, setShowCalibers] = useState<boolean>(true);
  const [fluoroscopyMode, setFluoroscopyMode] = useState<boolean>(false);
  const [isAudioActive, setIsAudioActive] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  // Patient Physiological Vitals
  const rawPulseRate = Number(patientInputs['PR'] || 75);
  const pulseRate = Math.max(45, Math.min(160, isNaN(rawPulseRate) ? 75 : rawPulseRate));
  const ejectionFraction = Number(patientInputs['EF-TTE'] || 50);
  const systolicBP = Number(patientInputs['BP'] || 120);
  const hasSTElevation = Boolean(patientInputs['ST_Elevation']);
  const hasSTDepression = Boolean(patientInputs['ST_Depression']);
  const hasTInversion = Boolean(patientInputs['T_Inversion']);

  // Dynamic Cardiac Period in seconds
  const beatPeriod = 60 / pulseRate; // e.g. 0.8s at 75 BPM

  // Continuous animation phase tracker (0 to 1)
  const [phaseTime, setPhaseTime] = useState<number>(0);
  const [flowOffset, setFlowOffset] = useState<number>(0);
  const lastSoundRef = useRef<'none' | 's1' | 's2'>('none');
  const animFrameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number>(0);

  // Calibrated Target Risk Probabilities
  const ladProb = predictions?.vessels?.LAD?.prob ?? 0.74;
  const lcxProb = predictions?.vessels?.LCX?.prob ?? 0.31;
  const rcaProb = predictions?.vessels?.RCA?.prob ?? 0.52;
  const overallCADProb = predictions?.cad?.prob ?? 0.88;

  // Calibrated Vessel Colors
  const ladColor = getVesselColorHex(ladProb, colorblindMode);
  const lcxColor = getVesselColorHex(lcxProb, colorblindMode);
  const rcaColor = getVesselColorHex(rcaProb, colorblindMode);

  // Audio Toggle Handler
  const toggleAudio = () => {
    const nextState = !isAudioActive;
    setIsAudioActive(nextState);
    audioSynth.setMuted(!nextState);
  };

  // Animation Loop: Updates cardiac cycle contraction and hemodynamic flow
  useEffect(() => {
    let currentFlow = 0;

    const animate = (timestamp: number) => {
      if (!lastTimestampRef.current) lastTimestampRef.current = timestamp;
      const delta = (timestamp - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = timestamp;

      if (isPlaying) {
        if (cardiacPhase === 'auto') {
          setPhaseTime((prev) => {
            const next = (prev + delta / beatPeriod) % 1.0;

            // Trigger S1 valve closure at onset of systole (t ~ 0.05)
            if (next >= 0.04 && next <= 0.12 && lastSoundRef.current !== 's1') {
              audioSynth.playS1();
              lastSoundRef.current = 's1';
            }
            // Trigger S2 valve closure at onset of diastole (t ~ 0.38)
            else if (next >= 0.36 && next <= 0.44 && lastSoundRef.current !== 's2') {
              audioSynth.playS2();
              lastSoundRef.current = 's2';
            }
            // Reset trigger state for next cycle
            else if (next > 0.50 && next < 0.90) {
              lastSoundRef.current = 'none';
            }

            return next;
          });
        } else if (cardiacPhase === 'systole') {
          setPhaseTime(0.18); // Peak systole
        } else if (cardiacPhase === 'diastole') {
          setPhaseTime(0.65); // Full diastolic filling
        }

        // Hemodynamic stream dash offset advances faster during diastole
        // Coronary flow occurs primarily during ventricular diastole (clinical rule)
        const isDiastole = phaseTime >= 0.35;
        const coronaryFlowMultiplier = isDiastole ? 2.8 : 0.7;
        currentFlow -= delta * 90 * coronaryFlowMultiplier;
        setFlowOffset(currentFlow);
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, cardiacPhase, beatPeriod, phaseTime]);

  // Contraction scale calculation (Systole contracts inward by amplitude modulated by Ejection Fraction)
  const contractionScale = useMemo(() => {
    if (cardiacPhase === 'systole') return 1.0 - (ejectionFraction / 100) * 0.12;
    if (cardiacPhase === 'diastole') return 1.0;

    // Normalizing systole (0.00 - 0.35 of cycle)
    if (phaseTime <= 0.35) {
      const sysProgress = phaseTime / 0.35;
      const wave = Math.sin(sysProgress * Math.PI);
      const amplitude = (ejectionFraction / 100) * 0.14; // Low EF = sluggish contraction
      return 1.0 - wave * amplitude;
    }
    // Diastolic rapid recoil and relaxation
    if (phaseTime <= 0.50) {
      const relProgress = (phaseTime - 0.35) / 0.15;
      return 1.0 - (1 - relProgress) * 0.03;
    }
    // Baseline resting diastole
    return 1.0;
  }, [phaseTime, cardiacPhase, ejectionFraction]);

  // Handle Retry 3D action
  const handleRetry3D = () => {
    setForce2DFallback(false);
    setWebglError(false);
  };

  // Active vessel inspection details
  const activeVesselProb = selectedVessel
    ? predictions?.vessels?.[selectedVessel]?.prob ?? 0.5
    : 0;
  const activeVesselColor = selectedVessel
    ? getVesselColorHex(activeVesselProb, colorblindMode)
    : '#94a3b8';

  return (
    <div
      className={`w-full h-full relative flex flex-col justify-between p-4 select-none overflow-hidden transition-colors duration-500 ${
        fluoroscopyMode ? 'bg-slate-100 text-slate-900' : 'bg-slate-950 text-slate-100'
      }`}
    >
      {/* 1. Header Toolbar: Mode advisory, View Angle Presets, and X-Ray Toggle */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2 z-20">
        {/* Left: Status / Advisory Banner */}
        <div className="flex items-center gap-2">
          {webglError || force2DFallback ? (
            <div className="bg-amber-950/90 border border-amber-600/70 rounded-lg px-3 py-1.5 text-xs text-amber-200 flex items-center gap-2 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="font-semibold text-amber-300">2D Fallback Mode Active</span>
              <button
                onClick={handleRetry3D}
                className="ml-2 px-2 py-0.5 bg-amber-900/90 hover:bg-amber-800 text-[11px] rounded border border-amber-500 font-medium transition-colors"
              >
                Retry 3D
              </button>
            </div>
          ) : (
            <div
              className={`border rounded-lg px-3 py-1.5 text-xs flex items-center gap-2 shadow-lg ${
                fluoroscopyMode
                  ? 'bg-white border-slate-300 text-slate-800'
                  : 'bg-slate-900/90 border-slate-800 text-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="font-semibold tracking-wide">
                2D Clinical Angiogram & Hemodynamic Suite
              </span>
              <span className="text-[11px] text-slate-400 pl-2 border-l border-slate-700">
                Overall CAD: <strong className="text-cyan-300 font-mono">{(overallCADProb * 100).toFixed(0)}%</strong>
              </span>
            </div>
          )}
        </div>

        {/* Right: View Projections & X-Ray Fluoroscopy Mode */}
        <div className="flex items-center gap-1.5">
          {/* Projection Presets */}
          <div
            className={`border rounded-lg p-1 flex items-center gap-1 text-xs shadow-md ${
              fluoroscopyMode
                ? 'bg-slate-200 border-slate-300 text-slate-700'
                : 'bg-slate-900/90 border-slate-800 text-slate-300'
            }`}
          >
            <span className="text-[10px] font-semibold uppercase px-1 text-slate-400">View:</span>
            <button
              onClick={() => setCameraPreset('anterior')}
              className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                cameraPreset === 'anterior'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'hover:bg-slate-800/40'
              }`}
              title="Frontal Anterior View (AP / RAO)"
            >
              Anterior
            </button>
            <button
              onClick={() => setCameraPreset('lateral')}
              className={`px-2 py-1 rounded text-xs font-medium transition-all flex items-center gap-1 ${
                cameraPreset === 'lateral'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'hover:bg-slate-800/40'
              }`}
              title="Left Lateral View (LAO Cranial - LCX Groove)"
            >
              <span>Left Lateral</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-950 text-cyan-300 font-mono">
                LCX
              </span>
            </button>
            <button
              onClick={() => setCameraPreset('posterior')}
              className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                cameraPreset === 'posterior'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'hover:bg-slate-800/40'
              }`}
              title="Posterior Crux View (PA / Caudal - RCA PDA)"
            >
              Posterior
            </button>
          </div>

          {/* Fluoroscopy Cine Angiogram Mode Button */}
          <button
            onClick={() => setFluoroscopyMode(!fluoroscopyMode)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 shadow-md ${
              fluoroscopyMode
                ? 'bg-amber-600 text-white border-amber-500 shadow-amber-900/40'
                : 'bg-slate-900/90 border-slate-700 text-slate-200 hover:text-white hover:border-slate-600'
            }`}
            title="Toggle Cath-Lab Cine Fluoroscopy X-Ray radiographic contrast mode"
          >
            <span>{fluoroscopyMode ? '⚡ Exit X-Ray' : '⚡ Fluoroscopy X-Ray'}</span>
          </button>
        </div>
      </div>

      {/* 2. Interactive SVG Canvas & Overlay HUD Container */}
      <div className="flex-1 w-full relative flex items-center justify-center my-2 min-h-0 overflow-hidden">
        {/* Floating Layer Controls (Top Left) */}
        <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-1.5 max-w-[260px]">
          <button
            onClick={() => setShowHemodynamics(!showHemodynamics)}
            className={`px-2 py-1 rounded-md text-[11px] font-medium border transition-colors flex items-center gap-1 shadow-sm ${
              showHemodynamics
                ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60'
                : 'bg-slate-900/70 text-slate-400 border-slate-800'
            }`}
            title="Toggle hemodynamic blood flow velocity stream pulses"
          >
            <span>🌊 Flow</span>
          </button>

          <button
            onClick={() => setShowChambers(!showChambers)}
            className={`px-2 py-1 rounded-md text-[11px] font-medium border transition-colors flex items-center gap-1 shadow-sm ${
              showChambers
                ? 'bg-purple-950/80 text-purple-300 border-purple-700/60'
                : 'bg-slate-900/70 text-slate-400 border-slate-800'
            }`}
            title="Toggle anatomical ventricular/atrial chambers and cardiac valves"
          >
            <span>🫀 Cavities</span>
          </button>

          <button
            onClick={() => setShowTerritories(!showTerritories)}
            className={`px-2 py-1 rounded-md text-[11px] font-medium border transition-colors flex items-center gap-1 shadow-sm ${
              showTerritories
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                : 'bg-slate-900/70 text-slate-400 border-slate-800'
            }`}
            title="Toggle AHA 17-segment coronary vascular perfusion territory map"
          >
            <span>🗺️ Perfusion</span>
          </button>

          <button
            onClick={() => setShowCalibers(!showCalibers)}
            className={`px-2 py-1 rounded-md text-[11px] font-medium border transition-colors flex items-center gap-1 shadow-sm ${
              showCalibers
                ? 'bg-blue-950/80 text-blue-300 border-blue-700/60'
                : 'bg-slate-900/70 text-slate-400 border-slate-800'
            }`}
            title="Toggle vessel labels and probability chips"
          >
            <span>🏷️ Labels</span>
          </button>

          <button
            onClick={() => setShowECG(!showECG)}
            className={`px-2 py-1 rounded-md text-[11px] font-medium border transition-colors flex items-center gap-1 shadow-sm ${
              showECG
                ? 'bg-amber-950/80 text-amber-300 border-amber-700/60'
                : 'bg-slate-900/70 text-slate-400 border-slate-800'
            }`}
            title="Toggle synchronized 12-lead ECG rhythm monitor strip"
          >
            <span>📈 ECG</span>
          </button>

          <button
            onClick={toggleAudio}
            className={`px-2 py-1 rounded-md text-[11px] font-medium border transition-colors flex items-center gap-1 shadow-sm ${
              isAudioActive
                ? 'bg-rose-950/80 text-rose-300 border-rose-700/60'
                : 'bg-slate-900/70 text-slate-400 border-slate-800'
            }`}
            title="Toggle synthesized physiological heart sounds (S1 'Lub' / S2 'Dub')"
          >
            <span>{isAudioActive ? '🔊 Audio ON' : '🔇 Audio Muted'}</span>
          </button>
        </div>

        {/* Floating Zoom & Playback Controls (Top Right) */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-slate-900/85 backdrop-blur border border-slate-800 rounded-lg p-1 shadow-lg text-xs">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-2 py-1 rounded font-semibold transition-colors ${
              isPlaying
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-amber-600 text-white shadow-sm'
            }`}
            title="Play or pause physiological heartbeat animation"
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>

          {/* Cardiac Phase Selector */}
          <div className="flex items-center gap-0.5 bg-slate-950/60 p-0.5 rounded border border-slate-800">
            <button
              onClick={() => setCardiacPhase('auto')}
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                cardiacPhase === 'auto'
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Continuous physiological heartbeat cycle"
            >
              Auto
            </button>
            <button
              onClick={() => setCardiacPhase('diastole')}
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                cardiacPhase === 'diastole'
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Freeze at diastolic filling phase (peak coronary perfusion)"
            >
              Diastole
            </button>
            <button
              onClick={() => setCardiacPhase('systole')}
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                cardiacPhase === 'systole'
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Freeze at peak systolic ejection (ventricular contraction)"
            >
              Systole
            </button>
          </div>

          <button
            onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.15))}
            className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold"
            title="Zoom out"
          >
            &minus;
          </button>
          <span className="font-mono text-[11px] text-slate-400 w-9 text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(1.8, z + 0.15))}
            className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold"
            title="Zoom in"
          >
            &#43;
          </button>
          <button
            onClick={() => setZoomLevel(1.0)}
            className="px-1.5 py-1 text-[10px] text-slate-400 hover:text-white rounded hover:bg-slate-800"
            title="Reset zoom"
          >
            Reset
          </button>
        </div>

        {/* Selected Vessel Deep-Dive Inspection Card */}
        {selectedVessel && (
          <div className="absolute bottom-4 right-4 z-20 bg-slate-900/95 backdrop-blur-md border border-cyan-700/80 rounded-xl p-3 shadow-2xl text-xs max-w-xs flex flex-col gap-2 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full shrink-0 shadow"
                  style={{ backgroundColor: activeVesselColor }}
                />
                <span className="font-bold text-white tracking-wide">
                  {VESSEL_PARAMS[selectedVessel]?.fullName || selectedVessel}
                </span>
              </div>
              <button
                onClick={() => setSelectedVessel(null)}
                className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded hover:bg-slate-800 transition-colors"
              >
                &times; Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">Stenosis Risk</span>
                <span className="font-mono font-bold text-base" style={{ color: activeVesselColor }}>
                  {(activeVesselProb * 100).toFixed(0)}%
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {activeVesselProb >= 0.70 ? 'High Risk' : activeVesselProb >= 0.40 ? 'Moderate' : 'Low Risk'}
                </span>
              </div>

              <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">Relative Flow</span>
                <span className="font-mono font-bold text-base text-cyan-300">
                  {activeVesselProb >= 0.70 ? 'Sluggish (8 cm/s)' : activeVesselProb >= 0.40 ? 'Fair (20 cm/s)' : 'Brisk (35 cm/s)'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {activeVesselProb >= 0.70 ? 'High Resistance' : 'Normal Caliber'}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-300 leading-snug bg-slate-950/40 p-2 rounded border border-slate-800/60">
              {selectedVessel === 'LAD' && (
                <>
                  <span className="font-semibold text-cyan-400 block">Anterior Interventricular Sulcus:</span>
                  Supplies 45–55% of Left Ventricular mass including apex, anterior wall, and interventricular septum.
                </>
              )}
              {selectedVessel === 'LCX' && (
                <>
                  <span className="font-semibold text-cyan-400 block">Left Atrioventricular Groove:</span>
                  Supplies posterolateral left ventricle and lateral papillary muscle via obtuse marginals.
                </>
              )}
              {selectedVessel === 'RCA' && (
                <>
                  <span className="font-semibold text-cyan-400 block">Right Coronary Sulcus:</span>
                  Supplies right ventricle, inferior wall, and cardiac conduction system (SA/AV nodes).
                </>
              )}
            </div>

            <div className="text-[10px] text-amber-300/80 italic">
              Note: Color reflects model-estimated probability across whole vessel. No focal lesion claim.
            </div>
          </div>
        )}

        {/* SVG Drawing Canvas */}
        <div
          className="relative transition-transform duration-300 w-full h-full flex items-center justify-center"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          <svg
            viewBox="0 0 600 500"
            className="w-full h-full max-h-[440px] drop-shadow-2xl"
            style={{
              filter: fluoroscopyMode
                ? 'invert(0.92) contrast(1.4) drop-shadow(0 10px 30px rgba(255,255,255,0.2))'
                : 'drop-shadow(0 15px 35px rgba(0,0,0,0.7))',
            }}
          >
            <defs>
              {/* Myocardial Muscle Shading Gradient */}
              <radialGradient id="myoShader" cx="45%" cy="40%" r="65%">
                <stop offset="0%" stopColor="#334155" stopOpacity="0.9" />
                <stop offset="65%" stopColor="#1e293b" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#0f172a" stopOpacity="1" />
              </radialGradient>

              {/* Fluoroscopy Myocardial Tissue */}
              <radialGradient id="myoFluoro" cx="45%" cy="40%" r="65%">
                <stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.8" />
                <stop offset="70%" stopColor="#94a3b8" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#64748b" stopOpacity="0.95" />
              </radialGradient>

              {/* Aortic Arch Metallic Shader */}
              <linearGradient id="aortaShader" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#64748b" />
                <stop offset="50%" stopColor="#475569" />
                <stop offset="100%" stopColor="#1e293b" />
              </linearGradient>

              {/* Pulmonary Artery Shader */}
              <linearGradient id="pulmonaryShader" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0.95" />
              </linearGradient>

              {/* Animated Glowing Coronary Lumens */}
              <filter id="neonGlowLAD" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="neonGlowLCX" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="neonGlowRCA" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* A. Dynamic Beating Myocardial Muscle Silhouette */}
            <g
              transform={`translate(300, 260) scale(${contractionScale}) translate(-300, -260)`}
              className="transition-transform duration-75"
            >
              {/* Cardiac Base Shadow */}
              <ellipse cx="300" cy="460" rx="140" ry="25" fill="#020617" opacity="0.4" />

              {/* 1. Atria & Great Venous Inflow (Superior Base) */}
              <g id="atriaGroup" opacity={showChambers ? 0.95 : 0.75}>
                {/* Right Atrium */}
                <ellipse
                  cx="210"
                  cy="145"
                  rx="55"
                  ry="48"
                  fill={fluoroscopyMode ? '#94a3b8' : '#1e293b'}
                  stroke="#475569"
                  strokeWidth="2"
                />
                {/* Left Atrium */}
                <ellipse
                  cx="375"
                  cy="140"
                  rx="50"
                  ry="44"
                  fill={fluoroscopyMode ? '#94a3b8' : '#1e293b'}
                  stroke="#475569"
                  strokeWidth="2"
                />
                {/* Superior Vena Cava (SVC) */}
                <rect
                  x="180"
                  y="45"
                  width="28"
                  height="70"
                  rx="10"
                  fill={fluoroscopyMode ? '#64748b' : '#334155'}
                  stroke="#475569"
                  strokeWidth="1.5"
                />
              </g>

              {/* 2. Myocardial Ventricular Silhouette Body */}
              <path
                d="M 300 115 
                   C 390 65, 490 130, 460 250 
                   C 435 345, 375 425, 295 465 
                   C 215 425, 140 345, 130 250 
                   C 115 130, 210 65, 300 115 Z"
                fill={fluoroscopyMode ? 'url(#myoFluoro)' : 'url(#myoShader)'}
                stroke={fluoroscopyMode ? '#475569' : '#475569'}
                strokeWidth="2.5"
                className="transition-all"
              />

              {/* 3. AHA 17-Segment Perfusion Territories Overlay */}
              {showTerritories && (
                <g id="perfusionTerritories" opacity="0.22" className="transition-opacity duration-300 pointer-events-none">
                  {/* LAD Territory: Anterior Wall, Septum, Apex */}
                  <path
                    d="M 300 125 C 340 180, 340 290, 295 460 C 270 380, 275 250, 300 125 Z"
                    fill={ladColor}
                  />
                  {/* LCX Territory: Lateral LV Wall */}
                  <path
                    d="M 340 180 C 450 200, 430 330, 295 460 C 340 360, 340 240, 340 180 Z"
                    fill={lcxColor}
                  />
                  {/* RCA Territory: Inferior Wall, RV, Crux */}
                  <path
                    d="M 300 125 C 275 250, 270 380, 295 460 C 180 380, 145 270, 210 180 Z"
                    fill={rcaColor}
                  />
                </g>
              )}

              {/* 4. Internal Ventricular Cavities & Valves (Cutaway Layer) */}
              {showChambers && (
                <g id="internalChambers" opacity="0.65" className="transition-opacity duration-300">
                  {/* Left Ventricle Cavity (Thick muscular wall) */}
                  <path
                    d="M 315 200 C 370 215, 385 300, 310 425 C 290 350, 295 240, 315 200 Z"
                    fill="#be123c"
                    stroke="#fda4af"
                    strokeWidth="1.5"
                    strokeDasharray="4 2"
                  />
                  {/* Right Ventricle Cavity (Crescent shaped) */}
                  <path
                    d="M 280 205 C 230 220, 200 310, 275 420 C 275 340, 270 250, 280 205 Z"
                    fill="#1e3a8a"
                    stroke="#93c5fd"
                    strokeWidth="1.5"
                    strokeDasharray="4 2"
                  />
                  {/* Interventricular Septum */}
                  <line
                    x1="298"
                    y1="195"
                    x2="295"
                    y2="445"
                    stroke="#e2e8f0"
                    strokeWidth="3.5"
                    strokeDasharray="2 2"
                  />
                  {/* Aortic & Mitral Valve Annuli */}
                  <ellipse cx="320" cy="195" rx="14" ry="7" fill="none" stroke="#f8fafc" strokeWidth="2" />
                  <ellipse cx="275" cy="195" rx="14" ry="7" fill="none" stroke="#f8fafc" strokeWidth="2" />
                </g>
              )}
            </g>

            {/* B. Great Outflow Vessels (Ascending Aorta & Pulmonary Trunk) */}
            <g id="greatVesselsGroup">
              {/* Pulmonary Trunk crossing anterior to ascending aorta */}
              <path
                d="M 275 145 C 265 95, 230 75, 175 65"
                fill="none"
                stroke="url(#pulmonaryShader)"
                strokeWidth="24"
                strokeLinecap="round"
              />
              <path
                d="M 275 145 C 290 95, 340 75, 410 70"
                fill="none"
                stroke="url(#pulmonaryShader)"
                strokeWidth="20"
                strokeLinecap="round"
              />

              {/* Ascending Aorta Arch & Supra-Aortic Branches */}
              <path
                d="M 310 135 C 315 45, 235 25, 230 115"
                fill="none"
                stroke="url(#aortaShader)"
                strokeWidth="28"
                strokeLinecap="round"
              />
              {/* Brachiocephalic, Carotid, Subclavian Branches */}
              <path d="M 255 42 L 245 15" stroke="#475569" strokeWidth="9" strokeLinecap="round" />
              <path d="M 278 36 L 275 12" stroke="#475569" strokeWidth="7" strokeLinecap="round" />
              <path d="M 298 42 L 305 18" stroke="#475569" strokeWidth="7" strokeLinecap="round" />
            </g>

            {/* C. Coronary Arterial Circulation Tree */}
            <g id="coronaryArteryTree">
              {/* --- VIEW 1: ANTERIOR VIEW (Standard AP / RAO) --- */}
              {cameraPreset === 'anterior' && (
                <>
                  {/* Left Main (LM) Coronary Trunk */}
                  <path
                    d="M 305 130 Q 330 145 350 160"
                    fill="none"
                    stroke={fluoroscopyMode ? '#020617' : '#94a3b8'}
                    strokeWidth="8"
                    strokeLinecap="round"
                  />

                  {/* 1. LAD (Left Anterior Descending) with Diagonal Branches */}
                  <g
                    className="cursor-pointer group"
                    onClick={() => setSelectedVessel(selectedVessel === 'LAD' ? null : 'LAD')}
                    filter={selectedVessel === 'LAD' ? 'url(#neonGlowLAD)' : undefined}
                  >
                    {/* Thick Target for easy selection */}
                    <path
                      d="M 350 160 Q 335 235 315 315 T 295 455"
                      fill="none"
                      stroke="transparent"
                      strokeWidth="28"
                      strokeLinecap="round"
                    />

                    {/* LAD Main Trunk */}
                    <path
                      d="M 350 160 Q 335 235 315 315 T 295 455"
                      fill="none"
                      stroke={ladColor}
                      strokeWidth={selectedVessel === 'LAD' ? 9 : 6.5}
                      strokeLinecap="round"
                      className="transition-all duration-200"
                    />

                    {/* Diagonal Branch 1 (D1) */}
                    <path
                      d="M 338 215 Q 380 250 405 295"
                      fill="none"
                      stroke={ladColor}
                      strokeWidth={selectedVessel === 'LAD' ? 5 : 3.5}
                      strokeLinecap="round"
                    />
                    {/* Diagonal Branch 2 (D2) */}
                    <path
                      d="M 324 285 Q 360 325 375 365"
                      fill="none"
                      stroke={ladColor}
                      strokeWidth={selectedVessel === 'LAD' ? 4.5 : 3}
                      strokeLinecap="round"
                    />
                    {/* Septal Perforators (S1, S2) */}
                    <path d="M 330 250 L 305 265" stroke={ladColor} strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M 318 320 L 298 335" stroke={ladColor} strokeWidth="2.5" strokeLinecap="round" />

                    {/* Hemodynamic Flow Pulse Streams (Animated dash) */}
                    {showHemodynamics && (
                      <path
                        d="M 350 160 Q 335 235 315 315 T 295 455"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="2.5"
                        strokeDasharray="8 14"
                        strokeDashoffset={flowOffset * (1.15 - ladProb)}
                        strokeLinecap="round"
                        opacity="0.8"
                        className="pointer-events-none"
                      />
                    )}
                  </g>

                  {/* 2. LCX (Left Circumflex Artery) wrapping towards left AV sulcus */}
                  <g
                    className="cursor-pointer group"
                    onClick={() => setSelectedVessel(selectedVessel === 'LCX' ? null : 'LCX')}
                    filter={selectedVessel === 'LCX' ? 'url(#neonGlowLCX)' : undefined}
                  >
                    <path
                      d="M 350 160 Q 405 185 425 240 T 405 310"
                      fill="none"
                      stroke="transparent"
                      strokeWidth="28"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 350 160 Q 405 185 425 240 T 405 310"
                      fill="none"
                      stroke={lcxColor}
                      strokeWidth={selectedVessel === 'LCX' ? 9 : 6.5}
                      strokeLinecap="round"
                      strokeDasharray="7 4"
                      className="transition-all duration-200"
                    />
                    {/* Obtuse Marginal 1 (OM1) */}
                    <path
                      d="M 405 195 Q 445 220 460 265"
                      fill="none"
                      stroke={lcxColor}
                      strokeWidth={selectedVessel === 'LCX' ? 5 : 3.5}
                      strokeLinecap="round"
                    />

                    {/* LCX Hemodynamic Flow */}
                    {showHemodynamics && (
                      <path
                        d="M 350 160 Q 405 185 425 240 T 405 310"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="2.2"
                        strokeDasharray="6 12"
                        strokeDashoffset={flowOffset * (1.15 - lcxProb)}
                        strokeLinecap="round"
                        opacity="0.8"
                        className="pointer-events-none"
                      />
                    )}
                  </g>

                  {/* 3. RCA (Right Coronary Artery) traversing right atrioventricular groove */}
                  <g
                    className="cursor-pointer group"
                    onClick={() => setSelectedVessel(selectedVessel === 'RCA' ? null : 'RCA')}
                    filter={selectedVessel === 'RCA' ? 'url(#neonGlowRCA)' : undefined}
                  >
                    <path
                      d="M 285 135 Q 200 180 185 260 T 235 390"
                      fill="none"
                      stroke="transparent"
                      strokeWidth="28"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 285 135 Q 200 180 185 260 T 235 390"
                      fill="none"
                      stroke={rcaColor}
                      strokeWidth={selectedVessel === 'RCA' ? 9 : 6.5}
                      strokeLinecap="round"
                      className="transition-all duration-200"
                    />
                    {/* Acute Marginal Branch (AM) */}
                    <path
                      d="M 185 260 Q 210 280 230 295"
                      fill="none"
                      stroke={rcaColor}
                      strokeWidth={selectedVessel === 'RCA' ? 4.5 : 3}
                      strokeLinecap="round"
                    />
                    {/* Conus Artery */}
                    <path
                      d="M 270 148 Q 255 135 240 140"
                      fill="none"
                      stroke={rcaColor}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />

                    {/* RCA Hemodynamic Flow */}
                    {showHemodynamics && (
                      <path
                        d="M 285 135 Q 200 180 185 260 T 235 390"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="2.5"
                        strokeDasharray="8 14"
                        strokeDashoffset={flowOffset * (1.15 - rcaProb)}
                        strokeLinecap="round"
                        opacity="0.8"
                        className="pointer-events-none"
                      />
                    )}
                  </g>
                </>
              )}

              {/* --- VIEW 2: LEFT LATERAL VIEW (LAO Cranial - LCX Dominant) --- */}
              {cameraPreset === 'lateral' && (
                <>
                  {/* In Left Lateral, LCX runs prominently down the center AV groove */}
                  <g
                    className="cursor-pointer group"
                    onClick={() => setSelectedVessel(selectedVessel === 'LCX' ? null : 'LCX')}
                    filter={selectedVessel === 'LCX' ? 'url(#neonGlowLCX)' : undefined}
                  >
                    <path
                      d="M 290 130 Q 330 180 340 260 T 310 395"
                      fill="none"
                      stroke={lcxColor}
                      strokeWidth={selectedVessel === 'LCX' ? 10 : 7.5}
                      strokeLinecap="round"
                      className="transition-all duration-200"
                    />
                    {/* Prominent Obtuse Marginal 1 & 2 Branches */}
                    <path
                      d="M 320 180 Q 380 220 410 280"
                      fill="none"
                      stroke={lcxColor}
                      strokeWidth={selectedVessel === 'LCX' ? 6 : 4}
                      strokeLinecap="round"
                    />
                    <path
                      d="M 338 250 Q 390 290 405 350"
                      fill="none"
                      stroke={lcxColor}
                      strokeWidth={selectedVessel === 'LCX' ? 5 : 3.5}
                      strokeLinecap="round"
                    />

                    {showHemodynamics && (
                      <path
                        d="M 290 130 Q 330 180 340 260 T 310 395"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="2.5"
                        strokeDasharray="7 13"
                        strokeDashoffset={flowOffset * (1.15 - lcxProb)}
                        strokeLinecap="round"
                        opacity="0.85"
                      />
                    )}
                  </g>

                  {/* LAD seen on the anterior profile border */}
                  <g
                    className="cursor-pointer"
                    onClick={() => setSelectedVessel(selectedVessel === 'LAD' ? null : 'LAD')}
                    opacity="0.65"
                  >
                    <path
                      d="M 250 145 Q 210 230 200 320 T 260 440"
                      fill="none"
                      stroke={ladColor}
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                  </g>

                  {/* RCA seen on posterior profile */}
                  <g
                    className="cursor-pointer"
                    onClick={() => setSelectedVessel(selectedVessel === 'RCA' ? null : 'RCA')}
                    opacity="0.45"
                  >
                    <path
                      d="M 360 140 Q 420 220 410 300"
                      fill="none"
                      stroke={rcaColor}
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray="4 3"
                    />
                  </g>
                </>
              )}

              {/* --- VIEW 3: POSTERIOR VIEW (PA Crux - RCA PDA Dominant) --- */}
              {cameraPreset === 'posterior' && (
                <>
                  {/* Crux cordis with Posterior Descending Artery (PDA) coursing up posterior groove */}
                  <g
                    className="cursor-pointer group"
                    onClick={() => setSelectedVessel(selectedVessel === 'RCA' ? null : 'RCA')}
                    filter={selectedVessel === 'RCA' ? 'url(#neonGlowRCA)' : undefined}
                  >
                    {/* Main Distal RCA reaching Crux */}
                    <path
                      d="M 180 200 Q 230 260 295 300"
                      fill="none"
                      stroke={rcaColor}
                      strokeWidth={selectedVessel === 'RCA' ? 9 : 7}
                      strokeLinecap="round"
                    />
                    {/* PDA coursing down posterior interventricular sulcus */}
                    <path
                      d="M 295 300 Q 298 370 295 440"
                      fill="none"
                      stroke={rcaColor}
                      strokeWidth={selectedVessel === 'RCA' ? 8 : 6}
                      strokeLinecap="round"
                    />
                    {/* Posterolateral branch (PLB) */}
                    <path
                      d="M 295 300 Q 360 320 395 350"
                      fill="none"
                      stroke={rcaColor}
                      strokeWidth={selectedVessel === 'RCA' ? 5 : 3.5}
                      strokeLinecap="round"
                    />

                    {showHemodynamics && (
                      <path
                        d="M 180 200 Q 230 260 295 300 T 295 440"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="2.5"
                        strokeDasharray="8 14"
                        strokeDashoffset={flowOffset * (1.15 - rcaProb)}
                        strokeLinecap="round"
                        opacity="0.85"
                      />
                    )}
                  </g>

                  {/* Coronary Sinus (Deep venous blue structure) */}
                  <path
                    d="M 380 260 Q 330 270 285 285"
                    fill="none"
                    stroke="#1e3a8a"
                    strokeWidth="10"
                    strokeLinecap="round"
                    opacity="0.75"
                  />

                  {/* Distal LCX terminating near crux */}
                  <g
                    className="cursor-pointer"
                    onClick={() => setSelectedVessel(selectedVessel === 'LCX' ? null : 'LCX')}
                    opacity="0.65"
                  >
                    <path
                      d="M 430 190 Q 380 230 350 270"
                      fill="none"
                      stroke={lcxColor}
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray="5 3"
                    />
                  </g>
                </>
              )}
            </g>

            {/* D. Interactive Vessel Badges & Calibers */}
            {showCalibers && cameraPreset === 'anterior' && (
              <g id="vesselBadges">
                {/* RCA Badge (Anatomical Right / Left graphic side) */}
                <g
                  className="cursor-pointer transform hover:scale-105 transition-transform"
                  onClick={() => setSelectedVessel(selectedVessel === 'RCA' ? null : 'RCA')}
                >
                  <rect
                    x="55"
                    y="220"
                    width="110"
                    height="46"
                    rx="8"
                    fill={fluoroscopyMode ? '#f1f5f9' : '#090d16'}
                    stroke={selectedVessel === 'RCA' ? '#38bdf8' : '#334155'}
                    strokeWidth={selectedVessel === 'RCA' ? 2 : 1}
                    className="shadow-xl"
                  />
                  <circle cx="75" cy="243" r="6" fill={rcaColor} />
                  <text
                    x="90"
                    y="238"
                    fill={fluoroscopyMode ? '#0f172a' : '#f8fafc'}
                    fontSize="12"
                    fontWeight="bold"
                  >
                    RCA
                  </text>
                  <text
                    x="90"
                    y="254"
                    fill={rcaColor}
                    fontSize="11"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {(rcaProb * 100).toFixed(0)}% risk
                  </text>
                </g>

                {/* LAD Badge (Center apex) */}
                <g
                  className="cursor-pointer transform hover:scale-105 transition-transform"
                  onClick={() => setSelectedVessel(selectedVessel === 'LAD' ? null : 'LAD')}
                >
                  <rect
                    x="320"
                    y="355"
                    width="110"
                    height="46"
                    rx="8"
                    fill={fluoroscopyMode ? '#f1f5f9' : '#090d16'}
                    stroke={selectedVessel === 'LAD' ? '#38bdf8' : '#334155'}
                    strokeWidth={selectedVessel === 'LAD' ? 2 : 1}
                    className="shadow-xl"
                  />
                  <circle cx="340" cy="378" r="6" fill={ladColor} />
                  <text
                    x="355"
                    y="373"
                    fill={fluoroscopyMode ? '#0f172a' : '#f8fafc'}
                    fontSize="12"
                    fontWeight="bold"
                  >
                    LAD
                  </text>
                  <text
                    x="355"
                    y="389"
                    fill={ladColor}
                    fontSize="11"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {(ladProb * 100).toFixed(0)}% risk
                  </text>
                </g>

                {/* LCX Badge (Lateral groove) */}
                <g
                  className="cursor-pointer transform hover:scale-105 transition-transform"
                  onClick={() => setSelectedVessel(selectedVessel === 'LCX' ? null : 'LCX')}
                >
                  <rect
                    x="435"
                    y="190"
                    width="110"
                    height="46"
                    rx="8"
                    fill={fluoroscopyMode ? '#f1f5f9' : '#090d16'}
                    stroke={selectedVessel === 'LCX' ? '#38bdf8' : '#334155'}
                    strokeWidth={selectedVessel === 'LCX' ? 2 : 1}
                    className="shadow-xl"
                  />
                  <circle cx="455" cy="213" r="6" fill={lcxColor} />
                  <text
                    x="470"
                    y="208"
                    fill={fluoroscopyMode ? '#0f172a' : '#f8fafc'}
                    fontSize="12"
                    fontWeight="bold"
                  >
                    LCX
                  </text>
                  <text
                    x="470"
                    y="224"
                    fill={lcxColor}
                    fontSize="11"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {(lcxProb * 100).toFixed(0)}% risk
                  </text>
                </g>
              </g>
            )}
          </svg>
        </div>
      </div>

      {/* 3. Bottom Dock: Synchronized Oscilloscope ECG Rhythm Strip & Vitals Banner */}
      {showECG && (
        <div
          className={`w-full border rounded-xl p-2.5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 z-10 transition-colors ${
            fluoroscopyMode
              ? 'bg-white border-slate-300 text-slate-800'
              : 'bg-slate-900/90 border-slate-800 text-slate-200'
          }`}
        >
          {/* Left: Patient Physiological Vitals HUD */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold tracking-wide">ECG Lead II</span>
            </div>

            <div className="flex items-center gap-1 bg-slate-950/50 px-2 py-1 rounded border border-slate-800/80 font-mono text-[11px]">
              <span className="text-slate-400">HR:</span>
              <span className="font-bold text-cyan-400">{pulseRate} BPM</span>
            </div>

            <div className="flex items-center gap-1 bg-slate-950/50 px-2 py-1 rounded border border-slate-800/80 font-mono text-[11px]">
              <span className="text-slate-400">EF:</span>
              <span className="font-bold text-emerald-400">{ejectionFraction}%</span>
            </div>

            <div className="flex items-center gap-1 bg-slate-950/50 px-2 py-1 rounded border border-slate-800/80 font-mono text-[11px]">
              <span className="text-slate-400">BP:</span>
              <span className="font-bold text-amber-400">{systolicBP} mmHg</span>
            </div>

            <div className="hidden md:flex items-center gap-1 text-[11px] text-slate-400">
              <span>Phase:</span>
              <span className="font-mono text-amber-300 font-semibold">
                {phaseTime <= 0.35 ? 'Ventricular Systole' : 'Diastolic Perfusion'}
              </span>
            </div>

            {(hasSTElevation || hasSTDepression || hasTInversion) && (
              <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-bold">
                {hasSTElevation && 'ST-Elev'}
                {hasSTDepression && 'ST-Depr'}
                {hasTInversion && ' T-Inv'}
              </span>
            )}
          </div>

          {/* Center / Right: Oscilloscope ECG Real-Time Rhythm Waveform */}
          <div className="w-full sm:w-72 h-10 bg-slate-950 rounded-lg border border-slate-800 relative overflow-hidden flex items-center px-2">
            <svg viewBox="0 0 300 40" className="w-full h-full">
              {/* Grid Background Lines */}
              <line x1="0" y1="10" x2="300" y2="10" stroke="#1e293b" strokeWidth="0.5" />
              <line x1="0" y1="20" x2="300" y2="20" stroke="#1e293b" strokeWidth="0.5" />
              <line x1="0" y1="30" x2="300" y2="30" stroke="#1e293b" strokeWidth="0.5" />

              {/* Dynamic P-Q-R-S-T Physiological Wave Path */}
              <path
                d={`M 0 20 
                    L 30 20 
                    Q 45 14 55 20 
                    L 70 20 
                    L 75 23 
                    L 85 ${hasSTElevation ? 3 : 2} 
                    L 95 36 
                    L 100 20 
                    L 115 ${hasSTElevation ? 14 : hasSTDepression ? 26 : 20} 
                    Q 135 ${hasTInversion ? 27 : 12} 150 20 
                    L 200 20 
                    L 205 23 
                    L 215 ${hasSTElevation ? 3 : 2} 
                    L 225 36 
                    L 230 20 
                    L 245 ${hasSTElevation ? 14 : hasSTDepression ? 26 : 20} 
                    Q 265 ${hasTInversion ? 27 : 12} 280 20 
                    L 300 20`}
                fill="none"
                stroke="#10b981"
                strokeWidth="1.8"
                strokeLinecap="round"
                className="drop-shadow-[0_0_6px_rgba(16,185,129,0.7)]"
              />

              {/* Sweeping Oscilloscope Vertical Beam Synchronized with Phase */}
              <line
                x1={phaseTime * 300}
                y1="0"
                x2={phaseTime * 300}
                y2="40"
                stroke="#38bdf8"
                strokeWidth="2"
                opacity="0.8"
                className="drop-shadow-[0_0_4px_#38bdf8]"
              />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};
