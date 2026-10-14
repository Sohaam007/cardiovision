import { create } from 'zustand';
import { predictRisk, type DemoPatient, type FeatureSchemaItem, type PredictResponse } from '../api/client.ts';

export type VesselKey = 'LAD' | 'LCX' | 'RCA';
export type TargetKey = 'CAD' | 'LAD' | 'LCX' | 'RCA';
export type TabKey = 'form' | 'sensitivity' | 'explainability' | '3d_debug';
export type ApiStatusKey = 'idle' | 'waking' | 'live' | 'demo' | 'unavailable';
export type DissectionPlane = 'coronal' | 'short_axis' | 'sagittal';
export type CardiacCyclePhase = 'diastole' | 'isovolumetric' | 'systole' | 'relaxation';

export interface VesselData {
  prob: number;
  label?: number;
}

export type ViewerMode = 'realistic' | 'procedural' | '2d' | 'blender';

export interface AppState {
  // 3D Scene state
  prediction: {
    vessels: Record<VesselKey, VesselData>;
  };
  colorblindMode: boolean;
  showTorso: boolean;
  heartOpacity: number;
  selectedVessel: VesselKey | null;
  hoveredVessel: VesselKey | null;
  chamberCutaway: boolean;
  cameraPreset: 'anterior' | 'lateral' | 'posterior' | null;
  flyToVesselTarget: VesselKey | null;
  viewerMode: ViewerMode;
  force2DFallback: boolean;
  webglError: boolean;
  isTweening: boolean;

  // Surgical Dissection & Internal Anatomy State
  isCutOpen: boolean;
  dissectionPlane: DissectionPlane;
  cutDepth: number; // 0.0 to 1.0
  isInvertedCut: boolean;
  selectedInternalStructure: string | null;
  cardiacCyclePhase: CardiacCyclePhase;

  // Heart Beating & Biomechanical Motion State
  isBeating: boolean;
  heartRateBpm: number;
  beatingSpeed: number; // 1.0 = real-time, 0.5 = slow motion

  // Unified Viewport & Tools Menu State
  showHemodynamics: boolean;
  showCavities: boolean;
  showPerfusion: boolean;
  showCalibers: boolean;
  showECG: boolean;
  fluoroscopyMode: boolean;
  isPlaying: boolean;
  cardiacPhase: 'auto' | 'diastole' | 'systole';
  isAudioMuted: boolean;
  zoomLevel: number;

  // Clinical & Prediction State
  patientInputs: Record<string, any>;
  predictions: PredictResponse | null;
  selectedTarget: TargetKey;
  apiStatus: ApiStatusKey;
  demoMode: boolean;
  modelServerUnavailable: boolean;
  selectedPersonaId: string | null;
  activeTab: TabKey;
  disclaimerAccepted: boolean;
  schema: FeatureSchemaItem[];
  demoPatients: DemoPatient[];
  isLoadingPrediction: boolean;
  isDirty: boolean;
  activePersonaBaseline: Record<string, any> | null;
  activePersonaPredictions: PredictResponse | null;

  // Actions
  setVesselProbability: (vessel: VesselKey, prob: number) => void;
  setColorblindMode: (enabled: boolean) => void;
  toggleColorblindMode: () => void;
  setShowTorso: (show: boolean) => void;
  toggleTorso: () => void;
  toggleChamberCutaway: () => void;
  setHeartOpacity: (opacity: number) => void;
  setSelectedVessel: (vessel: VesselKey | null, flyTo?: boolean) => void;
  setHoveredVessel: (vessel: VesselKey | null) => void;
  setCameraPreset: (preset: 'anterior' | 'lateral' | 'posterior' | null) => void;
  flyToVessel: (vessel: VesselKey | null) => void;
  setViewerMode: (mode: ViewerMode) => void;
  setForce2DFallback: (force: boolean) => void;
  setWebglError: (error: boolean) => void;
  setIsTweening: (tweening: boolean) => void;
  resetDemoProbabilities: () => void;

  // Surgical Dissection Actions
  toggleCutOpen: () => void;
  setIsCutOpen: (open: boolean) => void;
  setDissectionPlane: (plane: DissectionPlane) => void;
  setCutDepth: (depth: number) => void;
  toggleInvertCut: () => void;
  setIsInvertedCut: (inverted: boolean) => void;
  setSelectedInternalStructure: (structureId: string | null) => void;
  setCardiacCyclePhase: (phase: CardiacCyclePhase) => void;

  // Heart Beating Actions
  setIsBeating: (beating: boolean) => void;
  toggleBeating: () => void;
  setHeartRateBpm: (bpm: number) => void;
  setBeatingSpeed: (speed: number) => void;

