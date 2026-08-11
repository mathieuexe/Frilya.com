import { Package } from 'lucide-react';

export default function Orders() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Mes commandes</h1>
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-12 flex flex-col items-center justify-center text-center">
        <Package className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Aucune commande</h2>
        <p className="text-slate-500 max-w-md">
          Vous n'avez pas encore passé de commande. Explorez nos services pour trouver le freelance idéal.
        </p>
      </div>
    </div>
  );
}
