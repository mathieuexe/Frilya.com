import { Settings as SettingsIcon, Save } from 'lucide-react';

export default function Settings() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Paramètres du compte</h1>
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 max-w-2xl">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
          <SettingsIcon className="w-5 h-5 text-slate-400" />
          <h2 className="text-lg font-bold text-slate-900">Informations personnelles</h2>
        </div>
        
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Nom complet</label>
            <input 
              type="text" 
              placeholder="Votre nom" 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-frilya-600 focus:ring-1 focus:ring-frilya-600"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
            <input 
              type="email" 
              placeholder="Votre email" 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-frilya-600 focus:ring-1 focus:ring-frilya-600"
            />
          </div>
          <button type="button" className="flex items-center justify-center gap-2 bg-frilya-900 hover:bg-frilya-800 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-sm">
            <Save className="w-4 h-4" />
            Enregistrer les modifications
          </button>
        </form>
      </div>
    </div>
  );
}
