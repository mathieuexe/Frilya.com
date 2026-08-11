import { AlertTriangle } from 'lucide-react';

export default function Disputes() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Mes litiges</h1>
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-12 flex flex-col items-center justify-center text-center">
        <AlertTriangle className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Aucun litige</h2>
        <p className="text-slate-500 max-w-md">
          Vous n'avez aucun litige en cours.
        </p>
      </div>
    </div>
  );
}
