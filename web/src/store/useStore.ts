import { create } from 'zustand';
import type { DemoPatient, FeatureSchemaItem, PredictResponse } from '../api/client.ts';

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
  selectedInternalStructure: string | null;
  cardiacCyclePhase: CardiacCyclePhase;

  // Heart Beating & Biomechanical Motion State
  isBeating: boolean;
  heartRateBpm: number;
  beatingSpeed: number; // 1.0 = real-time, 0.5 = slow motion

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
  setSelectedInternalStructure: (structureId: string | null) => void;
  setCardiacCyclePhase: (phase: CardiacCyclePhase) => void;

  // Heart Beating Actions
  setIsBeating: (beating: boolean) => void;
  toggleBeating: () => void;
  setHeartRateBpm: (bpm: number) => void;
  setBeatingSpeed: (speed: number) => void;

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
  selectedInternalStructure: null,
  cardiacCyclePhase: 'systole',

  // Beating & Biomechanical Motion Initial State
  isBeating: true,
  heartRateBpm: 72,
  beatingSpeed: 1.0,

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
  toggleChamberCutaway: () => set((state) => ({ chamberCutaway: !state.chamberCutaway })),

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

  toggleCutOpen: () => set((state) => ({ isCutOpen: !state.isCutOpen })),
  setIsCutOpen: (open: boolean) => set({ isCutOpen: open }),
  setDissectionPlane: (plane: DissectionPlane) => set({ dissectionPlane: plane }),
  setCutDepth: (depth: number) => set({ cutDepth: Math.max(0, Math.min(1, depth)) }),
  setSelectedInternalStructure: (structureId: string | null) => set({ selectedInternalStructure: structureId }),
  setCardiacCyclePhase: (phase: CardiacCyclePhase) => set({ cardiacCyclePhase: phase }),

  setIsBeating: (beating: boolean) => set({ isBeating: beating }),
  toggleBeating: () => set((state) => ({ isBeating: !state.isBeating })),
  setHeartRateBpm: (bpm: number) => set({ heartRateBpm: Math.max(30, Math.min(180, bpm)) }),
  setBeatingSpeed: (speed: number) => set({ beatingSpeed: Math.max(0.1, Math.min(3.0, speed)) }),

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
      isCutOpen: false,
      dissectionPlane: 'coronal',
      cutDepth: 0.5,
      selectedInternalStructure: null,
      cardiacCyclePhase: 'systole',
    }),

  setPatientInput: (field: string, value: any) =>
    set((state) => ({
      patientInputs: {
        ...state.patientInputs,
        [field]: value,
      },
      selectedPersonaId: null,
    })),

  setPatientInputs: (inputs: Record<string, any>) =>
    set({ patientInputs: { ...inputs } }),

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
    set({
      selectedPersonaId: persona.id,
      patientInputs: { ...(persona.features || (persona as any).inputs) },
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
  isModelInfoOpen: false,
  openModelInfo: () => set({ isModelInfoOpen: true }),
  closeModelInfo: () => set({ isModelInfoOpen: false }),
  toggleModelInfo: () => set((state) => ({ isModelInfoOpen: !state.isModelInfoOpen })),
  isSensitivityOpen: false,
  openSensitivity: () => set({ isSensitivityOpen: true }),
  closeSensitivity: () => set({ isSensitivityOpen: false }),
  toggleSensitivity: () => set((state) => ({ isSensitivityOpen: !state.isSensitivityOpen })),
}));
