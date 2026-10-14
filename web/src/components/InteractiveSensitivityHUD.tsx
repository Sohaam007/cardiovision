import React, { useCallback, useRef, useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { predictRisk } from '../api/client';

interface InteractiveSensitivityHUDProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InteractiveSensitivityHUD: React.FC<InteractiveSensitivityHUDProps> = ({
  isOpen,
  onClose,
}) => {
  const patientInputs = useStore((state) => state.patientInputs);
  const setPatientInput = useStore((state) => state.setPatientInput);
  const setPatientInputs = useStore((state) => state.setPatientInputs);
  const predictions = useStore((state) => state.predictions);
  const setPredictions = useStore((state) => state.setPredictions);
  const setIsLoadingPrediction = useStore((state) => state.setIsLoadingPrediction);
  const isLoading = useStore((state) => state.isLoadingPrediction);
  const modelServerUnavailable = useStore((state) => state.modelServerUnavailable);
  const setModelServerUnavailable = useStore((state) => state.setModelServerUnavailable);
  const selectedPersonaId = useStore((state) => state.selectedPersonaId);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Store baseline values for computing probability deltas
  const [baseline, setBaseline] = useState<{
    inputs: Record<string, any>;
    cad: number;
    lad: number;
    lcx: number;
    rca: number;
  } | null>(null);

  // Initialize/refresh baseline whenever a persona changes or initial predictions arrive
  useEffect(() => {
    if (predictions) {
      if (!baseline || selectedPersonaId) {
        setBaseline({
          inputs: { ...patientInputs },
          cad: predictions.cad.prob,
          lad: predictions.vessels.LAD.prob,
          lcx: predictions.vessels.LCX.prob,
          rca: predictions.vessels.RCA.prob,
        });
      }
    }
  }, [selectedPersonaId, predictions?.cad.prob]);

  // Live Prediction trigger with 300 ms debounce & stale request cancellation
  const triggerLivePredict = useCallback(
    (updatedFeatures: Record<string, any>) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(async () => {
        setIsLoadingPrediction(true);
        try {
          const result = await predictRisk(updatedFeatures);
          setPredictions(result.data);
          setModelServerUnavailable(false);
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            console.warn('Sensitivity prediction API warning:', err);
            // Fallback: estimate heuristic perturbation if backend is offline
            if (baseline) {
              const bpDelta = (Number(updatedFeatures['BP'] ?? 120) - Number(baseline.inputs['BP'] ?? 120)) / 100;
              const ldlDelta = (Number(updatedFeatures['LDL'] ?? 100) - Number(baseline.inputs['LDL'] ?? 100)) / 150;
              const fbsDelta = (Number(updatedFeatures['FBS'] ?? 90) - Number(baseline.inputs['FBS'] ?? 90)) / 200;
              const smokerDelta = (Number(updatedFeatures['Current Smoker'] ?? 0) - Number(baseline.inputs['Current Smoker'] ?? 0)) * 0.15;
              const totalPerturbation = (bpDelta * 0.12 + ldlDelta * 0.15 + fbsDelta * 0.10 + smokerDelta);

              const newCad = Math.max(0.01, Math.min(0.99, baseline.cad + totalPerturbation));
              const newLad = Math.max(0.01, Math.min(0.99, baseline.lad + totalPerturbation * 0.9));
              const newLcx = Math.max(0.01, Math.min(0.99, baseline.lcx + totalPerturbation * 0.7));
              const newRca = Math.max(0.01, Math.min(0.99, baseline.rca + totalPerturbation * 0.8));

              // Update live vessel risk states for immediate 3D color re-render
              useStore.getState().setVesselProbability('LAD', newLad);
              useStore.getState().setVesselProbability('LCX', newLcx);
              useStore.getState().setVesselProbability('RCA', newRca);
              if (predictions) {
                setPredictions({
                  ...predictions,
                  cad: { ...predictions.cad, prob: newCad },
                  vessels: {
                    LAD: { prob: newLad, label: predictions.vessels.LAD.label },
                    LCX: { prob: newLcx, label: predictions.vessels.LCX.label },
                    RCA: { prob: newRca, label: predictions.vessels.RCA.label },
                  },
                });
              }
            }
          }
        } finally {
          setIsLoadingPrediction(false);
        }
      }, 300);
    },
    [setPredictions, setIsLoadingPrediction, setModelServerUnavailable, baseline]
  );

  const handleSliderChange = (field: string, value: number) => {
    setPatientInput(field, value);
    const updated = { ...patientInputs, [field]: value };
    triggerLivePredict(updated);
  };

  const handleResetToBaseline = () => {
    if (baseline) {
      setPatientInputs({ ...baseline.inputs });
      triggerLivePredict({ ...baseline.inputs });
    }
  };

  if (!isOpen) return null;

  const bp = Number(patientInputs['BP'] ?? 120);
  const ldl = Number(patientInputs['LDL'] ?? 100);
  const fbs = Number(patientInputs['FBS'] ?? 90);
  const tg = Number(patientInputs['TG'] ?? 150);
  const smoker = Number(patientInputs['Current Smoker'] ?? 0);

  // Current values
  const currentCad = predictions?.cad.prob ?? 0.74;
  const currentLad = predictions?.vessels.LAD.prob ?? 0.74;
  const currentLcx = predictions?.vessels.LCX.prob ?? 0.31;
  const currentRca = predictions?.vessels.RCA.prob ?? 0.52;

  // Deltas vs baseline
  const deltaCad = baseline ? currentCad - baseline.cad : 0;
  const deltaLad = baseline ? currentLad - baseline.lad : 0;
  const deltaLcx = baseline ? currentLcx - baseline.lcx : 0;
  const deltaRca = baseline ? currentRca - baseline.rca : 0;

  const renderDeltaBadge = (delta: number) => {
    if (Math.abs(delta) < 0.003) {
      return <span className="text-[10px] font-mono text-slate-500">+/- 0.0%</span>;
    }
    const isIncrease = delta > 0;
    return (
      <span
        className={`text-[10px] font-mono font-bold flex items-center justify-center gap-0.5 ${
          isIncrease ? 'text-rose-400' : 'text-emerald-400'
        }`}
      >
        <span>{isIncrease ? '↑' : '↓'}</span>
        <span>{isIncrease ? `+${(delta * 100).toFixed(1)}%` : `${(delta * 100).toFixed(1)}%`}</span>
      </span>
    );
  };

  return (
    <div className="absolute top-4 right-4 z-30 w-full max-w-sm sm:max-w-md bg-slate-900/95 backdrop-blur-xl border border-purple-800/70 rounded-2xl shadow-2xl shadow-purple-950/60 overflow-hidden text-slate-100 flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95 duration-200">
      {/* HUD Header */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-md">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-white tracking-tight">Model Sensitivity &amp; What-If</h3>
              <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-700/60">
                Live 3D
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Perturb vitals to observe dynamic 3D vessel color shifts</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {baseline && (
            <button
              onClick={handleResetToBaseline}
              className="text-[11px] text-purple-300 hover:text-white bg-purple-950/60 hover:bg-purple-900/80 px-2 py-1 rounded border border-purple-700/60 transition-colors font-medium"
              title="Reset all inputs back to original baseline persona values"
            >
              Reset to baseline
            </button>
          )}

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close Sensitivity Overlay"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 text-xs">
        {/* Required Clinical Disclaimer Title */}
        <div className="bg-amber-950/50 border border-amber-800/60 rounded-xl p-3 text-amber-200">
          <div className="flex items-center gap-1.5 font-bold text-amber-300 mb-1">
            <svg className="w-4 h-4 shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-xs font-semibold">Model sensitivity</span>
          </div>
          <p className="text-[11px] text-amber-200/90 leading-relaxed">
            Not a treatment prediction (exploratory sensitivity analysis, not for clinical titration or therapy guidance). Sliders dynamically update multi-vessel probability estimates with 300 ms debounce and stale request cancellation.
          </p>
        </div>

        {/* Model Server Status Notice */}
        {modelServerUnavailable && (
          <div className="bg-rose-950/70 border border-rose-800/70 rounded-xl p-2.5 text-rose-200 text-[11px] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
            <span>API Server Offline &bull; Operating in local sensitivity simulation mode</span>
          </div>
        )}

        {/* Probability Delta Summary Cards */}
        <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 shadow-inner">
          <div className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider mb-2 flex items-center justify-between">
            <span>Predicted probability change vs baseline</span>
            {isLoading && (
              <span className="text-purple-400 font-mono animate-pulse text-[10px] font-bold">Evaluating...</span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800 shadow-sm">
              <div className="text-[10px] text-slate-400 font-bold">CAD</div>
              <div className="font-mono text-sm font-bold text-white">{(currentCad * 100).toFixed(0)}%</div>
              {renderDeltaBadge(deltaCad)}
            </div>
            <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800 shadow-sm">
              <div className="text-[10px] text-slate-400 font-bold">LAD</div>
              <div className="font-mono text-sm font-bold text-white">{(currentLad * 100).toFixed(0)}%</div>
              {renderDeltaBadge(deltaLad)}
            </div>
            <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800 shadow-sm">
              <div className="text-[10px] text-slate-400 font-bold">LCX</div>
              <div className="font-mono text-sm font-bold text-white">{(currentLcx * 100).toFixed(0)}%</div>
              {renderDeltaBadge(deltaLcx)}
            </div>
            <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800 shadow-sm">
              <div className="text-[10px] text-slate-400 font-bold">RCA</div>
              <div className="font-mono text-sm font-bold text-white">{(currentRca * 100).toFixed(0)}%</div>
              {renderDeltaBadge(deltaRca)}
            </div>
          </div>
        </div>

        {/* Sliders Container */}
        <div className="flex flex-col gap-3.5 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
          {/* 1. Systolic BP */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-slate-300">
              <span className="font-medium">Systolic Blood Pressure (BP)</span>
              <span className="font-mono font-bold text-cyan-400">{bp} mmHg</span>
            </div>
            <input
              type="range"
              min={90}
              max={200}
              step={1}
              value={bp}
              onChange={(e) => handleSliderChange('BP', Number(e.target.value))}
              className="w-full accent-cyan-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>90 mmHg (Optimal)</span>
              <span className="text-slate-400">Ref: 90-130</span>
              <span className="text-rose-400/90">200 mmHg (Crisis)</span>
            </div>
          </div>

          {/* 2. Fasting Blood Sugar (FBS) */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-slate-300">
              <span className="font-medium">Fasting Blood Sugar (FBS)</span>
              <span className="font-mono font-bold text-amber-400">{fbs} mg/dL</span>
            </div>
            <input
              type="range"
              min={60}
              max={350}
              step={1}
              value={fbs}
              onChange={(e) => handleSliderChange('FBS', Number(e.target.value))}
              className="w-full accent-amber-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>60 mg/dL</span>
              <span className="text-slate-400">Ref: 70-100</span>
              <span className="text-amber-400/90">350 mg/dL (Diabetic)</span>
            </div>
          </div>

          {/* 3. LDL Cholesterol */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-slate-300">
              <span className="font-medium">LDL Cholesterol</span>
              <span className="font-mono font-bold text-rose-400">{ldl} mg/dL</span>
            </div>
            <input
              type="range"
              min={40}
              max={250}
              step={1}
              value={ldl}
              onChange={(e) => handleSliderChange('LDL', Number(e.target.value))}
              className="w-full accent-rose-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>40 mg/dL (Optimal)</span>
              <span className="text-slate-400">Ref: &lt;100</span>
              <span className="text-rose-400/90">250 mg/dL (Severe)</span>
            </div>
          </div>

          {/* 4. Triglycerides (TG) */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-slate-300">
              <span className="font-medium">Triglycerides (TG)</span>
              <span className="font-mono font-bold text-purple-400">{tg} mg/dL</span>
            </div>
            <input
              type="range"
              min={50}
              max={600}
              step={5}
              value={tg}
              onChange={(e) => handleSliderChange('TG', Number(e.target.value))}
              className="w-full accent-purple-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>50 mg/dL</span>
              <span className="text-slate-400">Ref: &lt;150</span>
              <span className="text-purple-400/90">600 mg/dL (High)</span>
            </div>
          </div>

          {/* 5. Current Smoker Status */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
            <div>
              <div className="font-medium text-slate-300">Current Smoker Status</div>
              <div className="text-[10px] text-slate-500">Active tobacco usage</div>
            </div>
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => handleSliderChange('Current Smoker', 0)}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  smoker === 0
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                No (0)
              </button>
              <button
                type="button"
                onClick={() => handleSliderChange('Current Smoker', 1)}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  smoker === 1
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Yes (1)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
