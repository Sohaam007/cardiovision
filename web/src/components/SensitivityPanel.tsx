import React, { useCallback, useRef, useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { predictRisk } from '../api/client';

export const SensitivityPanel: React.FC = () => {
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

  // Baseline store for computing probability deltas
  const [baseline, setBaseline] = useState<{
    inputs: Record<string, any>;
    cad: number;
    lad: number;
    lcx: number;
    rca: number;
  } | null>(null);

  // Update baseline whenever a new persona is selected or initial predictions arrive
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
            console.warn('Sensitivity prediction API error:', err);
            setModelServerUnavailable(true);
          }
        } finally {
          setIsLoadingPrediction(false);
        }
      }, 300);
    },
    [setPredictions, setIsLoadingPrediction, setModelServerUnavailable]
  );

  const handleSliderChange = (field: string, value: number) => {
    setPatientInput(field, value);
    const updated = { ...patientInputs, [field]: value };
    triggerLivePredict(updated);
  };

  const handleToggleChange = (field: string, value: number) => {
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

  const bp = Number(patientInputs['BP'] ?? 120);
  const ldl = Number(patientInputs['LDL'] ?? 100);
  const fbs = Number(patientInputs['FBS'] ?? 90);
  const tg = Number(patientInputs['TG'] ?? 150);
  const smoker = Number(patientInputs['Current Smoker'] ?? 0);

  // Compute deltas versus baseline
  const currentCad = predictions?.cad.prob ?? 0;
  const currentLad = predictions?.vessels.LAD.prob ?? 0;
  const currentLcx = predictions?.vessels.LCX.prob ?? 0;
  const currentRca = predictions?.vessels.RCA.prob ?? 0;

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
          isIncrease ? 'text-rose-400' : 'text-teal-400'
        }`}
      >
        <span>{isIncrease ? '↑' : '↓'}</span>
        <span>{isIncrease ? `+${(delta * 100).toFixed(1)}%` : `${(delta * 100).toFixed(1)}%`}</span>
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-3.5 text-xs">
      {/* Required Clinical Disclaimer Title */}
      <div className="bg-amber-950/40 border border-amber-800/40 rounded-lg p-3 text-amber-200">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span className="text-sm">Model sensitivity</span>
          </div>

          {baseline && (
            <button
              onClick={handleResetToBaseline}
              className="text-[10px] text-amber-400 hover:text-amber-200 underline font-medium"
            >
              Reset to baseline
            </button>
          )}
        </div>
        <p className="text-[11px] text-amber-200/90 leading-relaxed">
          Not a treatment prediction (exploratory sensitivity analysis, not for clinical titration or therapy guidance).
          Sliders dynamically update multi-vessel probability estimates with 300 ms debounce and stale request cancellation.
        </p>
      </div>

      {/* Model Server Outage State */}
      {modelServerUnavailable && (
        <div className="bg-rose-950/70 border border-rose-700/80 rounded-lg p-3 text-rose-200 text-xs flex items-start gap-2 shadow-lg">
          <svg className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <span className="font-semibold text-rose-300">Model server unavailable</span>
            <p className="text-[11px] text-rose-200/90 mt-0.5">
              Edited inputs cannot be evaluated because the model server is offline. Cached numbers are not shown as live predictions. Please select a holdout persona above for verified offline demo cases.
            </p>
          </div>
        </div>
      )}

      {/* Probability Delta Summary Cards */}
      {baseline && !modelServerUnavailable && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5">
          <div className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider mb-1.5 flex items-center justify-between">
            <span>Predicted probability change vs baseline</span>
            {isLoading && (
              <span className="text-cyan-400 font-mono animate-pulse text-[9px]">Evaluating...</span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-1.5 text-center">
            <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800">
              <div className="text-[10px] text-slate-400 font-bold">CAD</div>
              <div className="font-mono text-xs font-bold text-slate-100">{(currentCad * 100).toFixed(0)}%</div>
              {renderDeltaBadge(deltaCad)}
            </div>
            <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800">
              <div className="text-[10px] text-slate-400 font-bold">LAD</div>
              <div className="font-mono text-xs font-bold text-slate-100">{(currentLad * 100).toFixed(0)}%</div>
              {renderDeltaBadge(deltaLad)}
            </div>
            <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800">
              <div className="text-[10px] text-slate-400 font-bold">LCX</div>
              <div className="font-mono text-xs font-bold text-slate-100">{(currentLcx * 100).toFixed(0)}%</div>
              {renderDeltaBadge(deltaLcx)}
            </div>
            <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800">
              <div className="text-[10px] text-slate-400 font-bold">RCA</div>
              <div className="font-mono text-xs font-bold text-slate-100">{(currentRca * 100).toFixed(0)}%</div>
              {renderDeltaBadge(deltaRca)}
            </div>
          </div>
        </div>
      )}

      {/* Sliders Container */}
      <div className="flex flex-col gap-3.5 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
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
            className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>90 mmHg (Optimal)</span>
            <span>Ref: 90-130</span>
            <span>200 mmHg (Crisis)</span>
          </div>
        </div>

        {/* 2. Fasting Blood Sugar (FBS) */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center text-slate-300">
            <span className="font-medium">Fasting Blood Sugar (FBS)</span>
            <span className="font-mono font-bold text-cyan-400">{fbs} mg/dL</span>
          </div>
          <input
            type="range"
            min={60}
            max={350}
            step={1}
            value={fbs}
            onChange={(e) => handleSliderChange('FBS', Number(e.target.value))}
            className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>60 mg/dL</span>
            <span>Ref: 70-100</span>
            <span>350 mg/dL (Diabetic)</span>
          </div>
        </div>

        {/* 3. LDL Cholesterol */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center text-slate-300">
            <span className="font-medium">LDL Cholesterol</span>
            <span className="font-mono font-bold text-cyan-400">{ldl} mg/dL</span>
          </div>
          <input
            type="range"
            min={40}
            max={250}
            step={1}
            value={ldl}
            onChange={(e) => handleSliderChange('LDL', Number(e.target.value))}
            className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>40 mg/dL (Optimal)</span>
            <span>Ref: &lt;100</span>
            <span>250 mg/dL (Severe)</span>
          </div>
        </div>

        {/* 4. Triglycerides (TG) */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center text-slate-300">
            <span className="font-medium">Triglycerides (TG)</span>
            <span className="font-mono font-bold text-cyan-400">{tg} mg/dL</span>
          </div>
          <input
            type="range"
            min={50}
            max={600}
            step={5}
            value={tg}
            onChange={(e) => handleSliderChange('TG', Number(e.target.value))}
            className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>50 mg/dL</span>
            <span>Ref: &lt;150</span>
            <span>600 mg/dL (High)</span>
          </div>
        </div>

        {/* 5. Current Smoker Status */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
          <div>
            <span className="text-slate-300 font-medium block">Current Smoker Status</span>
            <span className="text-[10px] text-slate-500">Active tobacco usage</span>
          </div>
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-slate-800">
            <button
              type="button"
              onClick={() => handleToggleChange('Current Smoker', 0)}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                smoker === 0
                  ? 'bg-slate-700 text-slate-100 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              No (0)
            </button>
            <button
              type="button"
              onClick={() => handleToggleChange('Current Smoker', 1)}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                smoker === 1
                  ? 'bg-rose-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Yes (1)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
