import React from 'react';
import { useStore } from '../store/useStore';
import { useCardiacCycle } from '../hooks/useCardiacCycle';

export const CardiacCycleControlsHUD: React.FC = () => {
  const {
    avValvesOpen,
    semilunarValvesOpen,
    lastSound,
    bpm,
    ef,
    isPlaying,
    cardiacPhase,
    isAudioMuted,
  } = useCardiacCycle();

  const setCardiacPhase = useStore((state) => state.setCardiacPhase);
  const togglePlayback = useStore((state) => state.togglePlayback);
  const toggleAudio = useStore((state) => state.toggleAudio);

  return (
    <div
      className="bg-[#090d16]/90 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-1.5 shadow-2xl flex flex-wrap items-center justify-between gap-2.5 text-xs text-slate-200 select-none max-w-full"
      data-testid="cardiac-cycle-hud"
    >
      {/* 1. Cardiac Phase Controls (Auto, Systole Freeze, Diastole Freeze) */}
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1 hidden sm:inline">
          Phase:
        </span>
        <button
          type="button"
          onClick={() => {
            setCardiacPhase('auto');
            if (!isPlaying) togglePlayback();
          }}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
            cardiacPhase === 'auto'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/50 ring-1 ring-cyan-400/50'
              : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300'
          }`}
          data-testid="cycle-phase-auto"
          title="Continuous physiological heartbeat synchronized with patient vitals"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${cardiacPhase === 'auto' ? 'bg-cyan-300 animate-ping' : 'bg-slate-500'}`} />
          <span>Auto</span>
        </button>

        <button
          type="button"
          onClick={() => setCardiacPhase('systole')}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
            cardiacPhase === 'systole'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-950/50 ring-1 ring-rose-400/50'
              : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300'
          }`}
          data-testid="cycle-phase-systole"
          title="Freeze at peak ventricular systole (ejection contraction, semilunars open, AV valves closed)"
        >
          <span>Systole</span>
        </button>

        <button
          type="button"
          onClick={() => setCardiacPhase('diastole')}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
            cardiacPhase === 'diastole'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50 ring-1 ring-emerald-400/50'
              : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300'
          }`}
          data-testid="cycle-phase-diastole"
          title="Freeze at peak ventricular diastole (chamber filling, AV valves open, semilunars closed)"
        >
          <span>Diastole</span>
        </button>
      </div>

      {/* 2. Valve Movement Status Indicators */}
      <div className="flex items-center gap-2 border-l border-r border-slate-800/80 px-2 text-[10px] font-mono">
        {/* AV Valves: Mitral & Tricuspid */}
        <div
          className={`px-2 py-0.5 rounded border flex items-center gap-1.5 transition-colors ${
            avValvesOpen
              ? 'bg-emerald-950/70 border-emerald-600/70 text-emerald-300'
              : 'bg-rose-950/70 border-rose-600/70 text-rose-300'
          }`}
          title="Atrioventricular Valves (Mitral & Tricuspid) mechanics: Open during ventricular diastole, closed during systole"
          data-testid="valve-status-av"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${avValvesOpen ? 'bg-emerald-400' : 'bg-rose-400'}`} />
          <span className="hidden md:inline">AV Valves:</span>
          <strong className="font-bold">{avValvesOpen ? 'OPEN' : 'CLOSED'}</strong>
        </div>

        {/* Semilunar Valves: Aortic & Pulmonary */}
        <div
          className={`px-2 py-0.5 rounded border flex items-center gap-1.5 transition-colors ${
            semilunarValvesOpen
              ? 'bg-emerald-950/70 border-emerald-600/70 text-emerald-300'
              : 'bg-rose-950/70 border-rose-600/70 text-rose-300'
          }`}
          title="Semilunar Valves (Aortic & Pulmonary) mechanics: Open during ventricular systolic ejection, closed during diastole"
          data-testid="valve-status-semilunar"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${semilunarValvesOpen ? 'bg-emerald-400' : 'bg-rose-400'}`} />
          <span className="hidden md:inline">Semilunar:</span>
          <strong className="font-bold">{semilunarValvesOpen ? 'OPEN' : 'CLOSED'}</strong>
        </div>
      </div>

      {/* 3. Physiological Rate & EF Modulation + S1/S2 Sound Playback Toggle */}
      <div className="flex items-center gap-2">
        <div className="hidden lg:flex items-center gap-2 font-mono text-[10px] text-slate-400">
          <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
            PR: <strong className="text-cyan-300">{bpm}</strong> bpm
          </span>
          <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
            EF: <strong className="text-emerald-300">{ef}%</strong>
          </span>
        </div>

        {/* Heart sound toggle & S1/S2 Lub-Dub flash indicator */}
        <button
          type="button"
          onClick={toggleAudio}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5 border ${
            !isAudioMuted
              ? 'bg-purple-950/80 text-purple-200 border-purple-500 shadow-sm shadow-purple-950/60'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
          }`}
          data-testid="cycle-sound-toggle"
          title="Toggle synchronized physiological S1 (Lub) and S2 (Dub) heart sounds"
        >
          <span>{!isAudioMuted ? '🔊 S1/S2 Sound' : '🔇 Muted'}</span>
          {!isAudioMuted && lastSound !== 'none' && (
            <span className="px-1 rounded bg-purple-600 text-white font-mono text-[9px] animate-bounce">
              {lastSound === 's1' ? 'Lub (S1)' : 'Dub (S2)'}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
