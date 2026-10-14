import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { FeatureSchemaItem, predictRisk } from '../api/client';

export const ClinicalForm: React.FC = () => {
  const schema = useStore((state) => state.schema);
  const patientInputs = useStore((state) => state.patientInputs);
  const setPatientInput = useStore((state) => state.setPatientInput);
  const setPatientInputs = useStore((state) => state.setPatientInputs);
  const setPredictions = useStore((state) => state.setPredictions);
  const setIsLoadingPrediction = useStore((state) => state.setIsLoadingPrediction);
  const isLoading = useStore((state) => state.isLoadingPrediction);
  const selectedPersonaId = useStore((state) => state.selectedPersonaId);
  const demoPatients = useStore((state) => state.demoPatients);
  const setModelServerUnavailable = useStore((state) => state.setModelServerUnavailable);

  // Collapsible section states
  const [collapsed, setCollapsed] = useState<{ vitals: boolean; ecg: boolean; echo: boolean }>({
    vitals: false,
    ecg: false,
    echo: false,
  });

  const toggleSection = (sec: 'vitals' | 'ecg' | 'echo') => {
    setCollapsed((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  const handleInputChange = (name: string, val: any) => {
    setPatientInput(name, val);
  };

  const handleReset = () => {
    // If a persona is selected, reset to persona features
    if (selectedPersonaId) {
      const activePersona = demoPatients.find((p) => p.id === selectedPersonaId);
      if (activePersona) {
        setPatientInputs({ ...activePersona.features });
        setPredictions(activePersona.prediction);
        return;
      }
    }
    // Otherwise reset to schema defaults
    const defaults: Record<string, any> = {};
    schema.forEach((item) => {
      defaults[item.name] = item.default;
    });
    setPatientInputs(defaults);
  };

  // Validation
  const validationErrors: Record<string, string> = {};
  schema.forEach((item) => {
    if (item.type === 'numeric') {
      const val = patientInputs[item.name] ?? item.default;
      if (typeof val === 'number' && !Number.isNaN(val)) {
        if (item.min !== null && val < item.min) {
          validationErrors[item.name] = `Must be >= ${item.min} ${item.unit || ''}`.trim();
        } else if (item.max !== null && val > item.max) {
          validationErrors[item.name] = `Must be <= ${item.max} ${item.unit || ''}`.trim();
        }
      }
    }
  });

  const errorCount = Object.keys(validationErrors).length;

  const handleRunPredict = async () => {
    if (errorCount > 0) return;
    setIsLoadingPrediction(true);
    try {
      const result = await predictRisk(patientInputs);
      setPredictions(result.data);
      setModelServerUnavailable(false);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Prediction failed:', err);
        setModelServerUnavailable(true);
      }
    } finally {
      setIsLoadingPrediction(false);
    }
  };

  const vitalsFeatures = schema.filter((item: FeatureSchemaItem) => item.group === 'vitals_history');
  const ecgFeatures = schema.filter((item: FeatureSchemaItem) => item.group === 'ecg');
  const echoLabFeatures = schema.filter((item: FeatureSchemaItem) => item.group === 'echo_lab');

  const renderField = (item: FeatureSchemaItem) => {
    const val = patientInputs[item.name] ?? item.default;
    const errorMsg = validationErrors[item.name];

    const refText = item.reference_range
      ? `Ref: ${item.reference_range.low}-${item.reference_range.high} ${item.unit}${
          item.reference_range.source ? ` (${item.reference_range.source})` : ''
        }`
      : item.unit
      ? `Unit: ${item.unit}`
      : null;

    if (item.type === 'binary') {
      const isYes = val === 1 || String(val).toUpperCase() === 'Y';
      return (
        <div key={item.name} className="flex items-center justify-between py-2 border-b border-slate-900/60">
          <div className="flex flex-col pr-2">
            <span className="text-slate-300 font-medium text-xs">{item.name}</span>
            {refText && <span className="text-[10px] text-slate-500 font-mono">{refText}</span>}
          </div>
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-slate-800">
            <button
              type="button"
              onClick={() => handleInputChange(item.name, 0)}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                !isYes
                  ? 'bg-slate-700 text-slate-100 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              No (0)
            </button>
            <button
              type="button"
              onClick={() => handleInputChange(item.name, 1)}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                isYes
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Yes (1)
            </button>
          </div>
        </div>
      );
    }

    if (item.type === 'categorical') {
      const options = item.options || [];
      return (
        <div key={item.name} className="flex items-center justify-between py-2 border-b border-slate-900/60">
          <div className="flex flex-col pr-2">
            <span className="text-slate-300 font-medium text-xs">{item.name}</span>
            {refText && <span className="text-[10px] text-slate-500 font-mono">{refText}</span>}
          </div>
          <select
            value={val}
            onChange={(e) => handleInputChange(item.name, e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-cyan-500"
          >
            {options.map((opt) => (
              <option key={String(opt)} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      );
    }

    // Numeric input with inline validation
    const hasError = Boolean(errorMsg);
    return (
      <div key={item.name} className="py-2 border-b border-slate-900/60 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div className="flex flex-col pr-2">
            <span className="text-slate-300 font-medium text-xs">{item.name}</span>
            {refText && <span className="text-[10px] text-slate-500 font-mono">{refText}</span>}
          </div>
          <input
            type="number"
            min={item.min ?? undefined}
            max={item.max ?? undefined}
            step={item.name === 'BMI' || item.name === 'CR' || item.name === 'HDL' ? 0.1 : 1}
            value={val}
            onChange={(e) => handleInputChange(item.name, parseFloat(e.target.value) || 0)}
            className={`w-24 bg-slate-800 border rounded px-2 py-1 text-xs text-right font-mono focus:outline-none ${
              hasError
                ? 'border-rose-500 text-rose-300 focus:border-rose-400 bg-rose-950/20'
                : 'border-slate-700 text-slate-200 focus:border-cyan-500'
            }`}
          />
        </div>
        {hasError && (
          <div className="text-[10px] text-rose-400 font-medium flex items-center gap-1">
            <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Run Prediction & Reset Action Bar */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleRunPredict}
          disabled={isLoading || errorCount > 0}
          className="flex-1 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-lg shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Evaluating Models...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Run Live Risk Assessment</span>
            </>
          )}
        </button>

        <button
          onClick={handleReset}
          type="button"
          title="Reset inputs to default or selected persona values"
          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition-all flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Reset</span>
        </button>
      </div>

      {errorCount > 0 && (
        <div className="bg-rose-950/40 border border-rose-800/60 rounded-lg p-2 text-rose-300 text-xs flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Please fix {errorCount} input value(s) out of physiological range before evaluating.</span>
        </div>
      )}

      {/* Accordion / Collapsible Sections */}
      <div className="flex flex-col gap-2">
        {/* Section 1: Vitals & History */}
        <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/60">
          <button
            type="button"
            onClick={() => toggleSection('vitals')}
            className="w-full px-3 py-2 bg-slate-900/80 hover:bg-slate-900 text-left font-semibold text-xs text-cyan-300 flex justify-between items-center transition-colors"
          >
            <span>Vitals, History & Demographics ({vitalsFeatures.length})</span>
            <span className="font-mono text-sm">{collapsed.vitals ? '+' : '-'}</span>
          </button>
          {!collapsed.vitals && (
            <div className="p-3 flex flex-col max-h-[300px] overflow-y-auto scrollbar-thin">
              {vitalsFeatures.map(renderField)}
            </div>
          )}
        </div>

        {/* Section 2: ECG Findings */}
        <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/60">
          <button
            type="button"
            onClick={() => toggleSection('ecg')}
            className="w-full px-3 py-2 bg-slate-900/80 hover:bg-slate-900 text-left font-semibold text-xs text-cyan-300 flex justify-between items-center transition-colors"
          >
            <span>Electrocardiogram (ECG) Findings ({ecgFeatures.length})</span>
            <span className="font-mono text-sm">{collapsed.ecg ? '+' : '-'}</span>
          </button>
          {!collapsed.ecg && (
            <div className="p-3 flex flex-col max-h-[300px] overflow-y-auto scrollbar-thin">
              {ecgFeatures.map(renderField)}
            </div>
          )}
        </div>

        {/* Section 3: Echocardiography & Labs */}
        <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/60">
          <button
            type="button"
            onClick={() => toggleSection('echo')}
            className="w-full px-3 py-2 bg-slate-900/80 hover:bg-slate-900 text-left font-semibold text-xs text-cyan-300 flex justify-between items-center transition-colors"
          >
            <span>Echocardiography & Laboratory Biomarkers ({echoLabFeatures.length})</span>
            <span className="font-mono text-sm">{collapsed.echo ? '+' : '-'}</span>
          </button>
          {!collapsed.echo && (
            <div className="p-3 flex flex-col max-h-[300px] overflow-y-auto scrollbar-thin">
              {echoLabFeatures.map(renderField)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
