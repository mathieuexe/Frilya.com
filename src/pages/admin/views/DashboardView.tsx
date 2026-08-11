import { Users, ShoppingBag, DollarSign, AlertCircle } from 'lucide-react';

export default function DashboardView({ stats }: { stats: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Acheteurs */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg shadow-green-500/30">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-green-100 text-sm font-medium mb-1">Acheteurs Inscrits</p>
              <h3 className="text-3xl font-bold">{stats?.buyers || 0}</h3>
            </div>
            <div className="p-3 bg-white/20 rounded-xl">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Card 2: Vendeurs */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/30">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-blue-100 text-sm font-medium mb-1">Vendeurs Actifs</p>
              <h3 className="text-3xl font-bold">{stats?.sellers || 0}</h3>
            </div>
            <div className="p-3 bg-white/20 rounded-xl">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Card 3: Commandes */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg shadow-purple-500/30">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-purple-100 text-sm font-medium mb-1">Commandes Totales</p>
              <h3 className="text-3xl font-bold">{stats?.orders || 0}</h3>
            </div>
            <div className="p-3 bg-white/20 rounded-xl">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Card 4: Litiges */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg shadow-orange-500/30">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-orange-100 text-sm font-medium mb-1">Litiges Ouverts</p>
              <h3 className="text-3xl font-bold">{stats?.disputes || 0}</h3>
            </div>
            <div className="p-3 bg-white/20 rounded-xl">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-200 h-96">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Évolution des ventes (Mockup)</h3>
          <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400">Graphique à venir</span>
          </div>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Activité Récente</h3>
          <div className="space-y-4">
            <p className="text-sm text-slate-500 text-center mt-10">Aucune activité récente</p>
          </div>
        </div>
      </div>
    </div>
  );
}
