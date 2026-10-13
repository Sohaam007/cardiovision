import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { FeatureSchemaItem, predictRisk } from '../api/client';

export const ClinicalForm: React.FC = () => {
  const schema = useStore((state) => state.schema);
  const patientInputs = useStore((state) => state.patientInputs);
  const setPatientInput = useStore((state) => state.setPatientInput);
  const setPredictions = useStore((state) => state.setPredictions);
  const setIsLoadingPrediction = useStore((state) => state.setIsLoadingPrediction);
  const isLoading = useStore((state) => state.isLoadingPrediction);

  const [openSection, setOpenSection] = useState<'vitals' | 'ecg' | 'echo'>('vitals');

  const handleInputChange = (name: string, val: any) => {
    setPatientInput(name, val);
  };

  const handleRunPredict = async () => {
    setIsLoadingPrediction(true);
    try {
      const result = await predictRisk(patientInputs);
      setPredictions(result.data);
    } catch (err) {
      console.error('Prediction failed:', err);
    } finally {
      setIsLoadingPrediction(false);
    }
  };

  const vitalsFeatures = schema.filter((item: FeatureSchemaItem) => item.group === 'vitals_history');
  const ecgFeatures = schema.filter((item: FeatureSchemaItem) => item.group === 'ecg');
  const echoLabFeatures = schema.filter((item: FeatureSchemaItem) => item.group === 'echo_lab');

  const renderField = (item: FeatureSchemaItem) => {
    const val = patientInputs[item.name] ?? item.default;
    const refText = item.reference_range
      ? `${item.reference_range.low}-${item.reference_range.high} ${item.unit}`
      : item.unit
      ? item.unit
      : null;

    if (item.type === 'binary') {
      const isYes = val === 1 || String(val).toUpperCase() === 'Y';
      return (
        <div key={item.name} className="flex items-center justify-between py-1.5 border-b border-slate-900/60">
          <div>
            <span className="text-slate-300 font-medium text-xs block">{item.name}</span>
            {refText && <span className="text-[10px] text-slate-500 font-mono">{refText}</span>}
          </div>
          <button
            onClick={() => handleInputChange(item.name, isYes ? 0 : 1)}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
              isYes ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {isYes ? 'Yes (1)' : 'No (0)'}
          </button>
        </div>
      );
    }

    if (item.type === 'categorical') {
      const options = item.options || [];
      return (
        <div key={item.name} className="flex items-center justify-between py-1.5 border-b border-slate-900/60">
          <div>
            <span className="text-slate-300 font-medium text-xs block">{item.name}</span>
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

    // Numeric / Integer
    return (
      <div key={item.name} className="flex items-center justify-between py-1.5 border-b border-slate-900/60">
        <div>
          <span className="text-slate-300 font-medium text-xs block">{item.name}</span>
          {refText && <span className="text-[10px] text-slate-500 font-mono">{refText}</span>}
        </div>
        <input
          type="number"
          min={item.min ?? undefined}
          max={item.max ?? undefined}
          value={val}
          onChange={(e) => handleInputChange(item.name, parseFloat(e.target.value) || 0)}
          className="w-20 bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs text-right font-mono focus:outline-none focus:border-cyan-500"
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Run Prediction Button */}
      <button
        onClick={handleRunPredict}
        disabled={isLoading}
        className="w-full py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-lg shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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

      {/* Accordion Sections */}
      <div className="flex flex-col gap-2">
        {/* Section 1: Vitals & History */}
        <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/60">
          <button
            onClick={() => setOpenSection(openSection === 'vitals' ? 'vitals' : 'vitals')}
            className="w-full px-3 py-2 bg-slate-900/80 hover:bg-slate-900 text-left font-semibold text-xs text-cyan-300 flex justify-between items-center"
          >
            <span>Vitals, History & Demographics ({vitalsFeatures.length})</span>
            <span>{openSection === 'vitals' ? '−' : '+'}</span>
          </button>
          {openSection === 'vitals' && (
            <div className="p-3 flex flex-col max-h-[280px] overflow-y-auto scrollbar-thin">
              {vitalsFeatures.map(renderField)}
            </div>
          )}
        </div>

        {/* Section 2: ECG Findings */}
        <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/60">
          <button
            onClick={() => setOpenSection(openSection === 'ecg' ? 'vitals' : 'ecg')}
            className="w-full px-3 py-2 bg-slate-900/80 hover:bg-slate-900 text-left font-semibold text-xs text-cyan-300 flex justify-between items-center"
          >
            <span>Electrocardiogram (ECG) Findings ({ecgFeatures.length})</span>
            <span>{openSection === 'ecg' ? '−' : '+'}</span>
          </button>
          {openSection === 'ecg' && (
            <div className="p-3 flex flex-col max-h-[280px] overflow-y-auto scrollbar-thin">
              {ecgFeatures.map(renderField)}
            </div>
          )}
        </div>

        {/* Section 3: Echocardiography & Labs */}
        <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/60">
          <button
            onClick={() => setOpenSection(openSection === 'echo' ? 'vitals' : 'echo')}
            className="w-full px-3 py-2 bg-slate-900/80 hover:bg-slate-900 text-left font-semibold text-xs text-cyan-300 flex justify-between items-center"
          >
            <span>Echocardiography & Laboratory Biomarkers ({echoLabFeatures.length})</span>
            <span>{openSection === 'echo' ? '−' : '+'}</span>
          </button>
          {openSection === 'echo' && (
            <div className="p-3 flex flex-col max-h-[280px] overflow-y-auto scrollbar-thin">
              {echoLabFeatures.map(renderField)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