  // Unified Tools & Viewport Layer Actions
  setShowHemodynamics: (show: boolean) => void;
  toggleHemodynamics: () => void;
  setShowCavities: (show: boolean) => void;
  toggleCavities: () => void;
  setShowPerfusion: (show: boolean) => void;
  togglePerfusion: () => void;
  setShowCalibers: (show: boolean) => void;
  toggleCalibers: () => void;
  setShowECG: (show: boolean) => void;
  toggleECG: () => void;
  setFluoroscopyMode: (enabled: boolean) => void;
  toggleFluoroscopyMode: () => void;
  setIsPlaying: (playing: boolean) => void;
  togglePlayback: () => void;
  setCardiacPhase: (phase: 'auto' | 'diastole' | 'systole') => void;
  setIsAudioMuted: (muted: boolean) => void;
  toggleAudio: () => void;
  setZoomLevel: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;

  setPatientInput: (field: string, value: any) => void;
  setPatientInputs: (inputs: Record<string, any>) => void;
  setPredictions: (pred: PredictResponse) => void;
  setSelectedTarget: (target: TargetKey) => void;
  setApiStatus: (status: ApiStatusKey) => void;
  setDemoMode: (enabled: boolean) => void;
  setSelectedPersonaId: (id: string | null) => void;
  setActiveTab: (tab: TabKey) => void;
  setDisclaimerAccepted: (accepted: boolean) => void;
  setSchema: (schema: FeatureSchemaItem[]) => void;
  setDemoPatients: (patients: DemoPatient[]) => void;
  loadPersona: (persona: DemoPatient) => void;
  setIsLoadingPrediction: (loading: boolean) => void;
  setModelServerUnavailable: (unavailable: boolean) => void;
  setIsDirty: (dirty: boolean) => void;
  resetToBaseline: () => void;
  runPrediction: () => Promise<void>;
  isModelInfoOpen: boolean;
  openModelInfo: () => void;
  closeModelInfo: () => void;
  toggleModelInfo: () => void;
  isSensitivityOpen: boolean;
  openSensitivity: () => void;
  closeSensitivity: () => void;
  toggleSensitivity: () => void;
}

const DEFAULT_VESSELS: Record<VesselKey, VesselData> = {
  LAD: { prob: 0.74, label: 1 },
  LCX: { prob: 0.31, label: 0 },
  RCA: { prob: 0.52, label: 1 },
};

const INITIAL_DISCLAIMER =
  typeof window !== 'undefined' &&
  (window.localStorage.getItem('cardiovision_disclaimer_accepted') === 'true' ||
    new URLSearchParams(window.location.search).has('nodialog'));

