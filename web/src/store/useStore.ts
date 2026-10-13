import { create } from 'zustand';

export type VesselKey = 'LAD' | 'LCX' | 'RCA';

export interface VesselData {
  prob: number;
  label?: number;
}

export interface AppState {
  prediction: {
    vessels: Record<VesselKey, VesselData>;
  };
  colorblindMode: boolean;
  showTorso: boolean;
  heartOpacity: number;
  selectedVessel: VesselKey | null;
  hoveredVessel: VesselKey | null;
  cameraPreset: 'anterior' | 'lateral' | 'posterior' | null;

  // Actions
  setVesselProbability: (vessel: VesselKey, prob: number) => void;
  setColorblindMode: (enabled: boolean) => void;
  toggleColorblindMode: () => void;
  setShowTorso: (show: boolean) => void;
  toggleTorso: () => void;
  setHeartOpacity: (opacity: number) => void;
  setSelectedVessel: (vessel: VesselKey | null) => void;
  setHoveredVessel: (vessel: VesselKey | null) => void;
  setCameraPreset: (preset: 'anterior' | 'lateral' | 'posterior' | null) => void;
  resetDemoProbabilities: () => void;
}

const DEFAULT_VESSELS: Record<VesselKey, VesselData> = {
  LAD: { prob: 0.74, label: 1 },
  LCX: { prob: 0.31, label: 0 },
  RCA: { prob: 0.52, label: 1 },
};

export const useStore = create<AppState>()((set) => ({
  prediction: {
    vessels: { ...DEFAULT_VESSELS },
  },
  colorblindMode: false,
  showTorso: true,
  heartOpacity: 0.92,
  selectedVessel: null,
  hoveredVessel: null,
  cameraPreset: null,

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

  setHeartOpacity: (opacity: number) =>
    set({ heartOpacity: Math.max(0.1, Math.min(1, opacity)) }),

  setSelectedVessel: (vessel: VesselKey | null) => set({ selectedVessel: vessel }),
  setHoveredVessel: (vessel: VesselKey | null) => set({ hoveredVessel: vessel }),
  setCameraPreset: (preset) => set({ cameraPreset: preset }),

  resetDemoProbabilities: () =>
    set({
      prediction: {
        vessels: {
          LAD: { prob: 0.74, label: 1 },
          LCX: { prob: 0.31, label: 0 },
          RCA: { prob: 0.52, label: 1 },
        },
      },
      colorblindMode: false,
      showTorso: true,
      heartOpacity: 0.92,
      selectedVessel: null,
      hoveredVessel: null,
      cameraPreset: null,
    }),
}));
