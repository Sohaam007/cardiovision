import React from 'react';
import { useStore } from '../store/useStore';

export const SafetyModal: React.FC = () => {
  const disclaimerAccepted = useStore((state) => state.disclaimerAccepted);
  const setDisclaimerAccepted = useStore((state) => state.setDisclaimerAccepted);

  if (disclaimerAccepted) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-amber-600/60 rounded-xl max-w-lg w-full p-6 shadow-2xl shadow-amber-950/50 flex flex-col gap-4 text-slate-100">
        <div className="flex items-center gap-3 text-amber-400">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Clinical Safety & Research Use Notice</h2>
            <p className="text-xs text-amber-300">Mandatory Research Protocol Verification</p>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 text-xs text-slate-300 leading-relaxed flex flex-col gap-2.5">
          <p>
            This tool estimates the likelihood of coronary artery disease and vessel-level stenosis from a small research dataset (303 patients, single center). Predictions can be wrong.
          </p>
          <p>
            The 3D colors show model-estimated probability for each whole vessel; they do not show where a blockage is.
          </p>
          <p className="font-semibold text-amber-200">
            Do not use this tool for diagnosis or treatment decisions. Always rely on qualified clinicians and formal diagnostic imaging.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={() => setDisclaimerAccepted(true)}
            className="px-5 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-lg transition-all"
          >
            I understand
          </button>
        </div>
      </div>
    </div>
  );
};
