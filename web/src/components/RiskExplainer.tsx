import React, { useMemo } from 'react';
import { useStore, TargetKey } from '../store/useStore';
import { ExplanationItem, FeatureSchemaItem } from '../api/client';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts';

interface ChartDataItem {
  feature: string;
  shap: number;
  valueText: string;
  isPositive: boolean;
}

export const RiskExplainer: React.FC = () => {
  const predictions = useStore((state) => state.predictions);
  const selectedTarget = useStore((state) => state.selectedTarget);
  const setSelectedTarget = useStore((state) => state.setSelectedTarget);
  const schema = useStore((state) => state.schema);

  // Map schema items by name for quick lookup of units and reference ranges
  const schemaMap = useMemo(() => {
    const map = new Map<string, FeatureSchemaItem>();
    schema.forEach((item) => map.set(item.name, item));
    return map;
  }, [schema]);

  if (!predictions) {
    return (
      <div className="p-6 text-center text-slate-400 text-xs">
        Select a patient persona above or enter clinical features to view explainability.
      </div>
    );
  }

  const targetKey = selectedTarget as keyof typeof predictions.explanations;
  const rawExplanations = predictions.explanations?.[targetKey] || [];
  const cadAdjusted = predictions.meta?.cad_adjusted ?? false;

  // Selected target probability
  let targetProb = 0;
  let targetCi: [number, number] | undefined = undefined;
  if (selectedTarget === 'CAD') {
    targetProb = predictions.cad.prob;
    targetCi = predictions.cad.ci;
  } else {
    targetProb = predictions.vessels[selectedTarget]?.prob ?? 0;
  }

  // Process top 10 plus (other) bucket
  const sortedExplanations = [...rawExplanations].sort(
    (a, b) => Math.abs(b.shap) - Math.abs(a.shap)
  );

  const top10 = sortedExplanations.slice(0, 10);
  const remaining = sortedExplanations.slice(10);
  const otherShap = remaining.reduce((sum, item) => sum + item.shap, 0);

  const chartData: ChartDataItem[] = top10.map((item) => {
    const sItem = schemaMap.get(item.feature);
    const unit = sItem?.unit ? ` ${sItem.unit}` : '';
    const valText = typeof item.value === 'number' ? `${item.value}${unit}` : String(item.value);
    return {
      feature: item.feature,
      shap: Number(item.shap.toFixed(4)),
      valueText: valText,
      isPositive: item.shap >= 0,
    };
  });

  if (remaining.length > 0) {
    chartData.push({
      feature: '(other)',
      shap: Number(otherShap.toFixed(4)),
      valueText: `${remaining.length} features`,
      isPositive: otherShap >= 0,
    });
  }

  // Reverse so highest absolute contributor appears at the top in vertical layout
  const displayData = [...chartData].reverse();

  // Custom Recharts Tooltip
  const renderCustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: ChartDataItem = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-lg shadow-xl text-xs z-50">
          <div className="font-bold text-slate-200 mb-1">{data.feature}</div>
          <div className="text-slate-400 text-[11px]">Patient Value: <span className="font-mono text-slate-200">{data.valueText}</span></div>
          <div className="text-[11px] mt-1">
            <span className="text-slate-400">Contribution: </span>
            <span className={`font-mono font-bold ${data.isPositive ? 'text-rose-400' : 'text-teal-400'}`}>
              {data.isPositive ? `+${data.shap.toFixed(4)}` : data.shap.toFixed(4)}
            </span>
            <span className="text-slate-500 text-[10px]"> log-odds</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {data.isPositive ? 'Increases predicted probability' : 'Lowers predicted probability'}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-4 text-xs">
      {/* Target Selector Tabs & Probability Badge */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
          {(['CAD', 'LAD', 'LCX', 'RCA'] as TargetKey[]).map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTarget(t)}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                selectedTarget === t
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-right">
          <span className="text-slate-400 text-[11px]">Predicted probability of significant stenosis:</span>
          <span
            className={`text-sm font-bold font-mono px-2 py-0.5 rounded ${
              targetProb >= 0.7
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : targetProb >= 0.4
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
            }`}
          >
            {(targetProb * 100).toFixed(1)}%
          </span>
          {targetCi && (
            <span className="text-[10px] text-slate-500 font-mono">
              [{(targetCi[0] * 100).toFixed(0)}%-{(targetCi[1] * 100).toFixed(0)}%]
            </span>
          )}
        </div>
      </div>

      {/* CAD Adjusted Constraint Notice */}
      {selectedTarget === 'CAD' && cadAdjusted && (
        <div className="bg-amber-950/60 border border-amber-700/60 rounded-lg p-2.5 text-xs text-amber-200 flex items-start gap-2">
          <svg className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <span className="font-semibold">Anatomical Hierarchy Enforced:</span> Overall CAD probability was adjusted
            upward to guarantee P(CAD) &gt;= max(vessel probabilities).
          </div>
        </div>
      )}

      {/* Recharts Horizontal Bar Chart */}
      <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-slate-200">Local Feature Attributions (TreeSHAP)</span>
          <span className="text-[10px] text-slate-400 font-mono">Calibrated Log-Odds</span>
        </div>

        <div className="w-full h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={displayData}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 65, bottom: 25 }}
            >
              <XAxis
                type="number"
                stroke="#64748b"
                fontSize={10}
                tickFormatter={(v: number) => v.toFixed(2)}
                label={{
                  value: 'Calibrated log-odds contribution',
                  position: 'insideBottom',
                  offset: -12,
                  fill: '#94a3b8',
                  fontSize: 10,
                }}
              />
              <YAxis
                type="category"
                dataKey="feature"
                stroke="#94a3b8"
                fontSize={10}
                width={70}
                tick={{ fill: '#cbd5e1' }}
              />
              <Tooltip content={renderCustomTooltip} />
              <ReferenceLine x={0} stroke="#475569" strokeWidth={1.5} />
              <Bar dataKey="shap" radius={[2, 2, 2, 2]}>
                {displayData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.shap >= 0 ? '#f43f5e' : '#14b8a6'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart Legend */}
        <div className="flex items-center justify-center gap-6 mt-1 pt-2 border-t border-slate-900 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-rose-500 inline-block"></span>
            <span className="text-slate-300">Increases Risk (+log-odds)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-teal-500 inline-block"></span>
            <span className="text-slate-300">Protective (-log-odds)</span>
          </div>
        </div>
      </div>

      {/* Measurement Cards Section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-slate-300 font-semibold px-0.5">
          <span>Clinical Measurement Cards & Reference Ranges</span>
          <span className="text-[10px] text-slate-500 font-normal">Top contributing biomarkers</span>
        </div>

        <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto scrollbar-thin pr-1">
          {top10.map((item: ExplanationItem, idx: number) => {
            const schemaItem = schemaMap.get(item.feature);
            const ref = schemaItem?.reference_range;
            const refText = ref
              ? `${ref.low}-${ref.high} ${schemaItem?.unit || ''} (${ref.source})`
              : schemaItem?.unit
              ? schemaItem.unit
              : 'N/A';
            const isPos = item.shap >= 0;

            return (
              <div
                key={`${item.feature}-${idx}`}
                className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 flex flex-col gap-1.5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-bold text-slate-200 text-xs">{item.feature}</span>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Ref: {refText}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-xs text-slate-100">
                      {typeof item.value === 'number' ? item.value : String(item.value)}{' '}
                      <span className="text-[10px] text-slate-400 font-normal">{schemaItem?.unit || ''}</span>
                    </span>
                    <div
                      className={`text-[11px] font-mono font-bold ${
                        isPos ? 'text-rose-400' : 'text-teal-400'
                      }`}
                    >
                      {isPos ? `+${item.shap.toFixed(3)}` : item.shap.toFixed(3)} log-odds
                    </div>
                  </div>
                </div>

                {/* Signed contribution bar */}
                <div className="w-full bg-slate-900 rounded-full h-1.5 relative flex items-center overflow-hidden">
                  <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-slate-700 z-10" />
                  {isPos ? (
                    <div
                      className="h-full bg-rose-500 rounded-r transition-all duration-300"
                      style={{
                        marginLeft: '50%',
                        width: `${Math.min(50, Math.round(Math.abs(item.shap) * 50))}%`,
                      }}
                    />
                  ) : (
                    <div
                      className="h-full bg-teal-500 rounded-l transition-all duration-300"
                      style={{
                        marginLeft: `${50 - Math.min(50, Math.round(Math.abs(item.shap) * 50))}%`,
                        width: `${Math.min(50, Math.round(Math.abs(item.shap) * 50))}%`,
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