export const useStore = create<AppState>()((set) => ({
  prediction: {
    vessels: { ...DEFAULT_VESSELS },
  },
  colorblindMode: false,
  showTorso: true,
  heartOpacity: 0.92,
  selectedVessel: null,
  hoveredVessel: null,
  chamberCutaway: false,
  cameraPreset: null,
  flyToVesselTarget: null,
  viewerMode: 'realistic',
  force2DFallback: false,
  webglError: false,
  isTweening: false,

  // Initial Dissection Defaults
  isCutOpen: false,
  dissectionPlane: 'coronal',
  cutDepth: 0.5,
  isInvertedCut: false,
  selectedInternalStructure: null,
  cardiacCyclePhase: 'systole',

  // Beating & Biomechanical Motion Initial State
  isBeating: true,
  heartRateBpm: 72,
  beatingSpeed: 1.0,

  // Unified Tools & Viewport Layer Initial State
  showHemodynamics: true,
  showCavities: false,
  showPerfusion: true,
  showCalibers: true,
  showECG: true,
  fluoroscopyMode: false,
  isPlaying: true,
  cardiacPhase: 'auto',
  isAudioMuted: true,
  zoomLevel: 1.0,

  patientInputs: {},
  predictions: null,
  selectedTarget: 'CAD',
  apiStatus: 'idle',
  demoMode: false,
  modelServerUnavailable: false,
  selectedPersonaId: null,
  activeTab: 'explainability',
  disclaimerAccepted: INITIAL_DISCLAIMER,
  schema: [],
  demoPatients: [],
  isLoadingPrediction: false,
  isDirty: false,
  activePersonaBaseline: null,
  activePersonaPredictions: null,

  setVesselProbability: (vessel: VesselKey, prob: number) => {
    const safeProb = Number.isFinite(prob) ? Math.max(0, Math.min(1, Number(prob.toFixed(4)))) : 0.5;
    return set((state) => ({
      prediction: {
        ...state.prediction,
        vessels: {
          ...state.prediction.vessels,
          [vessel]: {
            ...state.prediction.vessels[vessel],
            prob: safeProb,
          },
        },
      },
    }));
  },

  setColorblindMode: (enabled: boolean) => set({ colorblindMode: enabled }),
  toggleColorblindMode: () => set((state) => ({ colorblindMode: !state.colorblindMode })),

  setShowTorso: (show: boolean) => set({ showTorso: show }),
  toggleTorso: () => set((state) => ({ showTorso: !state.showTorso })),
  toggleChamberCutaway: () => set((state) => {
    const next = !state.chamberCutaway;
    return { chamberCutaway: next, isCutOpen: next, showCavities: next };
  }),

  setHeartOpacity: (opacity: number) =>
    set({ heartOpacity: Math.max(0.1, Math.min(1, opacity)) }),

  setSelectedVessel: (vessel: VesselKey | null, flyTo = true) => {
    set((state) => {
      const newTarget = vessel ? (vessel as TargetKey) : state.selectedTarget;
      return {
        selectedVessel: vessel,
        selectedTarget: newTarget,
        flyToVesselTarget: flyTo ? vessel : null,
        cameraPreset: null,
      };
    });
  },
  setHoveredVessel: (vessel: VesselKey | null) => set({ hoveredVessel: vessel }),
  setCameraPreset: (preset) =>
    set({
      cameraPreset: preset,
      flyToVesselTarget: null,
    }),

  flyToVessel: (vessel: VesselKey | null) =>
    set((state) => ({
      selectedVessel: vessel,
      selectedTarget: vessel ? (vessel as TargetKey) : state.selectedTarget,
      flyToVesselTarget: vessel,
      cameraPreset: null,
    })),

  setViewerMode: (mode: ViewerMode) =>
    set({
      viewerMode: mode,
      force2DFallback: mode === '2d',
    }),
  setForce2DFallback: (force: boolean) =>
    set({
      force2DFallback: force,
      viewerMode: force ? '2d' : 'realistic',
    }),
  setWebglError: (error: boolean) => set({ webglError: error }),
  setIsTweening: (tweening: boolean) => set({ isTweening: tweening }),

  toggleCutOpen: () => set((state) => {
    const next = !state.isCutOpen;
    return { isCutOpen: next, chamberCutaway: next, showCavities: next };
  }),
  setIsCutOpen: (open: boolean) => set({ isCutOpen: open, chamberCutaway: open, showCavities: open }),
  setDissectionPlane: (plane: DissectionPlane) => set({ dissectionPlane: plane }),
  setCutDepth: (depth: number) => set({ cutDepth: Math.max(0, Math.min(1, depth)) }),
  toggleInvertCut: () => set((state) => ({ isInvertedCut: !state.isInvertedCut })),
  setIsInvertedCut: (inverted: boolean) => set({ isInvertedCut: inverted }),
  setSelectedInternalStructure: (structureId: string | null) => set({ selectedInternalStructure: structureId }),
  setCardiacCyclePhase: (phase: CardiacCyclePhase) => set({ cardiacCyclePhase: phase }),

  setIsBeating: (beating: boolean) => set({ isBeating: beating }),
  toggleBeating: () => set((state) => ({ isBeating: !state.isBeating })),
  setHeartRateBpm: (bpm: number) => set({ heartRateBpm: Math.max(30, Math.min(180, bpm)) }),
  setBeatingSpeed: (speed: number) => set({ beatingSpeed: Math.max(0.1, Math.min(3.0, speed)) }),

  // Unified Tools & Viewport Actions Implementation
  setShowHemodynamics: (show: boolean) => set({ showHemodynamics: show }),
  toggleHemodynamics: () => set((state) => ({ showHemodynamics: !state.showHemodynamics })),
  setShowCavities: (show: boolean) => set({ showCavities: show, chamberCutaway: show, isCutOpen: show }),
  toggleCavities: () => set((state) => {
    const next = !state.showCavities;
    return { showCavities: next, chamberCutaway: next, isCutOpen: next };
  }),
  setShowPerfusion: (show: boolean) => set({ showPerfusion: show }),
  togglePerfusion: () => set((state) => ({ showPerfusion: !state.showPerfusion })),
  setShowCalibers: (show: boolean) => set({ showCalibers: show }),
  toggleCalibers: () => set((state) => ({ showCalibers: !state.showCalibers })),
  setShowECG: (show: boolean) => set({ showECG: show }),
  toggleECG: () => set((state) => ({ showECG: !state.showECG })),
  setFluoroscopyMode: (enabled: boolean) => set({ fluoroscopyMode: enabled }),
  toggleFluoroscopyMode: () => set((state) => ({ fluoroscopyMode: !state.fluoroscopyMode })),
  setIsPlaying: (playing: boolean) => set({ isPlaying: playing, isBeating: playing }),
  togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying, isBeating: !state.isPlaying })),
  setCardiacPhase: (phase: 'auto' | 'diastole' | 'systole') =>
    set((state) => ({
      cardiacPhase: phase,
      cardiacCyclePhase: phase === 'diastole' ? 'diastole' : phase === 'systole' ? 'systole' : state.cardiacCyclePhase,
    })),
  setIsAudioMuted: (muted: boolean) => set({ isAudioMuted: muted }),
  toggleAudio: () => set((state) => ({ isAudioMuted: !state.isAudioMuted })),
  setZoomLevel: (zoom: number) => set({ zoomLevel: Math.max(0.5, Math.min(2.5, Number(zoom.toFixed(2)))) }),
  zoomIn: () => set((state) => ({ zoomLevel: Math.min(2.5, Number((state.zoomLevel + 0.15).toFixed(2))) })),
  zoomOut: () => set((state) => ({ zoomLevel: Math.max(0.5, Number((state.zoomLevel - 0.15).toFixed(2))) })),
  resetZoom: () => set({ zoomLevel: 1.0 }),

  resetDemoProbabilities: () =>
    set({
      prediction: {
        vessels: { ...DEFAULT_VESSELS },
      },
      colorblindMode: false,
      showTorso: true,
      heartOpacity: 0.92,
      selectedVessel: null,
      hoveredVessel: null,
      cameraPreset: null,
      flyToVesselTarget: null,
      viewerMode: 'realistic',
      force2DFallback: false,
      webglError: false,
      isTweening: false,
      chamberCutaway: false,
      isCutOpen: false,
      dissectionPlane: 'coronal',
      cutDepth: 0.5,
      selectedInternalStructure: null,
      cardiacCyclePhase: 'systole',
      showHemodynamics: true,
      showCavities: false,
      showPerfusion: true,
      showCalibers: true,
      showECG: true,
      fluoroscopyMode: false,
      isPlaying: true,
      cardiacPhase: 'auto',
      isAudioMuted: true,
      zoomLevel: 1.0,
      selectedPersonaId: null,
      patientInputs: {},
      isDirty: false,
      activePersonaBaseline: null,
      activePersonaPredictions: null,
    }),

  setPatientInput: (field: string, value: any) =>
    set((state) => {
      const updatedInputs = {
        ...state.patientInputs,
        [field]: value,
      };
      const pr = Number(field === 'PR' ? value : updatedInputs.PR);
      const newBpm = !isNaN(pr) && pr >= 30 && pr <= 180 ? pr : state.heartRateBpm;
      return {
        patientInputs: updatedInputs,
        heartRateBpm: newBpm,
        isDirty: true,
        selectedPersonaId: state.selectedPersonaId, // Retain active persona baseline reference!
      };
    }),

  setPatientInputs: (inputs: Record<string, any>) =>
    set((state) => {
      const pr = Number(inputs.PR);
      const newBpm = !isNaN(pr) && pr >= 30 && pr <= 180 ? pr : state.heartRateBpm;
      return {
        patientInputs: { ...inputs },
        heartRateBpm: newBpm,
        isDirty: true,
      };
    }),

  setPredictions: (pred: PredictResponse) => {
    set((state) => {
      const lad = pred.vessels.LAD?.prob ?? state.prediction.vessels.LAD.prob;
      const lcx = pred.vessels.LCX?.prob ?? state.prediction.vessels.LCX.prob;
      const rca = pred.vessels.RCA?.prob ?? state.prediction.vessels.RCA.prob;

      return {
        predictions: pred,
        prediction: {
          vessels: {
            LAD: { prob: lad, label: pred.vessels.LAD?.label ?? state.prediction.vessels.LAD.label },
            LCX: { prob: lcx, label: pred.vessels.LCX?.label ?? state.prediction.vessels.LCX.label },
            RCA: { prob: rca, label: pred.vessels.RCA?.label ?? state.prediction.vessels.RCA.label },
          },
        },
      };
    });
  },

  setSelectedTarget: (target: TargetKey) => set({ selectedTarget: target }),
  setApiStatus: (status: ApiStatusKey) => set({ apiStatus: status }),
  setDemoMode: (enabled: boolean) => set({ demoMode: enabled }),
  setSelectedPersonaId: (id: string | null) => set({ selectedPersonaId: id }),
  setActiveTab: (tab: TabKey) => set({ activeTab: tab }),
  setDisclaimerAccepted: (accepted: boolean) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('cardiovision_disclaimer_accepted', accepted ? 'true' : 'false');
    }
    set({ disclaimerAccepted: accepted });
  },
  setSchema: (schema: FeatureSchemaItem[]) => set({ schema }),
  setDemoPatients: (demoPatients: DemoPatient[]) => set({ demoPatients }),

  loadPersona: (persona: DemoPatient) => {
    const vessels = persona.prediction?.vessels || (persona as any).predictions;
    const feats = (persona.features || (persona as any).inputs) || {};
    const pr = Number(feats.PR);
    const validBpm = !isNaN(pr) && pr >= 30 && pr <= 180 ? pr : 75;
    set({
      selectedPersonaId: persona.id,
      patientInputs: { ...feats },
      activePersonaBaseline: { ...feats },
      activePersonaPredictions: persona.prediction,
      isDirty: false,
      heartRateBpm: validBpm,
      predictions: persona.prediction,
      prediction: {
        vessels: {
          LAD: { prob: vessels.LAD.prob, label: vessels.LAD.label },
          LCX: { prob: vessels.LCX.prob, label: vessels.LCX.label },
          RCA: { prob: vessels.RCA.prob, label: vessels.RCA.label },
        },
      },
      demoMode: true,
      apiStatus: 'demo',
    });
  },

  setIsLoadingPrediction: (loading: boolean) => set({ isLoadingPrediction: loading }),
  setModelServerUnavailable: (unavailable: boolean) =>
    set({
      modelServerUnavailable: unavailable,
      apiStatus: unavailable ? 'unavailable' : 'live',
    }),
  setIsDirty: (dirty: boolean) => set({ isDirty: dirty }),

  resetToBaseline: () =>
    set((state) => {
      let baseline: Record<string, any> = {};
      if (state.activePersonaBaseline) {
        baseline = { ...state.activePersonaBaseline };
      } else if (state.selectedPersonaId && state.demoPatients.length > 0) {
        const found = state.demoPatients.find((p) => p.id === state.selectedPersonaId);
        if (found) {
          baseline = { ...(found.features || (found as any).inputs || {}) };
        }
      }

      if (Object.keys(baseline).length === 0 && state.schema.length > 0) {
        state.schema.forEach((item) => {
          baseline[item.name] = item.default;
        });
      }

      const pr = Number(baseline.PR);
      const newBpm = !isNaN(pr) && pr >= 30 && pr <= 180 ? pr : state.heartRateBpm;

      let nextPredictions = state.activePersonaPredictions || state.predictions;
      let nextVessels = state.prediction.vessels;

      if (state.selectedPersonaId && state.demoPatients.length > 0) {
        const found = state.demoPatients.find((p) => p.id === state.selectedPersonaId);
        if (found?.prediction) {
          nextPredictions = found.prediction;
          const v = found.prediction.vessels;
          if (v) {
            nextVessels = {
              LAD: { prob: v.LAD.prob, label: v.LAD.label },
              LCX: { prob: v.LCX.prob, label: v.LCX.label },
              RCA: { prob: v.RCA.prob, label: v.RCA.label },
            };
          }
        }
      }

      return {
        patientInputs: baseline,
        heartRateBpm: newBpm,
        predictions: nextPredictions,
        prediction: {
          ...state.prediction,
          vessels: nextVessels,
        },
        isDirty: false,
      };
    }),

  runPrediction: async () => {
    const state = useStore.getState();
    if (state.isLoadingPrediction) return;
    state.setIsLoadingPrediction(true);
    try {
      const result = await predictRisk(state.patientInputs);
      state.setPredictions(result.data);
      if (result.isFallback) {
        state.setModelServerUnavailable(true);
      } else {
        state.setModelServerUnavailable(false);
      }
      useStore.setState({ isDirty: false });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Prediction failed:', err);
        state.setModelServerUnavailable(true);
      }
    } finally {
      useStore.getState().setIsLoadingPrediction(false);
    }
  },
  isModelInfoOpen: false,
  openModelInfo: () => set({ isModelInfoOpen: true }),
  closeModelInfo: () => set({ isModelInfoOpen: false }),
  toggleModelInfo: () => set((state) => ({ isModelInfoOpen: !state.isModelInfoOpen })),
  isSensitivityOpen: false,
  openSensitivity: () => set({ isSensitivityOpen: true }),
  closeSensitivity: () => set({ isSensitivityOpen: false }),
  toggleSensitivity: () => set((state) => ({ isSensitivityOpen: !state.isSensitivityOpen })),
}));
