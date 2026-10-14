import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { FeatureSchemaItem, fetchSchema } from '../api/client';

export const ClinicalForm: React.FC = () => {
  const schema = useStore((state) => state.schema);
  const setSchema = useStore((state) => state.setSchema);
  const patientInputs = useStore((state) => state.patientInputs);
  const setPatientInput = useStore((state) => state.setPatientInput);
  const isDirty = useStore((state) => state.isDirty);
  const resetToBaseline = useStore((state) => state.resetToBaseline);
  const runPrediction = useStore((state) => state.runPrediction);
  const isLoading = useStore((state) => state.isLoadingPrediction);

  // Auto-fetch schema fallback if store schema is currently empty
  useEffect(() => {
    if (!schema || schema.length === 0) {
      fetchSchema().then((data) => {
        if (data && data.length > 0) {
          setSchema(data);
        }
      });
    }
  }, [schema, setSchema]);

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

  // Physiological validation
  const validationErrors: Record<string, string> = {};
  schema.forEach((item) => {
    const isNum = item.type === 'integer' || item.type === 'number' || item.type === 'numeric';
    if (isNum) {
      const rawVal = patientInputs[item.name] ?? item.default;
      const numVal = typeof rawVal === 'number' ? rawVal : parseFloat(rawVal);
      if (typeof rawVal === 'string' && rawVal.trim() === '') {
        validationErrors[item.name] = `Value required (${item.min ?? ''}-${item.max ?? ''})`;
      } else if (!Number.isNaN(numVal)) {
        if (item.min !== null && numVal < item.min) {
          validationErrors[item.name] = `Must be >= ${item.min} ${item.unit || ''}`.trim();
        } else if (item.max !== null && numVal > item.max) {
          validationErrors[item.name] = `Must be <= ${item.max} ${item.unit || ''}`.trim();
        }
      }
    }
  });

  const errorCount = Object.keys(validationErrors).length;

  const handleRunPredict = async () => {
    if (errorCount > 0 || isLoading) return;
    await runPrediction();
  };

  // Categorize the 54 features into 3 collapsible clinical sections
  const vitalsFeatures = schema.filter(
    (item: FeatureSchemaItem) =>
      item.group === 'Demographic' ||
      item.group === 'History/exam' ||
      item.group === 'vitals_history' ||
      item.group?.toLowerCase() === 'demographics'
  );

  const ecgFeatures = schema.filter(
    (item: FeatureSchemaItem) => item.group?.toUpperCase() === 'ECG'
  );

  const echoLabFeatures = schema.filter(
    (item: FeatureSchemaItem) =>
      item.group === 'Lab' ||
      item.group === 'Echo' ||
      item.group === 'echo_lab' ||
      item.group?.toLowerCase() === 'laboratory'
  );

  // Clean reference range formatting helper avoiding "undefined-undefined"
  const formatRef = (item: FeatureSchemaItem): string | null => {
    const ref = item.reference_range;
    if (typeof ref === 'string' && ref.trim().length > 0) {
      return `Ref: ${ref}${item.unit ? ` ${item.unit}` : ''}`;
    }
    if (ref && typeof ref === 'object') {
      const low = (ref as any).low;
      const high = (ref as any).high;
      const src = (ref as any).source ? ` (${(ref as any).source})` : '';
      if (low !== undefined && high !== undefined) {
        return `Ref: ${low}-${high}${item.unit ? ` ${item.unit}` : ''}${src}`;
      }
    }
    if (item.min !== null && item.max !== null) {
      return `Physiological: ${item.min} - ${item.max}${item.unit ? ` ${item.unit}` : ''}`;
    }
    return item.unit ? `Unit: ${item.unit}` : null;
  };

  const renderField = (item: FeatureSchemaItem) => {
    const rawVal = patientInputs[item.name] ?? item.default;
    const errorMsg = validationErrors[item.name];
    const hasError = Boolean(errorMsg);
    const refText = formatRef(item);

    // 1. Binary features: inline toggle chips (No [0] / Yes [1])
    if (item.type === 'binary') {
      const isYes = rawVal === 1 || String(rawVal).toUpperCase() === 'Y' || rawVal === true;
      return (
        <div
          key={item.name}
          data-testid={`feature-row-${item.name}`}
          className="flex items-center justify-between py-2 border-b border-slate-900/60 hover:bg-slate-900/20 px-1 rounded transition-colors"
        >
          <div className="flex flex-col pr-2">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-300 font-medium text-xs">{item.name}</span>
              <span className="text-[10px] text-slate-500 font-mono">[{item.type}]</span>
            </div>
            {refText && <span className="text-[10px] text-slate-500 font-mono mt-0.5">{refText}</span>}
          </div>
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 shadow-inner">
            <button
              type="button"
              onClick={() => handleInputChange(item.name, 0)}
              data-testid={`btn-${item.name}-no`}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                !isYes
                  ? 'bg-slate-700 text-slate-100 shadow-sm border border-slate-600'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              No (0)
            </button>
            <button
              type="button"
              onClick={() => handleInputChange(item.name, 1)}
              data-testid={`btn-${item.name}-yes`}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                isYes
                  ? 'bg-cyan-600 text-white shadow-sm border border-cyan-500'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Yes (1)
            </button>
          </div>
        </div>
      );
    }

    // 2. Categorical / Ordinal features: dropdown options with type preservation
    const isCategoricalOrOrdinal =
      item.type === 'categorical' || item.type === 'ordinal' || (item.options && item.options.length > 0);

    if (isCategoricalOrOrdinal) {
      const options = item.options || [];
      return (
        <div
          key={item.name}
          data-testid={`feature-row-${item.name}`}
          className="flex items-center justify-between py-2 border-b border-slate-900/60 hover:bg-slate-900/20 px-1 rounded transition-colors"
        >
          <div className="flex flex-col pr-2">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-300 font-medium text-xs">{item.name}</span>
              <span className="text-[10px] text-slate-500 font-mono">[{item.type}]</span>
            </div>
            {refText && <span className="text-[10px] text-slate-500 font-mono mt-0.5">{refText}</span>}
          </div>
          <select
            value={rawVal ?? item.default}
            onChange={(e) => {
              const targetVal = e.target.value;
              const parsedVal = !isNaN(Number(targetVal)) && targetVal !== '' ? Number(targetVal) : targetVal;
              handleInputChange(item.name, parsedVal);
            }}
            data-testid={`select-${item.name}`}
            className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-cyan-500 cursor-pointer shadow-sm"
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

    // 3. Numeric (integer / number): numeric inputs with bounds validation & feedback
    const step =
      item.type === 'number'
        ? ['BMI', 'CR', 'HDL', 'HB', 'K'].includes(item.name)
          ? 0.01
          : 0.1
        : 1;

    return (
      <div
        key={item.name}
        data-testid={`feature-row-${item.name}`}
        className="py-2 border-b border-slate-900/60 flex flex-col gap-1 hover:bg-slate-900/20 px-1 rounded transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex flex-col pr-2">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-300 font-medium text-xs">{item.name}</span>
              {item.unit && <span className="text-[10px] text-slate-400 font-mono">({item.unit})</span>}
            </div>
            {refText && <span className="text-[10px] text-slate-500 font-mono">{refText}</span>}
          </div>
          <div className="flex items-center gap-1.5">
            {item.min !== null && item.max !== null && (
              <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                [{item.min} - {item.max}]
              </span>
            )}
            <input
              type="number"
              min={item.min ?? undefined}
              max={item.max ?? undefined}
              step={step}
              value={rawVal ?? ''}
              onChange={(e) => {
                const text = e.target.value;
                if (text === '') {
                  handleInputChange(item.name, '');
                } else {
                  const parsed = item.type === 'integer' ? parseInt(text, 10) : parseFloat(text);
                  handleInputChange(item.name, Number.isNaN(parsed) ? text : parsed);
                }
              }}
              data-testid={`input-${item.name}`}
              className={`w-24 bg-slate-900 border rounded-lg px-2.5 py-1 text-xs text-right font-mono focus:outline-none transition-all ${
                hasError
                  ? 'border-rose-500 text-rose-300 focus:border-rose-400 bg-rose-950/25 ring-1 ring-rose-500/50'
                  : 'border-slate-700 text-slate-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50'
              }`}
            />
          </div>
        </div>
        {hasError && (
          <div
            data-testid={`error-${item.name}`}
            className="text-[10px] text-rose-400 font-medium flex items-center gap-1 mt-0.5 bg-rose-950/30 px-2 py-0.5 rounded border border-rose-800/40"
          >
            <svg className="w-3 h-3 shrink-0 text-rose-400" fill="currentColor" viewBox="0 0 20 20">
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
    <div className="flex flex-col gap-3" data-testid="clinical-form">
      {/* Dirty-State Alert Banner */}
      {isDirty && (
        <div
          data-testid="dirty-state-badge"
          className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-500/50 text-amber-300 text-xs shadow-inner animate-pulse"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span className="font-semibold">Unsaved Clinical Edits</span>
          </div>
          <span className="text-[10px] text-amber-400/90 font-mono">Recalculation Required</span>
        </div>
      )}

      {/* Action Bar: Run Live Risk Assessment & Reset to Baseline */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleRunPredict}
          disabled={isLoading || errorCount > 0}
          data-testid="btn-run-prediction"
          className={`flex-1 py-2.5 font-bold text-xs rounded-lg shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
            isDirty
              ? 'bg-gradient-to-r from-amber-600 via-cyan-600 to-blue-600 hover:from-amber-500 hover:to-blue-500 text-white ring-2 ring-amber-400/70 shadow-amber-500/20'
              : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white'
          }`}
        >
          {isLoading ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Evaluating XGBoost Ensembles...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>{isDirty ? '● Run Live Risk Assessment' : 'Run Live Risk Assessment'}</span>
            </>
          )}
        </button>

        <button
          onClick={resetToBaseline}
          type="button"
          data-testid="btn-reset-baseline"
          title="Restore baseline clinical features and model predictions"
          className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-semibold border border-slate-700/80 hover:border-slate-600 transition-all flex items-center gap-1.5 shadow-sm"
        >
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Reset to Baseline</span>
        </button>
      </div>

      {/* Validation Error Banner */}
      {errorCount > 0 && (
        <div
          data-testid="form-validation-summary"
          className="bg-rose-950/40 border border-rose-800/70 rounded-lg p-2.5 text-rose-300 text-xs flex items-center gap-2"
        >
          <svg className="w-4 h-4 shrink-0 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Please correct {errorCount} input value(s) out of physiological range before evaluating risk.</span>
        </div>
      )}

      {/* 3 Collapsible Clinical Feature Sections */}
      <div className="flex flex-col gap-2.5">
        {/* Section 1: Vitals & Demographics (30 features) */}
        <div className="border border-slate-800/90 rounded-xl overflow-hidden bg-slate-950/60 shadow-sm">
          <button
            type="button"
            onClick={() => toggleSection('vitals')}
            data-testid="section-toggle-vitals"
            className="w-full px-3.5 py-2.5 bg-slate-900/80 hover:bg-slate-900 text-left font-semibold text-xs text-cyan-300 flex justify-between items-center transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              <span>Vitals & Demographics</span>
              <span className="text-[11px] font-mono font-normal text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full">
                {vitalsFeatures.length} features
              </span>
            </div>
            <span className="font-mono text-sm text-cyan-400">{collapsed.vitals ? '▼' : '▲'}</span>
          </button>
          {!collapsed.vitals && (
            <div
              data-testid="section-content-vitals"
              className="p-3 flex flex-col max-h-[320px] overflow-y-auto scrollbar-thin divide-y divide-slate-900/40"
            >
              {vitalsFeatures.map(renderField)}
            </div>
          )}
        </div>

        {/* Section 2: ECG Telemetry (7 features) */}
        <div className="border border-slate-800/90 rounded-xl overflow-hidden bg-slate-950/60 shadow-sm">
          <button
            type="button"
            onClick={() => toggleSection('ecg')}
            data-testid="section-toggle-ecg"
            className="w-full px-3.5 py-2.5 bg-slate-900/80 hover:bg-slate-900 text-left font-semibold text-xs text-cyan-300 flex justify-between items-center transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>ECG Telemetry</span>
              <span className="text-[11px] font-mono font-normal text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full">
                {ecgFeatures.length} features
              </span>
            </div>
            <span className="font-mono text-sm text-cyan-400">{collapsed.ecg ? '▼' : '▲'}</span>
          </button>
          {!collapsed.ecg && (
            <div
              data-testid="section-content-ecg"
              className="p-3 flex flex-col max-h-[320px] overflow-y-auto scrollbar-thin divide-y divide-slate-900/40"
            >
              {ecgFeatures.map(renderField)}
            </div>
          )}
        </div>

        {/* Section 3: Echo & Laboratory (17 features) */}
        <div className="border border-slate-800/90 rounded-xl overflow-hidden bg-slate-950/60 shadow-sm">
          <button
            type="button"
            onClick={() => toggleSection('echo')}
            data-testid="section-toggle-echo"
            className="w-full px-3.5 py-2.5 bg-slate-900/80 hover:bg-slate-900 text-left font-semibold text-xs text-cyan-300 flex justify-between items-center transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
              <span>Echo & Laboratory</span>
              <span className="text-[11px] font-mono font-normal text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full">
                {echoLabFeatures.length} features
              </span>
            </div>
            <span className="font-mono text-sm text-cyan-400">{collapsed.echo ? '▼' : '▲'}</span>
          </button>
          {!collapsed.echo && (
            <div
              data-testid="section-content-echo"
              className="p-3 flex flex-col max-h-[320px] overflow-y-auto scrollbar-thin divide-y divide-slate-900/40"
            >
              {echoLabFeatures.map(renderField)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
