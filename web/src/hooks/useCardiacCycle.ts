import { useState, useEffect, useRef } from 'react';
import { useStore, CardiacCyclePhase } from '../store/useStore';
import { cardiacAudio } from '../audio/cardiacAudio';

export interface CardiacCycleState {
  phaseTime: number; // [0.0, 1.0)
  phaseName: CardiacCyclePhase;
  avValvesOpen: boolean; // Mitral & Tricuspid opening status
  semilunarValvesOpen: boolean; // Aortic & Pulmonary opening status
  lastSound: 's1' | 's2' | 'none';
  bpm: number;
  ef: number;
  isPlaying: boolean;
  cardiacPhase: 'auto' | 'diastole' | 'systole';
  isAudioMuted: boolean;
}

export function useCardiacCycle(): CardiacCycleState {
  const isPlaying = useStore((state) => state.isPlaying);
  const cardiacPhase = useStore((state) => state.cardiacPhase);
  const heartRateBpm = useStore((state) => state.heartRateBpm);
  const isAudioMuted = useStore((state) => state.isAudioMuted);
  const patientInputs = useStore((state) => state.patientInputs);
  const setCardiacCyclePhase = useStore((state) => state.setCardiacCyclePhase);

  // Sync mute state with audio synthesizer
  useEffect(() => {
    cardiacAudio.setMuted(isAudioMuted);
  }, [isAudioMuted]);

  const rawEf = Number(patientInputs['EF-TTE'] || 50);
  const ef = Math.max(20, Math.min(85, isNaN(rawEf) ? 50 : rawEf));
  const bpm = Math.max(30, Math.min(180, isNaN(heartRateBpm) ? 75 : heartRateBpm));
  const beatPeriod = 60 / bpm;

  const [phaseTime, setPhaseTime] = useState<number>(0);
  const [phaseName, setLocalPhaseName] = useState<CardiacCyclePhase>('diastole');
  const [avValvesOpen, setAvValvesOpen] = useState<boolean>(true);
  const [semilunarValvesOpen, setSemilunarValvesOpen] = useState<boolean>(false);
  const [lastSound, setLastSound] = useState<'s1' | 's2' | 'none'>('none');

  const lastSoundRef = useRef<'s1' | 's2' | 'none'>('none');
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (cardiacPhase === 'systole') {
      setPhaseTime(0.20);
      setLocalPhaseName('systole');
      setAvValvesOpen(false);
      setSemilunarValvesOpen(true);
      setLastSound('none');
      setCardiacCyclePhase('systole');
      return;
    }

    if (cardiacPhase === 'diastole') {
      setPhaseTime(0.55);
      setLocalPhaseName('diastole');
      setAvValvesOpen(true);
      setSemilunarValvesOpen(false);
      setLastSound('none');
      setCardiacCyclePhase('diastole');
      return;
    }

    // Auto beating mode
    const onFrame = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const delta = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      if (isPlaying) {
        setPhaseTime((prev) => {
          const next = (prev + delta / beatPeriod) % 1.0;

          // Sound triggers and phase classification
          if (next >= 0.04 && next <= 0.12 && lastSoundRef.current !== 's1') {
            cardiacAudio.playS1();
            lastSoundRef.current = 's1';
            setLastSound('s1');
          } else if (next >= 0.36 && next <= 0.44 && lastSoundRef.current !== 's2') {
            cardiacAudio.playS2();
            lastSoundRef.current = 's2';
            setLastSound('s2');
          } else if (next > 0.50 && next < 0.90 && lastSoundRef.current !== 'none') {
            lastSoundRef.current = 'none';
            setLastSound('none');
          }

          // Compute valve status
          if (next < 0.08) {
            setLocalPhaseName('isovolumetric');
            setAvValvesOpen(false);
            setSemilunarValvesOpen(false);
            setCardiacCyclePhase('isovolumetric');
          } else if (next < 0.32) {
            setLocalPhaseName('systole');
            setAvValvesOpen(false);
            setSemilunarValvesOpen(true);
            setCardiacCyclePhase('systole');
          } else if (next < 0.40) {
            setLocalPhaseName('relaxation');
            setAvValvesOpen(false);
            setSemilunarValvesOpen(false);
            setCardiacCyclePhase('relaxation');
          } else {
            setLocalPhaseName('diastole');
            setAvValvesOpen(true);
            setSemilunarValvesOpen(false);
            setCardiacCyclePhase('diastole');
          }

          return next;
        });
      }

      animFrameRef.current = requestAnimationFrame(onFrame);
    };

    animFrameRef.current = requestAnimationFrame(onFrame);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, cardiacPhase, beatPeriod, setCardiacCyclePhase]);

  return {
    phaseTime,
    phaseName,
    avValvesOpen,
    semilunarValvesOpen,
    lastSound,
    bpm,
    ef,
    isPlaying,
    cardiacPhase,
    isAudioMuted,
  };
}
