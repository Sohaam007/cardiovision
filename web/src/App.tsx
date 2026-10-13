import React from 'react';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top persistent safety disclaimer banner */}
      <header className="bg-amber-950/80 border-b border-amber-600/40 text-amber-200 text-xs px-4 py-2 text-center font-medium">
        For decision support and educational purposes only. Not a medical device. Not a substitute for formal diagnostic imaging or clinical judgment.
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-3">
          CardioVision
        </h1>
        <p className="text-slate-400 max-w-lg mb-6">
          Track A: Cardiovascular CAD Risk Prediction & Interactive 3D Heart Viewer
        </p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-emerald-400 text-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Repo scaffolded & ready
        </div>
      </main>

      <footer className="border-t border-slate-900 px-4 py-3 text-center text-xs text-slate-500">
        CardioVision &bull; Multimodal AI Hackathon 2026 &bull; Track A
      </footer>
    </div>
  );
};

export default App;
