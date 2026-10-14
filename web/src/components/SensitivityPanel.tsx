import React, { useCallback, useRef } from 'react';
import { useStore } from '../store/useStore';
import { predictRisk } from '../api/client';

export const SensitivityPanel: React.FC = () => {
  const patientInputs = useStore((state) => state.patientInputs);
  const setPatientInput = useStore((state) => state.setPatientInput);
  const setPredictions = useStore((state) => state.setPredictions);
  const setIsLoadingPrediction = useStore((state) => state.setIsLoadingPrediction);
  const isLoading = useStore((state) => state.isLoadingPrediction);
  const modelServerUnavailable = useStore((state) => state.modelServerUnavailable);
  const setModelServerUnavailable = useStore((state) => state.setModelServerUnavailable);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  const bp = Number(patientInputs['BP'] ?? 120);
  const ldl = Number(patientInputs['LDL'] ?? 100);
  const fbs = Number(patientInputs['FBS'] ?? 90);
  const tg = Number(patientInputs['TG'] ?? 150);
  const ef = Number(patientInputs['EF-TTE'] ?? 50);
  const smoker = Number(patientInputs['Current Smoker'] ?? 0);

  return (
    <div className="flex flex-col gap-4 text-xs">
      <div className="bg-amber-950/40 border border-amber-800/40 rounded-lg p-3 text-amber-200">
        <div className="flex items-center gap-2 font-semibold text-amber-300 mb-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span className="text-sm font-bold">Model sensitivity</span>
        </div>
        <p className="text-[11px] text-amber-200/90 leading-relaxed">
          Not a treatment prediction (exploratory sensitivity analysis, not for clinical titration or therapy guidance).
          Sliders dynamically update multi-vessel probability estimates and log-odds contributions.
        </p>
      </div>

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

      {isLoading && (
        <div className="text-[11px] text-cyan-400 font-medium flex items-center gap-1.5 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          <span>Computing live calibrated log-odds inference...</span>
        </div>
      )}

      {/* Sliders Container */}
      <div className="flex flex-col gap-3.5 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
        {/* Systolic BP */}
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
            <span>90 mmHg (Normal)</span>
            <span>Ref: 90-130</span>
            <span>200 mmHg (Crisis)</span>
          </div>
        </div>

        {/* LDL Cholesterol */}
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

        {/* Fasting Blood Sugar */}
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

        {/* Triglycerides */}
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

        {/* Ejection Fraction */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center text-slate-300">
            <span className="font-medium">Left Ventricular EF (EF-TTE)</span>
            <span className="font-mono font-bold text-cyan-400">{ef}%</span>
          </div>
          <input
            type="range"
            min={15}
            max={65}
            step={1}
            value={ef}
            onChange={(e) => handleSliderChange('EF-TTE', Number(e.target.value))}
            className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>15% (Severe reduction)</span>
            <span>Ref: 50-70%</span>
            <span>65% (Normal)</span>
          </div>
        </div>

        {/* Current Smoker Toggle */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
          <div>
            <span className="text-slate-300 font-medium block">Current Smoker Status</span>
            <span className="text-[10px] text-slate-500">Active tobacco usage</span>
          </div>
          <button
            onClick={() => handleToggleChange('Current Smoker', smoker === 1 ? 0 : 1)}
            className={`px-3 py-1 rounded font-bold transition-all ${
              smoker === 1
                ? 'bg-rose-600 text-white shadow'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {smoker === 1 ? 'Yes (Active)' : 'No (Non-smoker)'}
          </button>
        </div>
      </div>
    </div>
  );
};
