import { create } from 'zustand';
import type { DemoPatient, FeatureSchemaItem, PredictResponse } from '../api/client.ts';

export type VesselKey = 'LAD' | 'LCX' | 'RCA';
export type TargetKey = 'CAD' | 'LAD' | 'LCX' | 'RCA';
export type TabKey = 'form' | 'sensitivity' | 'explainability' | '3d_debug';
export type ApiStatusKey = 'idle' | 'waking' | 'live' | 'demo' | 'unavailable';

export interface VesselData {
  prob: number;
  label?: number;
}

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
  force2DFallback: boolean;
  webglError: boolean;
  isTweening: boolean;

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
  setForce2DFallback: (force: boolean) => void;
  setWebglError: (error: boolean) => void;
  setIsTweening: (tweening: boolean) => void;
  resetDemoProbabilities: () => void;

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
  force2DFallback: false,
  webglError: false,
  isTweening: false,

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
      // If a vessel is selected, also switch selectedTarget to that vessel if applicable
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

  setForce2DFallback: (force: boolean) => set({ force2DFallback: force }),
  setWebglError: (error: boolean) => set({ webglError: error }),
  setIsTweening: (tweening: boolean) => set({ isTweening: tweening }),

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
      force2DFallback: false,
      webglError: false,
      isTweening: false,
    }),

  setPatientInput: (field: string, value: any) =>
    set((state) => ({
      patientInputs: {
        ...state.patientInputs,
        [field]: value,
      },
      selectedPersonaId: null, // Clear persona badge when inputs are manually customized
    })),

  setPatientInputs: (inputs: Record<string, any>) =>
    set({ patientInputs: { ...inputs } }),

  setPredictions: (pred: PredictResponse) =>
    set({
      predictions: pred,
      prediction: {
        vessels: {
          LAD: { prob: pred.vessels.LAD.prob, label: pred.vessels.LAD.label },
          LCX: { prob: pred.vessels.LCX.prob, label: pred.vessels.LCX.label },
          RCA: { prob: pred.vessels.RCA.prob, label: pred.vessels.RCA.label },
        },
      },
    }),

  setSelectedTarget: (target: TargetKey) =>
    set({
      selectedTarget: target,
      selectedVessel: target === 'CAD' ? null : (target as VesselKey),
    }),

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

  setSchema: (schema: FeatureSchemaItem[]) => {
    set((state) => {
      // If patient inputs are empty, initialize from schema defaults
      const initialInputs: Record<string, any> = { ...state.patientInputs };
      schema.forEach((item) => {
        if (initialInputs[item.name] === undefined) {
          initialInputs[item.name] = item.default;
        }
      });
      return { schema, patientInputs: initialInputs };
    });
  },

  setDemoPatients: (patients: DemoPatient[]) => set({ demoPatients: patients }),

  loadPersona: (persona: DemoPatient) => {
    set({
      selectedPersonaId: persona.id,
      patientInputs: { ...persona.features },
      predictions: persona.prediction,
      modelServerUnavailable: false,
      apiStatus: 'demo',
      demoMode: true,
      prediction: {
        vessels: {
          LAD: { prob: persona.prediction.vessels.LAD.prob, label: persona.prediction.vessels.LAD.label },
          LCX: { prob: persona.prediction.vessels.LCX.prob, label: persona.prediction.vessels.LCX.label },
          RCA: { prob: persona.prediction.vessels.RCA.prob, label: persona.prediction.vessels.RCA.label },
        },
      },
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

if (typeof window !== 'undefined') {
  (window as any).__CARDIOVISION_STORE__ = useStore;
}

